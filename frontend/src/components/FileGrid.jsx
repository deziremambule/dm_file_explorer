import React from 'react';
import { FiFolder, FiFile } from 'react-icons/fi';

const FileGrid = ({ 
  items, 
  onFolderClick, 
  onFileClick, 
  onItemSelect,
  selectedItems
}) => {
  const handleItemClick = (e, item) => {
    // Prevent triggering both checkbox and item click
    if (e.target.type !== 'checkbox') {
      if (item.type === 'folder') {
        onFolderClick(item.path);
      } else {
        onFileClick(item);
      }
    }
  };

  return (
    <div className="file-grid">
      {items.map((item, index) => (
        <div 
          key={index} 
          className={`grid-item ${selectedItems.some(i => i.path === item.path) ? 'selected' : ''}`}
          onClick={(e) => handleItemClick(e, item)}
        >
          <input
            type="checkbox"
            checked={selectedItems.some(i => i.path === item.path)}
            onChange={(e) => {
              e.stopPropagation();
              onItemSelect(item, e.target.checked);
            }}
            className="item-checkbox"
          />
          {item.type === 'folder' ? (
            <>
              <FiFolder className="folder-icon" />
              <span className="item-name">{item.name}</span>
            </>
          ) : (
            <>
              <FiFile className="file-icon" />
              <span className="item-name">{item.name}</span>
              <span className="item-size">{formatSize(item.size)}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default FileGrid;