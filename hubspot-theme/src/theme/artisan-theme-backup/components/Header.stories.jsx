import React from 'react';
import Header from './Header';

export default {
  title: 'Layout/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    cartItemCount: 0,
    wishlistItemCount: 0,
  },
};

export const WithCartItems = {
  args: {
    cartItemCount: 3,
    wishlistItemCount: 5,
  },
};

export const Interactive = () => {
  return (
    <div>
      <Header
        cartItemCount={3}
        wishlistItemCount={2}
        onSearch={(query) => console.log('Search:', query)}
        onCartClick={() => console.log('Cart clicked')}
        onWishlistClick={() => console.log('Wishlist clicked')}
        onAccountClick={() => console.log('Account clicked')}
      />
      <div className="h-screen bg-beige p-8">
        <p className="text-gray-600">Scroll to see sticky header behavior</p>
      </div>
    </div>
  );
};

