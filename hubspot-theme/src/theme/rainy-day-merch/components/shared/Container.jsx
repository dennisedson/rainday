import React from 'react';

/**
 * Container component (S) - Shared layout container
 * Provides consistent max-width and padding for page sections
 */
const Container = ({
  children,
  size = 'default',
  className = '',
  as: Component = 'div',
  ...props
}) => {
  const sizeClasses = {
    sm: 'max-w-4xl',
    default: 'max-w-7xl',
    lg: 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  const containerClasses = `${sizeClasses[size]} mx-auto px-4 sm:px-6 lg:px-8 ${className}`;

  return (
    <Component className={containerClasses} {...props}>
      {children}
    </Component>
  );
};

export default Container;

