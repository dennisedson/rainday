import React from 'react';
import ProductCard from './ProductCard';

export default {
  title: 'Components/ProductCard',
  component: ProductCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

const sampleImage = 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop';

export const Default = {
  args: {
    id: '1',
    image: sampleImage,
    title: 'Luminous Pearl Necklace',
    category: 'Necklaces',
    price: 84,
    rating: 4.5,
    reviewCount: 32,
  },
};

export const OnSale = {
  args: {
    id: '2',
    image: sampleImage,
    title: 'Artisan Teardrop Earrings',
    category: 'Earrings',
    price: 67,
    originalPrice: 89,
    rating: 5,
    reviewCount: 54,
    onSale: true,
  },
};

export const Featured = {
  args: {
    id: '3',
    image: sampleImage,
    title: 'Elegant Gold Bracelet',
    category: 'Bracelets',
    price: 87,
    rating: 4.8,
    reviewCount: 143,
    featured: true,
  },
};

export const FeaturedAndOnSale = {
  args: {
    id: '4',
    image: sampleImage,
    title: 'Delicate Chain Necklace',
    category: 'Necklaces',
    price: 52,
    originalPrice: 75,
    rating: 4.7,
    reviewCount: 211,
    onSale: true,
    featured: true,
  },
};

export const ProductGrid = () => {
  const products = [
    {
      id: '1',
      image: sampleImage,
      title: 'Luminous Pearl Necklace',
      category: 'Necklaces',
      price: 84,
      rating: 4.5,
      reviewCount: 32,
    },
    {
      id: '2',
      image: sampleImage,
      title: 'Artisan Teardrop Earrings',
      category: 'Earrings',
      price: 67,
      originalPrice: 89,
      rating: 5,
      reviewCount: 54,
      onSale: true,
    },
    {
      id: '3',
      image: sampleImage,
      title: 'Elegant Gold Bracelet',
      category: 'Bracelets',
      price: 87,
      rating: 4.8,
      reviewCount: 143,
      featured: true,
    },
    {
      id: '4',
      image: sampleImage,
      title: 'Sterling Silver Ring Set',
      category: 'Rings',
      price: 42,
      rating: 4.2,
      reviewCount: 67,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
};

