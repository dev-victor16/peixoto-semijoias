'use client';

import React, { useRef, useState, useEffect } from 'react';
import ProductCard, { ProductCardData } from './ProductCard';

interface ProductCarouselProps {
  products: ProductCardData[];
  emptyMessage?: string;
  prefixId?: string;
}

export default function ProductCarousel({
  products,
  emptyMessage = 'Nenhuma peça cadastrada no momento.',
  prefixId = 'prod'
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!products || products.length === 0) {
    return (
      <div className="ref-empty-showcase">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="product-carousel-wrapper">
      {/* Seta Esquerda (Desktop) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="product-carousel-nav product-carousel-prev"
          aria-label="Ver produtos anteriores"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Container de Rolagem Horizontal */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="product-carousel-track"
      >
        {products.map(p => (
          <div key={`${prefixId}-${p.id}`} className="product-carousel-item">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Seta Direita (Desktop) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="product-carousel-nav product-carousel-next"
          aria-label="Ver mais produtos"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

