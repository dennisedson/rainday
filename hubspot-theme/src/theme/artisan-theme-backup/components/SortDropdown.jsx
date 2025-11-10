import React, { useState } from 'react';
import Icon from './Icon';

/**
 * SortDropdown component (S) - Sort products dropdown
 * Provides sorting options for product listings
 */
const SortDropdown = ({
  value = 'featured',
  onChange,
  options = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-low-high', label: 'Price: Low to High' },
    { value: 'price-high-low', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A-Z' },
    { value: 'name-desc', label: 'Name: Z-A' },
    { value: 'newest', label: 'Newest' },
    { value: 'rating', label: 'Highest Rated' },
  ],
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = options.find((opt) => opt.value === value) || options[0];

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <span className="text-sm font-medium text-gray-700">
          Sort by: {currentOption.label}
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors duration-200 ${
                  option.value === value
                    ? 'bg-primary text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SortDropdown;

