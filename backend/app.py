from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from auth import auth
import os
from datetime import datetime
from PIL import Image
import io
import logging
import shutil

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["100 per minute", "20 per second"]  # Increase the limits
)

def sanitize_path(path):
    """Convert path to absolute path and normalize it"""
    if not path:
        return None
    return os.path.abspath(os.path.normpath(path))

@app.route('/api/files', methods=['POST'])
@limiter.limit("10 per minute")
def get_files():
    data = request.json
    path = data.get('path', '')
    
    # Handle empty path case by defaulting to user's home directory
    if not path:
        path = os.path.expanduser("~")
    
    try:
        path = sanitize_path(path)
        if not path:
            return jsonify({'error': 'Invalid path'}), 400
        
        logger.info(f"Accessing path: {path} (User: {auth.current_user()})")
        
        if not os.path.exists(path):
            return jsonify({'error': 'Path does not exist'}), 400
        
        if not os.path.isdir(path):
            return jsonify({'error': 'Path is not a directory'}), 400
        
        items = os.listdir(path)
        files = []
        folders = []
        
        for item in items:
            try:
                full_path = os.path.join(path, item)
                if os.path.isdir(full_path):
                    stat = os.stat(full_path)
                    folders.append({
                        'name': item,
                        'path': full_path,
                        'type': 'folder',
                        'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
                else:
                    stat = os.stat(full_path)
                    file_info = {
                        'name': item,
                        'path': full_path,
                        'type': 'file',
                        'size': os.path.getsize(full_path),
                        'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'extension': os.path.splitext(item)[1].lower()
                    }
                    files.append(file_info)
            except Exception as e:
                logger.error(f"Error processing item {item}: {str(e)}")
                continue
        
        return jsonify({
            'path': path,
            'folders': folders,
            'files': files,
            'parent': os.path.dirname(path) if path != os.path.dirname(path) else None
        })
    except Exception as e:
        logger.error(f"Error in get_files: {str(e)}")
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/system/drive', methods=['GET'])
def get_default_drive():
    """Get the default drive/path for the current OS"""
    try:
        system = os.name
        if system == 'nt':  # Windows
            # Get the system drive (usually C:)
            drive = os.environ.get('SystemDrive', 'C:') + '\\'
        else:  # Unix-like (Linux, macOS)
            drive = '/'
        
        return jsonify({
            'defaultDrive': drive,
            'os': system,
            'availableDrives': get_available_drives()
        })
    except Exception as e:
        logger.error(f"Error in get_default_drive: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/drives', methods=['GET'])
def get_all_drives():
    """Get all available drives on the system"""
    try:
        return jsonify({
            'drives': get_available_drives()
        })
    except Exception as e:
        logger.error(f"Error in get_all_drives: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_available_drives():
    """Helper function to get available drives"""
    if os.name == 'nt':  # Windows
        import string
        from ctypes import windll
        drives = []
        bitmask = windll.kernel32.GetLogicalDrives()
        for letter in string.ascii_uppercase:
            if bitmask & 1:
                drives.append(f"{letter}:\\")
            bitmask >>= 1
        return drives
    else:  # Unix-like
        # For Unix systems, we'll just return the root and home
        return ['/', os.path.expanduser('~')]

@app.route('/api/preview', methods=['POST'])
def get_preview():
    data = request.json
    path = data.get('path', '')
    
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    
    try:
        path = sanitize_path(path)
        if not path:
            return jsonify({'error': 'Invalid path'}), 400
        
        logger.info(f"Previewing file: {path} (User: {auth.current_user()})")
        
        if not os.path.exists(path):
            return jsonify({'error': 'File does not exist'}), 404
        
        # Handle image previews
        if path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            img = Image.open(path)
            img.thumbnail((300, 300))
            byte_arr = io.BytesIO()
            img.save(byte_arr, format='PNG')
            return jsonify({
                'type': 'image',
                'data': byte_arr.getvalue().hex()
            })
        
        # Handle text file previews
        elif path.lower().endswith(('.txt', '.csv', '.json', '.xml', '.html', '.js', '.css', '.py', '.md')):
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(2000)  # Read first 2000 chars
                return jsonify({
                    'type': 'text',
                    'data': content
                })
        
        else:
            return jsonify({'type': 'unsupported'})
    
    except Exception as e:
        logger.error(f"Error in get_preview: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/fileops', methods=['POST'])
def file_operations():
    data = request.json
    operation = data.get('operation')
    path = data.get('path')
    new_name = data.get('new_name')
    
    if not operation or not path:
        return jsonify({'error': 'Missing parameters'}), 400
    
    try:
        path = sanitize_path(path)
        if not path:
            return jsonify({'error': 'Invalid path'}), 400
        
        logger.info(f"File operation: {operation} on {path} (User: {auth.current_user()})")
        
        if operation == 'delete':
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            return jsonify({'success': True})
        
        elif operation == 'rename' and new_name:
            new_path = os.path.join(os.path.dirname(path), new_name)
            os.rename(path, new_path)
            return jsonify({'success': True, 'new_path': new_path})
        
        elif operation == 'create_folder' and new_name:
            new_path = os.path.join(path, new_name)
            os.makedirs(new_path, exist_ok=True)
            return jsonify({'success': True, 'new_path': new_path})
        
        else:
            return jsonify({'error': 'Invalid operation'}), 400
    
    except Exception as e:
        logger.error(f"Error in file_operations: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/recursive', methods=['POST'])
def get_files_recursive():
    data = request.json
    path = data.get('path', '')
    
    if not path:
        path = os.path.expanduser("~")
    
    try:
        path = sanitize_path(path)
        if not path:
            return jsonify({'error': 'Invalid path'}), 400

        def scan_directory(current_path):
            items = {
                'path': current_path,
                'folders': [],
                'files': []
            }
            
            try:
                with os.scandir(current_path) as entries:
                    for entry in entries:
                        try:
                            stat = entry.stat()
                            if entry.is_dir():
                                items['folders'].append({
                                    'name': entry.name,
                                    'path': entry.path,
                                    'type': 'folder',
                                    'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                    'items': scan_directory(entry.path)  # Recursive call
                                })
                            else:
                                items['files'].append({
                                    'name': entry.name,
                                    'path': entry.path,
                                    'type': 'file',
                                    'size': stat.st_size,
                                    'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                    'extension': os.path.splitext(entry.name)[1].lower()
                                })
                        except Exception as e:
                            logger.warning(f"Skipping {entry.path}: {str(e)}")
                            continue
            except Exception as e:
                logger.error(f"Error scanning {current_path}: {str(e)}")
            
            return items

        result = scan_directory(path)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in get_files_recursive: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/search', methods=['POST'])
@limiter.limit("50 per minute")  # Increase the limit for this endpoint
def search_files():
    data = request.json
    path = data.get('path', '')
    query = data.get('query', '').lower()

    if not path or not query:
        return jsonify({'error': 'Missing path or query'}), 400

    try:
        path = sanitize_path(path)
        if not path:
            return jsonify({'error': 'Invalid path'}), 400

        if not os.path.exists(path) or not os.path.isdir(path):
            return jsonify({'error': 'Path is not a directory'}), 400

        results = []

        def search_directory(current_path):
            try:
                with os.scandir(current_path) as entries:
                    for entry in entries:
                        try:
                            if query in entry.name.lower():
                                stat = entry.stat()
                                if entry.is_dir():
                                    results.append({
                                        'name': entry.name,
                                        'path': entry.path,
                                        'type': 'folder',
                                        'size': 0,
                                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                                    })
                                else:
                                    results.append({
                                        'name': entry.name,
                                        'path': entry.path,
                                        'type': 'file',
                                        'size': stat.st_size,
                                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                        'extension': os.path.splitext(entry.name)[1].lower()
                                    })

                            if entry.is_dir():
                                search_directory(entry.path)
                        except Exception as e:
                            logger.warning(f"Skipping {entry.path}: {str(e)}")
                            continue
            except Exception as e:
                logger.error(f"Error searching {current_path}: {str(e)}")

        search_directory(path)
        return jsonify(results)

    except Exception as e:
        logger.error(f"Error in search_files: {str(e)}")
        return jsonify({'error': str(e)}), 500

def verify_path_access(path, user):
    """Verify if the user has access to the given path"""
    # Implement your actual path verification logic here
    # This should check if the user has permission to access the path
    return True  # Placeholder - replace with real implementation

@app.route('/')
def index():
    return "File Explorer API - Use the frontend to interact with this service"

if __name__ == '__main__':
    app.run(debug=True, port=5000)