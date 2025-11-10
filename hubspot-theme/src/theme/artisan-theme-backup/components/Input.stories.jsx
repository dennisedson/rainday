import React from 'react';
import Input from './Input';
import Icon from './Icon';

export default {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    placeholder: 'Enter your email',
  },
};

export const WithLabel = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    type: 'email',
  },
};

export const WithIcon = {
  args: {
    placeholder: 'Search products...',
    icon: <Icon name="search" size={20} />,
  },
};

export const WithError = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    value: 'invalid-email',
    error: true,
    errorMessage: 'Please enter a valid email address',
  },
};

export const Disabled = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

