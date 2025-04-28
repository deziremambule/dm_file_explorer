import React from 'react';
import { FiFolder, FiFile, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const FileList = ({ 
  folders, 
  files, 
  onFolderClick, 
  onFileClick, 
  sortConfig, 
  requestSort,
  onItemSelect,
  selectedItems
}) => {
  const getSortIcon = (key) => {
    if (!sortConfig) return null;
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? 
        <FiChevronUp className="sort-icon" /> : 
        <FiChevronDown className="sort-icon" />;
    }
    return null;
  };

  const handleRowClick = (e, item, isFolder) => {
    // Prevent triggering both checkbox and row click
    if (e.target.type !== 'checkbox') {
      if (isFolder) {
        onFolderClick(item.path);
      } else {
        onFileClick(item);
      }
    }
  };

  return (
    <table className="file-list">
      <thead>
        <tr>
          <th></th> {/* Checkbox column */}
          <th onClick={() => requestSort('name')}>
            Name {getSortIcon('name')}
          </th>
          <th onClick={() => requestSort('size')}>
            Size {getSortIcon('size')}
          </th>
          <th onClick={() => requestSort('modified')}>
            Modified {getSortIcon('modified')}
          </th>
        </tr>
      </thead>
      <tbody>
        {folders.map((folder, index) => (
          <tr 
            key={`folder-${index}`} 
            onClick={(e) => handleRowClick(e, folder, true)}
            className={selectedItems.some(i => i.path === folder.path) ? 'selected' : ''}
          >
            <td>
              <input
                type="checkbox"
                checked={selectedItems.some(i => i.path === folder.path)}
                onChange={(e) => {
                  e.stopPropagation();
                  onItemSelect(folder, e.target.checked);
                }}
              />
            </td>
            <td><FiFolder className="folder-icon" /> {folder.name}</td>
            <td>-</td>
            <td>{new Date(folder.modified).toLocaleString()}</td>
          </tr>
        ))}
        {files.map((file, index) => (
          <tr 
            key={`file-${index}`} 
            onClick={(e) => handleRowClick(e, file, false)}
            className={selectedItems.some(i => i.path === file.path) ? 'selected' : ''}
          >
            <td>
              <input
                type="checkbox"
                checked={selectedItems.some(i => i.path === file.path)}
                onChange={(e) => {
                  e.stopPropagation();
                  onItemSelect(file, e.target.checked);
                }}
              />
            </td>
            <td><FiFile className="file-icon" /> {file.name}</td>
            <td>{formatSize(file.size)}</td>
            <td>{new Date(file.modified).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default FileList;