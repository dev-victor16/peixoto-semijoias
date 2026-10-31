'use client';
import React, { useState, useEffect, useRef } from 'react';

const mobileBanners = [
  {
    id: 1,
    src: '/images/banners/banner-mobile-1.jpg',
    alt: 'Peixoto Semi Joias - Sua beleza merece cada detalhe'
  },
  {
    id: 2,
    src: '/images/banners/banner-mobile-2.jpg',
    alt: 'Peixoto Semi Joias - Beleza que dura'
  },
  {
    id: 3,
    src: '/images/banners/banner-mobile-3.jpg',
    alt: 'Peixoto Semi Joias - Um toque de brilho muda tudo'
  }
];

export default function MobileBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoPlay = () => {
    stopAutoPlay();
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % mobileBanners.length);
    }, 4500);
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
    setCurrentIndex(prev => (prev === 0 ? mobileBanners.length - 1 : prev - 1));
    startAutoPlay();
  };

  const handleNext = () => {
    stopAutoPlay();
    setCurrentIndex(prev => (prev + 1) % mobileBanners.length);
    startAutoPlay();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    stopAutoPlay();
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    setTouchStartX(null);
    startAutoPlay();
  };

  return (
    <div className="ref-mobile-banner-wrapper">
      <div 
        className="ref-mobile-banner-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="ref-mobile-banner-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {mobileBanners.map((banner, idx) => (
            <div key={banner.id} className="ref-mobile-banner-slide">
              <img
                src={banner.src}
                alt={banner.alt}
                className="ref-mobile-banner-img"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>

        {/* Setas discretas */}
        <button
          type="button"
          onClick={handlePrev}
          className="ref-mobile-banner-arrow ref-arrow-prev"
          aria-label="Banner anterior"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="ref-mobile-banner-arrow ref-arrow-next"
          aria-label="Próximo banner"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Indicadores / Dots */}
        <div className="ref-mobile-banner-dots">
          {mobileBanners.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              className={`ref-mobile-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => {
                stopAutoPlay();
                setCurrentIndex(idx);
                startAutoPlay();
              }}
              aria-label={`Ir para banner ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
