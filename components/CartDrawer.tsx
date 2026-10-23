'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useCart } from './CartProvider';

interface StoreSettings {
  whatsapp_number?: string;
  store_name?: string;
}

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, isOpen, setIsOpen } = useCart();
  const [settings, setSettings] = useState<StoreSettings>({
    whatsapp_number: '5511999999999',
    store_name: 'Peixoto Semi Joias'
  });
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load store settings (WhatsApp number)
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSettings(prev => ({
            ...prev,
            whatsapp_number: data.whatsapp_number || prev.whatsapp_number,
            store_name: data.store_name || prev.store_name
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Build formatted WhatsApp message
  const generateWhatsAppMessage = () => {
    const storeName = settings.store_name || 'Peixoto Semi Joias';
    let text = `Olá! Vim pelo catálogo da *${storeName}* e gostaria de finalizar meu pedido.\n\n`;
    text += `*Meu pedido:*\n`;

    items.forEach((item, index) => {
      const varInfo = item.variation_value ? ` (${item.variation_type || 'Variação'}: ${item.variation_value})` : '';
      const unitPriceFormatted = `R$ ${item.unit_price.toFixed(2).replace('.', ',')}`;
      const subtotalFormatted = `R$ ${(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}`;
      
      text += `${index + 1}. *${item.product_name}*${varInfo}\n`;
      text += `   Quantidade: ${item.quantity} — ${unitPriceFormatted} cada\n`;
      text += `   Subtotal: ${subtotalFormatted}\n\n`;
    });

    const totalFormatted = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
    text += `*Total estimado dos produtos: ${totalFormatted}*\n\n`;
    text += `Gostaria de confirmar a disponibilidade das peças e combinar os detalhes da compra.`;

    return text;
  };

  // Handle WhatsApp Checkout
  const handleFinalizeWhatsApp = async () => {
    if (items.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    const message = generateWhatsAppMessage();
    const cleanPhone = (settings.whatsapp_number || '5511999999999').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    // Silently register lead/solicitação in backend (without blocking or deducting stock)
    try {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            variation_type: i.variation_type,
            variation_value: i.variation_value
          })),
          customer_name: 'Cliente Catálogo WhatsApp',
          customer_notes: 'Solicitação iniciada pelo catálogo digital'
        })
      }).catch(() => {});
    } catch {}

    // Open WhatsApp in new tab/window
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsSubmitting(false);
  };

  // Copy order summary to clipboard fallback
  const handleCopySummary = async () => {
    const message = generateWhatsAppMessage();
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="cart-drawer-overlay" onClick={() => setIsOpen(false)} aria-modal="true" role="dialog">
      <div className="cart-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <span>Sua Sacola</span>
            <span className="cart-drawer-count">({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
          </div>
          <button
            type="button"
            className="cart-drawer-close"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar sacola"
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Notice Banner */}
        <div className="cart-drawer-notice">
          <span>✨ Catálogo Digital • Finalização direta com atendimento no WhatsApp</span>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛍️</div>
            <h3>Sua sacola está vazia</h3>
            <p>Navegue pelo nosso catálogo e escolha suas semi joias favoritas para solicitar via WhatsApp.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsOpen(false)}
            >
              Explorar Catálogo
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="cart-items-list">
              {items.map(item => {
                const itemKey = `${item.product_id}-${item.variation_value || ''}`;
                const itemSubtotal = item.unit_price * item.quantity;

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
                        <div className="cart-item-var">
                          {item.variation_type ? `${item.variation_type}: ` : ''}{item.variation_value}
                        </div>
                      )}

                      <div className="cart-item-price-row">
                        <span className="cart-item-unit-price">
                          Unitário: R$ {item.unit_price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="cart-item-subtotal-val">
                          Subtotal: <strong>R$ {itemSubtotal.toFixed(2).replace('.', ',')}</strong>
                        </span>
                      </div>

                      <div className="cart-item-actions">
                        <div className="cart-qty-control" aria-label="Controle de quantidade">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variation_value)}
                            aria-label="Diminuir quantidade"
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variation_value)}
                            aria-label="Aumentar quantidade"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="cart-item-remove"
                          onClick={() => removeItem(item.product_id, item.variation_value)}
                          aria-label="Remover item da sacola"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="cart-drawer-footer">
              <div className="cart-subtotal-box">
                <div className="cart-subtotal-row">
                  <span className="cart-subtotal-label">Total estimado dos produtos:</span>
                  <span className="cart-subtotal-val">
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p className="cart-footer-disclaimer">
                  * Preço estimado. Disponibilidade das peças, detalhes e envio confirmados diretamente com nossa equipe no WhatsApp.
                </p>
              </div>

              {copied && (
                <div className="cart-copy-toast">
                  ✓ Resumo do pedido copiado com sucesso!
                </div>
              )}

              <div className="cart-footer-buttons">
                <button
                  type="button"
                  className="btn btn-whatsapp btn-block"
                  onClick={handleFinalizeWhatsApp}
                  disabled={isSubmitting}
                >
                  <span className="btn-icon">💬</span> Finalizar pelo WhatsApp
                </button>

                <button
                  type="button"
                  className="btn btn-outline-copy btn-block"
                  onClick={handleCopySummary}
                  title="Copiar mensagem caso prefira colar manualmente no WhatsApp"
                >
                  <span>📋</span> {copied ? 'Resumo Copiado!' : 'Copiar resumo do pedido'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => setIsOpen(false)}
                >
                  Continuar explorando o catálogo
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
