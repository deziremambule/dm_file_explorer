import React, { useState, useEffect } from 'react';
import { FiFolder, FiFile, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import axios from 'axios';

const RecursiveItem = ({ item, depth = 0 }) => {
  const [expanded, setExpanded] = useState(depth < 2); // Auto-expand first two levels
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState(item.items || null);

  const toggleExpand = async () => {
    if (!expanded && !children) {
      setLoading(true);
      try {
        const response = await axios.post('http://localhost:5000/api/files/recursive', {
          path: item.path,
        });
        setChildren(response.data); // Use the API response directly
      } catch (error) {
        console.error('Error loading directory:', error);
      }
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <div style={{ marginLeft: `${depth * 15}px` }} className="recursive-item">
      <div
        onClick={toggleExpand}
        className="item-header"
        style={{ cursor: item.type === 'folder' ? 'pointer' : 'default' }}
      >
        {item.type === 'folder' ? (
          <>
            {expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
            <FiFolder className="folder-icon" />
          </>
        ) : (
          <FiFile className="file-icon" />
        )}
        <span className="item-name">{item.name}</span>
        {loading && <span className="loading-indicator">Loading...</span>}
      </div>

      {expanded && children && (
        <div className="item-children">
          {children.folders.map((folder, i) => (
            <RecursiveItem key={`f-${i}`} item={folder} depth={depth + 1} />
          ))}
          {children.files.map((file, i) => (
            <div key={`file-${i}`} className="file-item">
              <FiFile className="file-icon" />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RecursiveExplorer = ({ path }) => {
  const [rootItems, setRootItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/files/recursive', {
        path: path,
      });
      setRootItems(response.data); // Use the API response directly
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [path]);

  if (loading) return <div className="recursive-loading">Loading directory structure...</div>;
  if (error) return <div className="recursive-error">Error: {error}</div>;
  if (!rootItems) return <div className="recursive-empty">No data found</div>;

  return (
    <div className="recursive-explorer">
      <div className="recursive-header">
        <span className="path-display">{rootItems.path}</span>
      </div>
      <div className="recursive-content">
        {rootItems.folders.map((folder, i) => (
          <RecursiveItem key={`root-f-${i}`} item={folder} />
        ))}
        {rootItems.files.map((file, i) => (
          <div key={`root-file-${i}`} className="file-item">
            <FiFile className="file-icon" />
            <span className="file-name">{file.name}</span>
            <span className="file-size">{formatSize(file.size)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecursiveExplorer;