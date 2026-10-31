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
  addItem: (item: CartItem) => { success: boolean; message?: string };
  removeItem: (productId: number, variationValue?: string) => void;
  updateQuantity: (productId: number, quantity: number, variationValue?: string) => { success: boolean; message?: string };
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

  const addItem = useCallback((item: CartItem): { success: boolean; message?: string } => {
    let result: { success: boolean; message?: string } = { success: true };
    const maxStock = typeof item.stock_available === 'number' ? item.stock_available : 99;

    setItems(prev => {
      const key = `${item.product_id}-${item.variation_value || ''}`;
      const existing = prev.find(i => `${i.product_id}-${i.variation_value || ''}` === key);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + item.quantity;

      if (targetQty > maxStock) {
        result = {
          success: false,
          message: `Desculpe, temos apenas ${maxStock} unidade(s) desta peça em estoque.`
        };
        return prev;
      }

      if (existing) {
        return prev.map(i =>
          `${i.product_id}-${i.variation_value || ''}` === key
            ? { ...i, quantity: targetQty, stock_available: maxStock }
            : i
        );
      }
      return [...prev, { ...item, stock_available: maxStock }];
    });

    if (result.success) {
      setIsOpen(true);
    }
    return result;
  }, []);

  const removeItem = useCallback((productId: number, variationValue?: string) => {
    setItems(prev => prev.filter(i =>
      !(i.product_id === productId && (i.variation_value || '') === (variationValue || ''))
    ));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number, variationValue?: string): { success: boolean; message?: string } => {
    if (quantity <= 0) {
      removeItem(productId, variationValue);
      return { success: true };
    }

    let result: { success: boolean; message?: string } = { success: true };

    setItems(prev => prev.map(i => {
      if (i.product_id === productId && (i.variation_value || '') === (variationValue || '')) {
        const maxStock = typeof i.stock_available === 'number' ? i.stock_available : 99;
        if (quantity > maxStock) {
          result = {
            success: false,
            message: `Desculpe, limite de estoque atingido (${maxStock} disponíveis).`
          };
          return i;
        }
        return { ...i, quantity };
      }
      return i;
    }));

    return result;
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
