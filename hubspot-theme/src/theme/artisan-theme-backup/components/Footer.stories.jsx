import React from 'react';
import Footer from './Footer';

export default {
  title: 'Layout/Footer',
  component: Footer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};

export const WithContent = () => (
  <div>
    <div className="min-h-screen bg-beige p-8">
      <h1 className="text-4xl font-display font-bold text-gray-900">Page Content</h1>
      <p className="mt-4 text-gray-600">Scroll down to see the footer</p>
    </div>
    <Footer />
  </div>
);

