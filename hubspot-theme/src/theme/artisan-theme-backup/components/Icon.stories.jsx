import React from 'react';
import Icon from './Icon';

export default {
  title: 'Components/Icon',
  component: Icon,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: [
        'search',
        'heart',
        'heartFilled',
        'user',
        'cart',
        'star',
        'starFilled',
        'filter',
        'close',
        'minus',
        'plus',
        'trash',
        'chevronLeft',
        'chevronRight',
        'chevronDown',
        'menu',
      ],
      description: 'Icon name',
    },
    size: {
      control: 'number',
      description: 'Icon size in pixels',
    },
  },
};

export const AllIcons = () => {
  const iconNames = [
    'search',
    'heart',
    'heartFilled',
    'user',
    'cart',
    'star',
    'starFilled',
    'filter',
    'close',
    'minus',
    'plus',
    'trash',
    'chevronLeft',
    'chevronRight',
    'chevronDown',
    'menu',
  ];

  return (
    <div className="grid grid-cols-4 gap-6 p-6">
      {iconNames.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Icon name={name} size={32} />
          <span className="text-sm text-gray-600">{name}</span>
        </div>
      ))}
    </div>
  );
};

export const Search = {
  args: {
    name: 'search',
    size: 24,
  },
};

export const Heart = {
  args: {
    name: 'heart',
    size: 24,
  },
};

export const Cart = {
  args: {
    name: 'cart',
    size: 24,
  },
};

export const Star = {
  args: {
    name: 'star',
    size: 24,
  },
};

