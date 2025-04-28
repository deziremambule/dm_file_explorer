import React from 'react';
import { FiGrid, FiList, FiLayers } from 'react-icons/fi';

const ViewToggle = ({ viewMode, recursiveView, onChangeViewMode, onToggleRecursive }) => {
  return (
    <div className="view-toggle-group">
      <button
        onClick={() => onChangeViewMode('list')}
        className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
        title="List view"
      >
        <FiList />
      </button>
      <button
        onClick={() => onChangeViewMode('grid')}
        className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
        title="Grid view"
      >
        <FiGrid />
      </button>
      <button
        onClick={onToggleRecursive}
        className={`view-toggle ${recursiveView ? 'active' : ''}`}
        title={recursiveView ? "Normal view" : "Expand all folders"}
      >
        <FiLayers />
      </button>
    </div>
  );
};

export default ViewToggle;