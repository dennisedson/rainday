import React from 'react';
import Badge from './Badge';

export default {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'sale', 'featured', 'primary', 'success', 'warning', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export const Default = {
  args: {
    children: 'New',
    variant: 'default',
  },
};

export const Sale = {
  args: {
    children: 'Sale',
    variant: 'sale',
  },
};

export const Featured = {
  args: {
    children: 'Featured Collection',
    variant: 'featured',
  },
};

export const AllVariants = () => (
  <div className="flex flex-wrap gap-4">
    <Badge variant="default">Default</Badge>
    <Badge variant="sale">Sale</Badge>
    <Badge variant="featured">Featured</Badge>
    <Badge variant="primary">Primary</Badge>
    <Badge variant="success">In Stock</Badge>
    <Badge variant="warning">Low Stock</Badge>
    <Badge variant="danger">Out of Stock</Badge>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Badge size="sm">Small Badge</Badge>
    <Badge size="md">Medium Badge</Badge>
    <Badge size="lg">Large Badge</Badge>
  </div>
);

