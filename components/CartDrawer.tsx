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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  const generateWhatsAppMessage = () => {
    const storeName = settings.store_name || 'Peixoto Semi Joias';
    let text = `Olá! Vim pelo catálogo da *${storeName}* e gostaria de consultar a disponibilidade das seguintes peças:\n\n`;

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
    text += `Poderia me informar as opções de envio e confirmar a disponibilidade?`;

    return text;
  };

  const handleFinalizeWhatsApp = async () => {
    if (items.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    const message = generateWhatsAppMessage();
    const cleanPhone = (settings.whatsapp_number || '5511999999999').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

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

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsSubmitting(false);
  };

  const handleCopySummary = async () => {
    const message = generateWhatsAppMessage();
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Notice Banner */}
        <div className="cart-drawer-notice">
          <span>Catálogo Digital • Atendimento e confirmação direta no WhatsApp</span>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h3>Sua sacola está vazia</h3>
            <p>Selecione as peças que deseja e adicione à sacola para consultar com nossa equipe no WhatsApp.</p>
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
                        <div className="cart-item-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8894a8" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
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
                  * Total estimado. Disponibilidade das peças e detalhes de envio são confirmados no WhatsApp.
                </p>
              </div>

              {copied && (
                <div className="cart-copy-toast">
                  Resumo do pedido copiado com sucesso!
                </div>
              )}

              <div className="cart-footer-buttons">
                <button
                  type="button"
                  className="btn btn-whatsapp btn-block"
                  onClick={handleFinalizeWhatsApp}
                  disabled={isSubmitting}
                >
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="#ffffff" style={{ marginRight: '6px' }}>
                    <path d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 8.135-2.135c2.38 1.34 5.093 2.135 8.002 2.135 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.333c-2.482 0-4.912-0.668-7.042-1.933l-0.505-0.3-5.235 1.373 1.398-5.105-0.33-0.525c-1.385-2.205-2.12-4.757-2.12-7.343 0-7.618 6.182-13.8 13.8-13.8s13.8 6.182 13.8 13.8c0 7.618-6.182 13.8-13.8 13.8zM23.57 19.342c-0.415-0.208-2.455-1.212-2.835-1.35-0.38-0.138-0.657-0.208-0.933 0.208s-1.073 1.35-1.315 1.627c-0.242 0.277-0.485 0.312-0.9 0.103s-1.758-0.648-3.35-2.067c-1.238-1.103-2.073-2.467-2.317-2.882s-0.025-0.64 0.183-0.847c0.187-0.187 0.415-0.485 0.623-0.727s0.277-0.415 0.415-0.692c0.138-0.277 0.070-0.518-0.035-0.727s-0.933-2.25-1.28-3.083c-0.337-0.812-0.68-0.702-0.933-0.715s-0.518-0.015-0.797-0.015c-0.277 0-0.727 0.103-1.108 0.518s-1.453 1.42-1.453 3.463 1.488 4.017 1.697 4.293c0.208 0.277 2.928 4.472 7.093 6.273 0.992 0.428 1.767 0.685 2.372 0.877 0.998 0.317 1.907 0.272 2.625 0.165 0.8-0.12 2.455-1.003 2.8-1.972s0.345-1.8 0.242-1.972c-0.103-0.173-0.38-0.277-0.797-0.485z" />
                  </svg>
                  Finalizar pelo WhatsApp
                </button>

                <button
                  type="button"
                  className="btn btn-outline-copy btn-block"
                  onClick={handleCopySummary}
                  title="Copiar mensagem caso prefira colar manualmente no WhatsApp"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copied ? 'Resumo Copiado!' : 'Copiar resumo do pedido'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => setIsOpen(false)}
                >
                  Continuar no catálogo
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
