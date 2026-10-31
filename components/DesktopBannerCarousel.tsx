'use client';
import React, { useState, useEffect, useRef } from 'react';

const desktopBanners = [
  {
    id: 1,
    src: '/images/banners/banner-desktop-1.jpg',
    alt: 'Peixoto Semi Joias - Sua beleza merece cada detalhe'
  },
  {
    id: 2,
    src: '/images/banners/banner-desktop-2.jpg',
    alt: 'Peixoto Semi Joias - Beleza que dura. Elegância que permanece.'
  },
  {
    id: 3,
    src: '/images/banners/banner-desktop-3.jpg',
    alt: 'Peixoto Semi Joias - Um toque de brilho muda tudo'
  }
];

export default function DesktopBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoPlay = () => {
    stopAutoPlay();
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % desktopBanners.length);
    }, 7500);
  };

  const stopAutoPlay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, []);

  const handlePrev = () => {
    stopAutoPlay();
    setCurrentIndex(prev => (prev === 0 ? desktopBanners.length - 1 : prev - 1));
    startAutoPlay();
  };

  const handleNext = () => {
    stopAutoPlay();
    setCurrentIndex(prev => (prev + 1) % desktopBanners.length);
    startAutoPlay();
  };

  return (
    <section className="ref-desktop-banner-section">
      <div className="ref-container">
        <div 
          className="ref-desktop-banner-card"
          onMouseEnter={stopAutoPlay}
          onMouseLeave={startAutoPlay}
        >
          <div 
            className="ref-desktop-banner-track"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {desktopBanners.map((banner, idx) => (
              <div key={banner.id} className="ref-desktop-banner-slide">
                <img
                  src={banner.src}
                  alt={banner.alt}
                  className="ref-desktop-banner-img"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>

          {/* Setas de navegação */}
          <button
            type="button"
            className="ref-desktop-banner-arrow ref-arrow-prev"
            onClick={handlePrev}
            aria-label="Banner anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="ref-desktop-banner-arrow ref-arrow-next"
            onClick={handleNext}
            aria-label="Próximo banner"
          >
            ›
          </button>

          {/* Indicadores / Dots */}
          <div className="ref-desktop-banner-dots">
            {desktopBanners.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                className={`ref-desktop-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  stopAutoPlay();
                  setCurrentIndex(idx);
                  startAutoPlay();
                }}
                aria-label={`Banner ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

