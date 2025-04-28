import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useDarkMode } from '../context/DarkModeContext';
import { FiFolder, FiFile, FiArrowUp, FiGrid, FiList, FiMoon, FiSun, FiRefreshCw, FiLayers, FiCopy } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Breadcrumbs from './Breadcrumbs';
import FileGrid from './FileGrid';
import FileList from './FileList';
import PreviewModal from './PreviewModal';
import SearchBar from './SearchBar';
import ConfirmationModal from './ConfirmationModal';
import RecursiveExplorer from './RecursiveExplorer';

const FileExplorer = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [currentPath, setCurrentPath] = useState('');
  const [inputPath, setInputPath] = useState();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [recursiveView, setRecursiveView] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [previewFile, setPreviewFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [copyOptions, setCopyOptions] = useState({
    showOptions: false,
    maxDepth: 3,
    includeSizes: true,
    includeDates: false,
    useColors: false
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allFiles, setAllFiles] = useState([]);
  const [copying, setCopying] = useState(false);
  const searchCache = useRef({});
  const [showUsagePolicy, setShowUsagePolicy] = useState(false);
  
const [availableDrives, setAvailableDrives] = useState([]);
const [currentOS, setCurrentOS] = useState('');


  // Add this function near the top of your component, before the useEffect hooks
const detectDefaultDrive = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/system/drive');
    return response.data.defaultDrive;
  } catch (error) {
    console.error('Failed to detect default drive:', error);
    // Fallback drives based on common OS defaults
    if (navigator.platform.includes('Win')) {
      return 'C:\\';
    } else if (navigator.platform.includes('Mac')) {
      return '/';
    } else if (navigator.platform.includes('Linux')) {
      return '/';
    }
    return 'C:\\'; // Final fallback
  }
};

