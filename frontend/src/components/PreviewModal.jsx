import React from 'react';
import Modal from 'react-modal';
import { FiX } from 'react-icons/fi';

const PreviewModal = ({ isOpen, onClose, file, previewData }) => {
  const renderPreview = () => {
    if (!previewData) return <div>Loading preview...</div>;
    
    if (previewData.type === 'image') {
      const imgSrc = `data:image/png;base64,${previewData.data}`;
      return <img src={imgSrc} alt="Preview" className="image-preview" />;
    }
    
    if (previewData.type === 'text') {
      return (
        <div className="text-preview">
          <pre>{previewData.data}</pre>
        </div>
      );
    }
    
    return <div>No preview available for this file type</div>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="preview-modal"
      overlayClassName="preview-overlay"
    >
      <div className="modal-header">
        <h3>{file?.name}</h3>
        <button onClick={onClose} className="close-button">
          <FiX />
        </button>
      </div>
      <div className="modal-content">
        {renderPreview()}
      </div>
      <div className="modal-footer">
        <p>Size: {formatSize(file?.size)}</p>
        <p>Modified: {new Date(file?.modified).toLocaleString()}</p>
      </div>
    </Modal>
  );
};

const formatSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default PreviewModal;