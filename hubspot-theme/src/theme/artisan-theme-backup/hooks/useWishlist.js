import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Wishlist Context and Hook (S) - Shared wishlist state management
 * Provides wishlist functionality with localStorage persistence
 */

const WishlistContext = createContext(null);

const WISHLIST_STORAGE_KEY = 'artisan_wishlist';

/**
 * WishlistProvider component - wraps the app to provide wishlist state
 */
export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
    } catch (error) {
      console.error('Error loading wishlist from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
      } catch (error) {
        console.error('Error saving wishlist to localStorage:', error);
      }
    }
  }, [wishlist, loading]);

  /**
   * Add item to wishlist
   */
  const addToWishlist = (product) => {
    setWishlist((prevWishlist) => {
      const exists = prevWishlist.some((item) => item.id === product.id);
      if (exists) {
        return prevWishlist;
      }
      return [
        ...prevWishlist,
        {
          ...product,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  };

  /**
   * Remove item from wishlist
   */
  const removeFromWishlist = (productId) => {
    setWishlist((prevWishlist) =>
      prevWishlist.filter((item) => item.id !== productId)
    );
  };

  /**
   * Toggle item in wishlist (add if not present, remove if present)
   */
  const toggleWishlist = (product) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  /**
   * Clear entire wishlist
   */
  const clearWishlist = () => {
    setWishlist([]);
  };

  /**
   * Check if product is in wishlist
   */
  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  /**
   * Get wishlist item count
   */
  const getItemCount = () => {
    return wishlist.length;
  };

  const value = {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
    isInWishlist,
    getItemCount,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

/**
 * useWishlist hook - access wishlist context
 */
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default useWishlist;