// Modify your initial useEffect to use the detected drive
useEffect(() => {
  const initializeExplorer = async () => {
    try {
      // Get default drive and OS info
      const driveResponse = await axios.get('http://localhost:5000/api/system/drive');
      const { defaultDrive, os, availableDrives } = driveResponse.data;
      
      setCurrentOS(os);
      setAvailableDrives(availableDrives);
      fetchFiles(defaultDrive);
      setInputPath(defaultDrive);
      
      // If Windows, also get all available drives
      if (os === 'nt') {
        const drivesResponse = await axios.get('http://localhost:5000/api/system/drives');
        setAvailableDrives(drivesResponse.data.drives);
      }
    } catch (error) {
      console.error('Error detecting system drive:', error);
      // Fallback to C:\ on error
      fetchFiles('C:\\');
      setInputPath('C:\\');
    }
  };
  initializeExplorer();
}, []);


  const handleChangeViewMode = (mode) => {
    setViewMode(mode);
  };

  const handleToggleRecursive = async () => {
    setRecursiveView((prev) => !prev);
    if (!recursiveView) {
      await fetchRecursiveFiles(currentPath);
    } else {
      fetchFiles(currentPath);
    }
  };

  const fetchRecursiveFiles = async (path) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/files/recursive', { path });
      const sortedFolders = sortedItems(response.data.folders);
      const sortedFiles = sortedItems(response.data.files);

      setFolders(sortedFolders);
      setFiles(sortedFiles);
      setAllFiles([...sortedFolders, ...sortedFiles]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch recursive files');
    } finally {
      setLoading(false);
    }
  };

  const sortedItems = useCallback((items) => {
    if (!sortConfig) return items;
    
    return [...items].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchCache.current[query]) {
      setSearchResults(searchCache.current[query]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.post('http://localhost:5000/api/files/search', {
        path: currentPath,
        query: query,
      });
      searchCache.current[query] = response.data;
      setSearchResults(response.data);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        toast.error('Too many requests. Please wait and try again.');
      } else {
        toast.error('Search failed: ' + error.message);
      }
    } finally {
      setIsSearching(false);
    }
  }, [currentPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const highlightMatch = (text, query) => {
    if (!query) return text;

    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const fetchFiles = async (path) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/files', {
        path: path,
      });
      setCurrentPath(response.data.path);
      const sortedFolders = sortedItems(response.data.folders);
      const sortedFiles = sortedItems(response.data.files);
      setFolders(sortedFolders);
      setFiles(sortedFiles);
      setAllFiles([...sortedFolders, ...sortedFiles]);

      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (file) => {
    try {
      const response = await axios.post('http://localhost:5000/api/preview', {
        path: file.path
      });
      setPreviewData(response.data);
    } catch (err) {
      setError('Failed to load preview');
    }
  };

  const handleFileOperation = async (operation, path, newName = null) => {
    try {
      await axios.post('http://localhost:5000/api/fileops', {
        operation,
        path,
        new_name: newName
      });
      fetchFiles(currentPath);
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleFileClick = (file) => {
    setPreviewFile(file);
    setShowPreview(true);
    fetchPreview(file);
  };

  const handleItemSelect = (item, isSelected) => {
    setSelectedItems(prev =>
      isSelected
        ? [...prev, item]
        : prev.filter(i => i.path !== item.path)
    );
  };

  const generateStructureText = (items) => {
    const { maxDepth, includeSizes, includeDates, useColors } = copyOptions;
    let structureText = '';
    
    const folderColor = useColors ? '\x1b[34m' : '';
    const fileColor = useColors ? '\x1b[32m' : '';
    const resetColor = useColors ? '\x1b[0m' : '';
    
    const buildStructure = (item, depth = 0, isLast = false) => {
      if (depth > maxDepth) return;
      
      const prefix = depth === 0 ? '' : '│   '.repeat(depth - 1) + (isLast ? '└── ' : '├── ');
      let line = prefix;
      
      line += (item.type === 'folder' ? folderColor : fileColor) + item.name + resetColor;
      
      if (includeSizes && item.size) {
        line += ` (${formatSize(item.size)})`;
      }
      
      if (includeDates && item.modified) {
        line += ` [${new Date(item.modified).toLocaleDateString()}]`;
      }
      
      structureText += line + '\n';
      
      if (item.items) {
        const childFolders = item.items.folders || (item.items.items ? item.items.items.folders : []);
        const childFiles = item.items.files || (item.items.items ? item.items.items.files : []);
        
        childFolders.forEach((folder, index) => {
          buildStructure(
            folder, 
            depth + 1, 
            index === childFolders.length - 1 && childFiles.length === 0
          );
        });
        
        childFiles.forEach((file, index) => {
          const isLastFile = index === childFiles.length - 1;
          let fileLine = '│   '.repeat(depth) + (isLastFile ? '└── ' : '├── ');
          fileLine += fileColor + file.name + resetColor;
          
          if (includeSizes && file.size) {
            fileLine += ` (${formatSize(file.size)})`;
          }
          
          if (includeDates && file.modified) {
            fileLine += ` [${new Date(file.modified).toLocaleDateString()}]`;
          }
          
          structureText += fileLine + '\n';
        });
      }
    };
  
    items.forEach((item, index) => {
      buildStructure(item, 0, index === items.length - 1);
    });
  
    return structureText;
  };
  
  const handleCopySelected = async () => {
    if (selectedItems.length === 0) {
      toast.warning('No items selected to copy');
      return;
    }
  
    setCopying(true);
    try {
      let structureText = '';
      
      const folderPromises = selectedItems
        .filter(item => item.type === 'folder')
        .map(async folder => {
          const response = await axios.post('http://localhost:5000/api/files/recursive', {
            path: folder.path
          });
          return generateStructureText([{
            name: folder.name,
            type: 'folder',
            modified: folder.modified,
            items: response.data
          }]);
        });
  
      const folderStructures = await Promise.all(folderPromises);
      const fileItems = selectedItems
        .filter(item => item.type === 'file')
        .map(file => ({
          name: file.name,
          type: 'file',
          size: file.size,
          modified: file.modified
        }));
  
      if (folderStructures.length > 0 && fileItems.length > 0) {
        structureText = generateStructureText([{
          name: 'Selected Items',
          type: 'folder',
          items: {
            folders: selectedItems.filter(i => i.type === 'folder'),
            files: fileItems
          }
        }]);
      } else if (folderStructures.length > 0) {
        structureText = folderStructures.join('\n\n');
      } else {
        structureText = fileItems.map(file => {
          let line = file.name;
          if (copyOptions.includeSizes && file.size) {
            line += ` (${formatSize(file.size)})`;
          }
          if (copyOptions.includeDates && file.modified) {
            line += ` [${new Date(file.modified).toLocaleDateString()}]`;
          }
          return line;
        }).join('\n');
      }
  
      await navigator.clipboard.writeText(structureText);
      toast.success('Copied successfully!');
    } catch (error) {
      toast.error(`Error copying structure: ${error.message}`);
    } finally {
      setCopying(false);
    }
  };

  const toggleCopyOptions = () => {
    setCopyOptions(prev => ({
      ...prev,
      showOptions: !prev.showOptions
    }));
  };

  const updateCopyOption = (key, value) => {
    setCopyOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    performSearch(query);
  };

  const createNewFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      handleFileOperation('create_folder', currentPath, folderName);
    }
  };

  const renameItem = (path, isFolder) => {
    const newName = prompt('Enter new name:');
    if (newName) {
      handleFileOperation('rename', path, newName);
    }
  };

  const deleteItem = (path, isFolder) => {
    setItemToDelete({ path, isFolder });
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      handleFileOperation('delete', itemToDelete.path);
      setShowConfirmModal(false);
      setItemToDelete(null);
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    const operation = prompt(`Choose operation for ${item.name}:\n1. Rename\n2. Delete\n3. Copy`);
    if (operation === '1') {
      renameItem(item.path, item.type === 'folder');
    } else if (operation === '2') {
      deleteItem(item.path, item.type === 'folder');
    } else if (operation === '3') {
      handleItemSelect(item, true);
      handleCopySelected();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        handleCopySelected();
      } else if (e.key === 'ArrowUp' && currentPath) {
        const parentPath = currentPath.split('\\').slice(0, -1).join('\\');
        if (parentPath) fetchFiles(parentPath);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, selectedItems]);

  useEffect(() => {
    if (selectedItems.length === 0) {
      setCopyOptions(prev => ({ ...prev, showOptions: false }));
    }
  }, [selectedItems]);

  return (
    <div className={`file-explorer ${darkMode ? 'dark-mode' : ''}`}>
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        file={previewFile}
        previewData={previewData}
      />

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${itemToDelete?.isFolder ? 'Folder' : 'File'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.isFolder ? 'folder' : 'file'}? This action cannot be undone.`}
      />

      <div className="header">
        <h1>File Explorer</h1>
        <div className="controls">
          <button onClick={toggleDarkMode} className="mode-toggle">
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            disabled={recursiveView}
          >
            {viewMode === 'list' ? <FiGrid /> : <FiList />}
          </button>
          <button
            onClick={() => setRecursiveView(!recursiveView)}
            className={`view-toggle ${recursiveView ? 'active' : ''}`}
          >
            <FiLayers />
          </button>
        </div>
      </div>

      <div className="path-controls">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputPath.trim()) {
              fetchFiles(inputPath);
            }
          }}
          className="path-form"
        >
<div className="path-input-container">
  <input
    type="text"
    value={inputPath || ''}
    onChange={(e) => setInputPath(e.target.value)}
    placeholder="Enter directory path"
    className="path-input"
  />
  <div className="path-examples">
    Examples: {currentOS === 'nt' ? 'C:\\Users\\username' : '/home/username'}
  </div>
</div>
          <button type="submit" className="go-button">Go</button>
        </form>

        <SearchBar 
          onSearch={handleSearch}
          loading={isSearching}
        />
      </div>

      {searchQuery && searchResults.length > 0 && (
        <div className="search-results-panel">
          <div className="search-results-header">
            <h3>Search Results ({searchResults.length})</h3>
            <button onClick={() => setSearchQuery('')} className="close-search">
              Clear Search
            </button>
          </div>

          <div className="search-results-list">
            {searchResults.map((item) => (
              <div 
                key={item.path} 
                className={`search-result-item ${item.type}`}
                onClick={() => {
                  if (item.type === 'folder') {
                    fetchFiles(item.path);
                    setSearchQuery('');
                  } else {
                    handleFileClick(item);
                  }
                }}
              >
                <div className="search-result-path">
                  {item.path.split('\\').map((part, i, arr) => (
                    <span key={i}>
                      {highlightMatch(part, searchQuery)}
                      {i < arr.length - 1 && '\\'}
                    </span>
                  ))}
                </div>
                <div className="search-result-name">
                  {highlightMatch(item.name, searchQuery)}
                </div>
                {item.type === 'file' && (
                  <div className="search-result-size">
                    {formatSize(item.size)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      {currentPath && (
        <div className="navigation">
          <Breadcrumbs 
            path={currentPath} 
            onNavigate={fetchFiles} 
          />
          <div className="actions">
        {availableDrives.length > 0 && (
          <div className="drive-selector">
            <label>Drive: </label>
            <select
              onChange={(e) => {
                fetchFiles(e.target.value);
                setInputPath(e.target.value);
              }}
              value={currentPath.split(/[\\\/]/)[0] + (currentOS === 'nt' ? '\\' : '/')}
            >
              {availableDrives.map((drive) => (
                <option key={drive} value={drive}>
                  {drive}
                </option>
              ))}
            </select>
          </div>
        )}
            <button onClick={() => fetchFiles(currentPath)} className="refresh-button">
              <FiRefreshCw /> Refresh
            </button>
            <button onClick={createNewFolder} className="new-folder-button">
              New Folder
            </button>
            <button onClick={() => {
              const parentPath = currentPath.split('\\').slice(0, -1).join('\\');
              if (parentPath) fetchFiles(parentPath);
            }} className="up-button">
              <FiArrowUp /> Up
            </button>
            
            <div className="copy-container">
              <button
                onClick={handleCopySelected}
                disabled={copying || selectedItems.length === 0}
                className={`copy-button ${selectedItems.length === 0 ? 'disabled' : ''}`}
                title={selectedItems.length === 0 ? 'Select items first' : `Copy ${selectedItems.length} selected items`}
              >
                {copying ? 'Processing...' : <><FiCopy /> Copy Structure</>}
              </button>
              
              <button 
                onClick={toggleCopyOptions}
                className="copy-options-toggle"
                title="Copy options"
                disabled={selectedItems.length === 0}
              >
                ⚙️
              </button>
              
              {copyOptions.showOptions && (
                <div className="copy-options-panel">
                  <div className="copy-option">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={copyOptions.includeSizes}
                        onChange={(e) => updateCopyOption('includeSizes', e.target.checked)}
                      />
                      Include Sizes
                    </label>
                  </div>
                  <div className="copy-option">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={copyOptions.includeDates}
                        onChange={(e) => updateCopyOption('includeDates', e.target.checked)}
                      />
                      Include Dates
                    </label>
                  </div>
                  <div className="copy-option">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={copyOptions.useColors}
                        onChange={(e) => updateCopyOption('useColors', e.target.checked)}
                      />
                      Terminal Colors
                    </label>
                  </div>
                  <div className="copy-option">
                    <label>
                      Max Depth:
                      <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={copyOptions.maxDepth}
                        onChange={(e) => updateCopyOption('maxDepth', parseInt(e.target.value))}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="content">
        {recursiveView ? (
          <RecursiveExplorer path={currentPath} />
        ) : viewMode === 'grid' ? (
          <>
            {folders.length > 0 && <h3>Folders</h3>}
            <FileGrid 
              items={folders} 
              onFolderClick={fetchFiles}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              onItemSelect={handleItemSelect}
              selectedItems={selectedItems}
            />
            {files.length > 0 && <h3>Files</h3>}
            <FileGrid 
              items={files} 
              onFolderClick={fetchFiles}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              onItemSelect={handleItemSelect}
              selectedItems={selectedItems}
            />
          </>
        ) : (
          <FileList 
            folders={folders}
            files={files}
            onFolderClick={fetchFiles}
            onFileClick={handleFileClick}
            onContextMenu={handleContextMenu}
            sortConfig={sortConfig}
            requestSort={requestSort}
            onItemSelect={handleItemSelect}
            selectedItems={selectedItems}
          />
        )}
      </div>
      <footer className="app-footer">
        <div className="footer-content">
          <div className="copyright">
            &copy; {new Date().getFullYear()} File Explorer v1.0.0 - Open Source Project
          </div>
          <button 
            onClick={() => setShowUsagePolicy(!showUsagePolicy)}
            className="policy-toggle"
          >
            {showUsagePolicy ? 'Hide Usage Policy' : 'Show Usage Policy'}
          </button>
        </div>

        {showUsagePolicy && (
          <div className="usage-policy">
            <h4>Usage Policy</h4>
            <div className="policy-sections">
              <div className="policy-section">
                <h5>✅ Permitted Use</h5>
                <ul>
                  <li>Modification and improvement for personal or organizational use</li>
                  <li>Educational purposes and learning</li>
                  <li>Non-commercial open source contributions</li>
                  <li>Integration with other ethical software projects</li>
                </ul>
              </div>
              
              <div className="policy-section">
                <h5>🚫 Prohibited Use</h5>
                <ul>
                  <li>Reverse engineering for malicious purposes</li>
                  <li>Unauthorized commercial distribution</li>
                  <li>Incorporation into malware or spyware</li>
                  <li>Any activity violating computer crime laws</li>
                </ul>
              </div>
              
              <div className="policy-section">
                <h5>📜 License</h5>
                <p>
                  This software is provided "as-is" under the MIT License. 
                  By using this software, you agree to use it responsibly and 
                  not hold the authors liable for any damages caused.
                </p>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};

export default FileExplorer;