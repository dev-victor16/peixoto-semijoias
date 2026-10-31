'use client';
import React, { useState } from 'react';
import { useCart } from '@/components/CartProvider';

interface ProductImage {
  id: number;
  url: string;
  alt?: string;
  is_primary: number;
  sort_order: number;
}

interface ProductDetailData {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  promo_price?: number | null;
  is_promo?: number;
  description?: string;
  materials?: string;
  care_instructions?: string;
  stock_quantity: number;
  category_name?: string;
  category_slug?: string;
  images: ProductImage[];
}

export default function ProductDetailClient({ product }: { product: ProductDetailData }) {
  const { addItem, setIsOpen } = useCart();
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const images = product.images.length > 0
    ? product.images
    : [{ id: 0, url: '/images/products/placeholder.jpg', alt: product.name, is_primary: 1, sort_order: 0 }];

  const currentImage = images[selectedImgIndex] || images[0];

  const handlePrevImg = () => {
    setSelectedImgIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImg = () => {
    setSelectedImgIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) {
      handleNextImg();
    } else if (diff < -40) {
      handlePrevImg();
    }
    setTouchStartX(null);
  };

  const effectivePrice = product.promo_price && product.promo_price < product.price
    ? product.promo_price
    : product.price;

  const handleAddToCart = () => {
    setStockError(null);
    const result = addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      unit_price: effectivePrice,
      quantity: quantity,
      image: currentImage.url,
      variation_type: 'Material',
      variation_value: 'Prata 925 (Antialérgica)',
      stock_available: product.stock_quantity
    });

    if (result.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } else {
      setStockError(result.message || 'Estoque insuficiente');
      setTimeout(() => setStockError(null), 3500);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setIsOpen(true);
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Tenho interesse na peça *${product.name}* (Ref: ${product.sku}) no valor de R$ ${effectivePrice.toFixed(2).replace('.', ',')}. Está disponível?`
  );
  const whatsappUrl = `https://wa.me/5531995779163?text=${whatsappMessage}`;

  return (
    <div className="ref-detail-grid">
      {/* 1. Galeria de Imagens com Suporte a Slide / Carrossel */}
      <div className="ref-detail-gallery">
        <div 
          className="ref-detail-main-image-wrap"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={currentImage.url}
            alt={currentImage.alt || product.name}
            className="ref-detail-main-img"
          />
          {product.is_promo === 1 && product.promo_price && (
            <span className="ref-detail-badge-promo">PROMOÇÃO</span>
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="ref-detail-nav-btn ref-detail-nav-prev"
                onClick={handlePrevImg}
                aria-label="Foto anterior"
                title="Foto anterior"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                type="button"
                className="ref-detail-nav-btn ref-detail-nav-next"
                onClick={handleNextImg}
                aria-label="Próxima foto"
                title="Próxima foto"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Indicador de fotos (ex: 1 / 3) */}
              <div className="ref-detail-photo-counter">
                {selectedImgIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="ref-detail-thumbnails">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                className={`ref-detail-thumb-btn ${idx === selectedImgIndex ? 'active' : ''}`}
                onClick={() => setSelectedImgIndex(idx)}
                aria-label={`Ver foto ${idx + 1}`}
              >
                <img src={img.url} alt={img.alt || product.name} className="ref-detail-thumb-img" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Informações do Produto & Compra */}
      <div className="ref-detail-info">
        <div className="ref-detail-category-tag">{product.category_name}</div>
        <h1 className="ref-detail-title">{product.name}</h1>
        <div className="ref-detail-sku">Ref: <span>{product.sku}</span></div>

        {/* Preços e Parcelamento */}
        <div className="ref-detail-pricing-box">
          {product.promo_price && product.promo_price < product.price ? (
            <div className="ref-detail-prices">
              <span className="ref-detail-old-price">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
              <span className="ref-detail-current-price">
                R$ {product.promo_price.toFixed(2).replace('.', ',')}
              </span>
            </div>
          ) : (
            <div className="ref-detail-current-price">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </div>
          )}
        </div>

        {/* Destaque Exclusivo: Prata 925 e Antialérgica */}
        <div className="ref-detail-seal-box">
          <div className="ref-detail-seal-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div>
              <strong>Peça Antialérgica</strong>
              <span>Conforto e segurança para a pele</span>
            </div>
          </div>

          <div className="ref-detail-seal-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            <div>
              <strong>Banhado a Prata 925</strong>
              <span>Semijoias com garantia de fábrica</span>
            </div>
          </div>
        </div>

        {/* Quantidade e Botões de Compra */}
        <div className="ref-detail-actions">
          <div className="ref-detail-qty-wrap">
            <button
              type="button"
              className="ref-qty-btn"
              onClick={() => {
                setStockError(null);
                setQuantity(Math.max(1, quantity - 1));
              }}
              aria-label="Diminuir quantidade"
            >
              -
            </button>
            <span className="ref-qty-number">{quantity}</span>
            <button
              type="button"
              className="ref-qty-btn"
              onClick={() => {
                if (quantity < (product.stock_quantity || 1)) {
                  setQuantity(quantity + 1);
                } else {
                  setStockError(`Temos apenas ${product.stock_quantity || 1} unidade(s) em estoque.`);
                  setTimeout(() => setStockError(null), 3000);
                }
              }}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={`ref-detail-add-btn ${added ? 'added' : ''}`}
            onClick={handleAddToCart}
          >
            {added ? '✓ ADICIONADO À SACOLA!' : 'ADICIONAR À SACOLA'}
          </button>
        </div>

        {stockError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#dc2626',
            borderRadius: '6px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: '600',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{stockError}</span>
          </div>
        )}

        <div className="ref-detail-cta-secondary">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ref-detail-whatsapp-btn"
          >
            <svg viewBox="0 0 32 32" width="22" height="22" fill="#ffffff">
              <path d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 8.135-2.135c2.38 1.34 5.093 2.135 8.002 2.135 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.333c-2.482 0-4.912-0.668-7.042-1.933l-0.505-0.3-5.235 1.373 1.398-5.105-0.33-0.525c-1.385-2.205-2.12-4.757-2.12-7.343 0-7.618 6.182-13.8 13.8-13.8s13.8 6.182 13.8 13.8c0 7.618-6.182 13.8-13.8 13.8zM23.57 19.342c-0.415-0.208-2.455-1.212-2.835-1.35-0.38-0.138-0.657-0.208-0.933 0.208s-1.073 1.35-1.315 1.627c-0.242 0.277-0.485 0.312-0.9 0.103s-1.758-0.648-3.35-2.067c-1.238-1.103-2.073-2.467-2.317-2.882s-0.025-0.64 0.183-0.847c0.187-0.187 0.415-0.485 0.623-0.727s0.277-0.415 0.415-0.692c0.138-0.277 0.070-0.518-0.035-0.727s-0.933-2.25-1.28-3.083c-0.337-0.812-0.68-0.702-0.933-0.715s-0.518-0.015-0.797-0.015c-0.277 0-0.727 0.103-1.108 0.518s-1.453 1.42-1.453 3.463 1.488 4.017 1.697 4.293c0.208 0.277 2.928 4.472 7.093 6.273 0.992 0.428 1.767 0.685 2.372 0.877 0.998 0.317 1.907 0.272 2.625 0.165 0.8-0.12 2.455-1.003 2.8-1.972s0.345-1.8 0.242-1.972c-0.103-0.173-0.38-0.277-0.797-0.485z" />
            </svg>
            <span>TIRAR DÚVIDAS NO WHATSAPP</span>
          </a>
        </div>

        {/* Descrição e Detalhes */}
        <div className="ref-detail-tabs">
          <div className="ref-detail-section-block">
            <h3 className="ref-detail-block-title">Descrição</h3>
            <p className="ref-detail-block-text">
              {product.description || 'Semijoia de design refinado, com acabamento impecável para valorizar seus momentos especiais.'}
            </p>
          </div>

          <div className="ref-detail-section-block">
            <h3 className="ref-detail-block-title">Material e Qualidade</h3>
            <p className="ref-detail-block-text">{product.materials}</p>
          </div>

          <div className="ref-detail-section-block">
            <h3 className="ref-detail-block-title">Cuidados com a Peça</h3>
            <p className="ref-detail-block-text">{product.care_instructions}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
