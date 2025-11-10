import React from 'react';
import Button from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
      description: 'Button style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
  },
};

export const Primary = {
  args: {
    children: 'Shop Collection',
    variant: 'primary',
  },
};

export const Secondary = {
  args: {
    children: 'Learn More',
    variant: 'secondary',
  },
};

export const Ghost = {
  args: {
    children: 'Continue Shopping',
    variant: 'ghost',
  },
};

export const Loading = {
  args: {
    children: 'Processing',
    variant: 'primary',
    loading: true,
  },
};

export const Disabled = {
  args: {
    children: 'Unavailable',
    variant: 'primary',
    disabled: true,
  },
};

export const Small = {
  args: {
    children: 'Add to Cart',
    variant: 'primary',
    size: 'sm',
  },
};

export const Large = {
  args: {
    children: 'Checkout Now',
    variant: 'primary',
    size: 'lg',
  },
};

