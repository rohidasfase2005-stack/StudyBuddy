import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const SearchInput = ({ value, onChange, onSearch, placeholder = 'Search...', className = '' }) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const timeoutRef = useRef(null);

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInternalValue(val);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (onChange) onChange(val);
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (onChange && internalValue !== value) onChange(internalValue);
      if (onSearch) onSearch(internalValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default SearchInput;
