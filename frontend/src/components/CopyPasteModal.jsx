import React, { useState } from 'react';
import { FiCopy, FiScissors, FiFolder, FiFile, FiX } from 'react-icons/fi';
import axios from 'axios';
import Modal from 'react-modal';
import '../App.css';

const CopyPasteModal = ({ 
    isOpen, 
    onClose, 
    selectedItems,
    currentPath,
    operation,
    onSuccess
}) => {
    const [destinationPath, setDestinationPath] = useState(currentPath || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!destinationPath) {
            setError('Please enter a destination path');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await axios.post('http://localhost:5000/api/files/copy-paste', {
                source_paths: selectedItems.map(item => item.path),
                destination_path: destinationPath,
                operation
            });
            setSuccess(`${operation === 'copy' ? 'Copied' : 'Moved'} successfully!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.error || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            className="copy-paste-modal"
            overlayClassName="copy-paste-overlay"
        >
            <div className="modal-header">
                <h3>
                    {operation === 'copy' ? <FiCopy /> : <FiScissors />}
                    {operation === 'copy' ? ' Copy Items' : ' Move Items'}
                </h3>
                <button onClick={onClose} className="close-button">
                    <FiX />
                </button>
            </div>
            
            <div className="modal-content">
                <div className="selected-items-section">
                    <h4>Selected Items ({selectedItems.length})</h4>
                    <div className="selected-items-list">
                        {selectedItems.map((item, index) => (
                            <div key={index} className="selected-item">
                                {item.type === 'folder' ? <FiFolder /> : <FiFile />}
                                <span className="item-name">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Destination Path:</label>
                        <input
                            type="text"
                            value={destinationPath}
                            onChange={(e) => setDestinationPath(e.target.value)}
                            placeholder="Enter destination path"
                            className="path-input"
                        />
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    
                    <div className="modal-actions">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`confirm-btn ${operation}`}
                        >
                            {loading ? 'Processing...' : operation === 'copy' ? 'Copy' : 'Move'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CopyPasteModal;