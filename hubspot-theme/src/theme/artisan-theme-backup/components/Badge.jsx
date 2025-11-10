import React from 'react';

/**
 * Badge component (S) - Shared badge/label component
 * Used for sale badges, featured tags, category labels, etc.
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = 'badge font-semibold';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    sale: 'badge-sale',
    featured: 'badge-featured',
    primary: 'bg-primary text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-yellow-900',
    danger: 'bg-red-500 text-white',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  
  const badgeClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;

