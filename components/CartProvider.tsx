'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CartItem {
  product_id: number;
  product_name: string;
  product_sku: string;
  variation_type?: string;
  variation_value?: string;
  quantity: number;
  unit_price: number;
  image?: string;
  stock_available?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, variationValue?: string) => void;
  updateQuantity: (productId: number, quantity: number, variationValue?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('peixoto_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('peixoto_cart', JSON.stringify(items));
    }
  }, [items, loaded]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const key = `${item.product_id}-${item.variation_value || ''}`;
      const existing = prev.find(i => `${i.product_id}-${i.variation_value || ''}` === key);
      if (existing) {
        return prev.map(i =>
          `${i.product_id}-${i.variation_value || ''}` === key
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: number, variationValue?: string) => {
    setItems(prev => prev.filter(i =>
      !(i.product_id === productId && (i.variation_value || '') === (variationValue || ''))
    ));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number, variationValue?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variationValue);
      return;
    }
    setItems(prev => prev.map(i =>
      i.product_id === productId && (i.variation_value || '') === (variationValue || '')
        ? { ...i, quantity }
        : i
    ));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
