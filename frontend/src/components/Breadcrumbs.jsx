import React from 'react';
import { FiChevronRight } from 'react-icons/fi';

const Breadcrumbs = ({ path, onNavigate }) => {
  const parts = path.split('\\').filter(part => part.trim() !== '');

  return (
    <div className="breadcrumbs">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && <FiChevronRight className="separator" />}
          <span 
            className="crumb" 
            onClick={() => onNavigate(parts.slice(0, index + 1).join('\\'))}
          >
            {part}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;