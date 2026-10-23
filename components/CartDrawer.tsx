'use client';
import React from 'react';
import { useCart } from './CartProvider';
import Link from 'next/link';

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, isOpen, setIsOpen } = useCart();

  if (!isOpen) return null;

  return (
    <div className="cart-drawer-overlay" onClick={() => setIsOpen(false)}>
      <div className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <span>Sua Sacola</span>
            <span className="cart-drawer-count">({totalItems})</span>
          </div>
          <button className="cart-drawer-close" onClick={() => setIsOpen(false)} aria-label="Fechar carrinho">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛍️</div>
            <h3>Sua sacola está vazia</h3>
            <p>Descubra nossas coleções exclusivas de semi joias banhadas a ouro e prata.</p>
            <button className="btn btn-primary" onClick={() => setIsOpen(false)}>
              Explorar Coleções
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items-list">
              {items.map(item => {
                const itemKey = `${item.product_id}-${item.variation_value || ''}`;
                return (
                  <div key={itemKey} className="cart-item">
                    <div className="cart-item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.product_name} />
                      ) : (
                        <div className="cart-item-placeholder">✨</div>
                      )}
                    </div>
                    <div className="cart-item-info">
                      <h4 className="cart-item-title">{item.product_name}</h4>
                      {item.variation_value && (
                        <span className="cart-item-var">{item.variation_type}: {item.variation_value}</span>
                      )}
                      <div className="cart-item-price">
                        R$ {item.unit_price.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="cart-item-actions">
                        <div className="cart-qty-control">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variation_value)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variation_value)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="cart-item-remove"
                          onClick={() => removeItem(item.product_id, item.variation_value)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <span className="cart-subtotal-val">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
              </div>
              <p className="cart-footer-note">Frete e condições de pagamento calculados no WhatsApp.</p>
              <div className="cart-footer-buttons">
                <Link
                  href="/finalizar"
                  className="btn btn-whatsapp btn-block"
                  onClick={() => setIsOpen(false)}
                >
                  <span>💬</span> Finalizar pelo WhatsApp
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => setIsOpen(false)}
                >
                  Continuar Comprando
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
