import React from 'react';
import Icon from './Icon';

/**
 * CategoryFilter component (S) - Sidebar category filter
 * Displays categories with product counts for filtering
 */
const CategoryFilter = ({
  categories = [],
  selectedCategory = null,
  onCategoryChange,
  showClear = true,
  className = '',
}) => {
  const handleCategoryClick = (category) => {
    if (onCategoryChange) {
      onCategoryChange(category);
    }
  };

  const handleClearClick = () => {
    if (onCategoryChange) {
      onCategoryChange(null);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
        {selectedCategory && showClear && (
          <button
            onClick={handleClearClick}
            className="text-sm text-primary hover:text-primary-600 font-medium transition-colors duration-200"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category.id || category.name}
            onClick={() => handleCategoryClick(category.id || category.name)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
              selectedCategory === (category.id || category.name)
                ? 'bg-primary text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="font-medium">{category.name}</span>
            {category.count !== undefined && (
              <span
                className={`text-sm ${
                  selectedCategory === (category.id || category.name)
                    ? 'text-white/80'
                    : 'text-gray-500'
                }`}
              >
                ({category.count})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;

