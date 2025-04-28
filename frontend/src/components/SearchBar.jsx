import React, { useState, useEffect } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

const SearchBar = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear the previous debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set a new debounce timer with a longer delay
    const timer = setTimeout(() => {
      onSearch(value); // Trigger the search after 500ms
    }, 500); // Increased debounce delay
    setDebounceTimer(timer);
  };

  const handleClearSearch = () => {
    setQuery('');
    onSearch(''); // Clear the search results
  };

  return (
    <div className="search-bar">
      <form className="search-form" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search in current folder..."
          className="search-input"
        />
        {query && (
          <button
            type="button"
            className="clear-search-button"
            onClick={handleClearSearch}
          >
            <FiX />
          </button>
        )}
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? 'Searching...' : <FiSearch />}
        </button>
      </form>
    </div>
  );
};

export default SearchBar;