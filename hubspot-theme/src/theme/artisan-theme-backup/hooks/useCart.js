import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Cart Context and Hook (S) - Shared cart state management
 * Provides cart functionality with localStorage persistence
 */

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'artisan_cart';

/**
 * CartProvider component - wraps the app to provide cart state
 */
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [cart, loading]);

  /**
   * Add item to cart
   * If item already exists, increment quantity
   */
  const addItem = (product, quantity = 1, variant = null) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) =>
          item.id === product.id &&
          JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (existingItemIndex > -1) {
        // Item exists, update quantity
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + quantity,
        };
        return newCart;
      } else {
        // New item, add to cart
        return [
          ...prevCart,
          {
            ...product,
            quantity,
            variant,
            addedAt: new Date().toISOString(),
          },
        ];
      }
    });
  };

  /**
   * Remove item from cart completely
   */
  const removeItem = (productId, variant = null) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !(
            item.id === productId &&
            JSON.stringify(item.variant) === JSON.stringify(variant)
          )
      )
    );
  };

  /**
   * Update item quantity
   * If quantity is 0 or less, remove the item
   */
  const updateQuantity = (productId, quantity, variant = null) => {
    if (quantity <= 0) {
      removeItem(productId, variant);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
          ? { ...item, quantity }
          : item
      )
    );
  };

  /**
   * Clear entire cart
   */
  const clearCart = () => {
    setCart([]);
  };

  /**
   * Get total number of items in cart
   */
  const getItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  /**
   * Get cart subtotal (before tax and shipping)
   */
  const getSubtotal = () => {
    return cart.reduce((total, item) => {
      const price = item.price || 0;
      return total + price * item.quantity;
    }, 0);
  };

  /**
   * Calculate estimated tax (8% for demo purposes)
   */
  const getTax = () => {
    return getSubtotal() * 0.08;
  };

  /**
   * Calculate shipping cost
   * Free shipping over $100, otherwise $10
   */
  const getShipping = () => {
    const subtotal = getSubtotal();
    return subtotal >= 100 ? 0 : 10;
  };

  /**
   * Get cart total (subtotal + tax + shipping)
   */
  const getTotal = () => {
    return getSubtotal() + getTax() + getShipping();
  };

  /**
   * Check if product is in cart
   */
  const isInCart = (productId, variant = null) => {
    return cart.some(
      (item) =>
        item.id === productId &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
    );
  };

  /**
   * Get quantity of specific product in cart
   */
  const getItemQuantity = (productId, variant = null) => {
    const item = cart.find(
      (item) =>
        item.id === productId &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
    );
    return item ? item.quantity : 0;
  };

  const value = {
    cart,
    loading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
    getSubtotal,
    getTax,
    getShipping,
    getTotal,
    isInCart,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/**
 * useCart hook - access cart context
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default useCart;

