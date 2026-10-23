import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

function getHomeProducts(): ProductCardData[] {
  try {
    const db = getDb();
    const products = db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.price, p.promo_price, p.is_promo, p.description as short_description, p.stock_quantity,
        c.name as category_name, c.slug as category_slug,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.published = 1
      ORDER BY p.sort_order ASC, p.id ASC
      LIMIT 8
    `).all() as ProductCardData[];

    return products;
  } catch (e) {
    console.error('Error fetching home products:', e);
    return [];
  }
}

export default function HomePage() {
  const products = getHomeProducts();

  return (
    <div className="ref-home-page">
      {/* ========================================================
          1. HERO BANNER PRINCIPAL (Exata reprodução da referência)
          ======================================================== */}
      <section className="ref-banner-section">
        <div className="ref-container">
          <div className="ref-banner-card">
            {/* Left Carousel Arrow */}
            <button type="button" className="ref-banner-arrow arrow-left" aria-label="Anterior">
              ‹
            </button>

            <div className="ref-banner-content">
              {/* Left Side: Brazil Map Silhouette */}
              <div className="ref-banner-map-box">
                <svg
                  className="ref-banner-map-svg"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M35 15 C 45 10, 60 12, 70 20 C 75 25, 85 28, 90 38 C 92 48, 80 58, 75 68 C 68 78, 55 88, 45 92 C 38 88, 30 78, 25 65 C 18 55, 12 40, 20 28 C 25 20, 30 18, 35 15 Z"
                    fill="#ff8fa3"
                    opacity="0.9"
                  />
                </svg>
              </div>

              {/* Center: Headline & Promotional Copy */}
              <div className="ref-banner-text-box">
                <h1 className="ref-banner-title">
                  <span className="ref-title-line1">Enviamos para</span>
                  <span className="ref-title-badge">todo Brasil</span>
                </h1>

                <div className="ref-banner-pill">
                  Receba no conforto da sua casa!
                </div>

                <div className="ref-banner-rates">
                  <p className="rate-line">FRETE FIXO VIA PAC • SEMI JOIAS COM GARANTIA</p>
                  <p className="rate-sub">ATENDIMENTO EXCLUSIVO DIRETO NO WHATSAPP</p>
                </div>
              </div>

              {/* Right Side: Model Photo */}
              <div className="ref-banner-model-box">
                <img
                  src="/images/banner/model-banner.jpg"
                  alt="Peixoto Semi Joias - Enviamos para todo Brasil"
                  className="ref-banner-model-img"
                />
              </div>
            </div>

            {/* Right Carousel Arrow */}
            <button type="button" className="ref-banner-arrow arrow-right" aria-label="Próximo">
              ›
            </button>
          </div>

          {/* Carousel Dots */}
          <div className="ref-banner-dots">
            <span className="ref-dot"></span>
            <span className="ref-dot active"></span>
            <span className="ref-dot"></span>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. TÍTULO DA COLEÇÃO (Centralizado com corações)
          ======================================================== */}
      <section className="ref-collection-header-section">
        <div className="ref-container">
          <h2 className="ref-collection-title">
            ♡ COLEÇÃO FIM DE ANO ♡
          </h2>
        </div>
      </section>

      {/* ========================================================
          3. VITRINE DE PRODUTOS (Horizontal em 1 fileira de 4)
          ======================================================== */}
      <section className="ref-products-section">
        <div className="ref-container ref-showcase-container">
          {/* Showcase Left Arrow */}
          <button type="button" className="ref-showcase-arrow arrow-left" aria-label="Voltar peças">
            ‹
          </button>

          <div className="ref-products-grid">
            {products.length > 0 ? (
              products.slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p} />
              ))
            ) : (
              <div className="ref-empty-showcase">
                <p>Carregando peças exclusivas do catálogo...</p>
              </div>
            )}
          </div>

          {/* Showcase Right Arrow */}
          <button type="button" className="ref-showcase-arrow arrow-right" aria-label="Avançar peças">
            ›
          </button>
        </div>
      </section>

      {/* ========================================================
          4. NEWSLETTER (Exatamente conforme referência)
          ======================================================== */}
      <section className="ref-newsletter-section">
        <div className="ref-container">
          <div className="ref-newsletter-box">
            <h3 className="ref-newsletter-title">NOSSO NEWSLETTER</h3>
            <p className="ref-newsletter-sub">Inscreva-se para receber as últimas novidades.</p>

            <form className="ref-newsletter-form">
              <input
                type="text"
                placeholder="Nome Completo"
                className="ref-input"
              />
              <input
                type="email"
                placeholder="Seu E-mail"
                className="ref-input"
              />
              <button type="submit" className="ref-newsletter-btn">
                INSCREVER-SE
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. FAIXA DE BENEFÍCIOS (3 Colunas Horizontais)
          ======================================================== */}
      <section className="ref-benefits-section">
        <div className="ref-container">
          <div className="ref-benefits-grid">
            <div className="ref-benefit-item">
              <div className="ref-benefit-header">
                <span className="ref-benefit-icon">🚚</span>
                <span className="ref-benefit-title">ENVIAMOS PARA TODO BRASIL!</span>
              </div>
              <p className="ref-benefit-desc">Receba no conforto da sua casa ♡</p>
            </div>

            <div className="ref-benefit-item">
              <div className="ref-benefit-header">
                <span className="ref-benefit-icon">💳</span>
                <span className="ref-benefit-title">PAGUE COMO QUISER</span>
              </div>
              <p className="ref-benefit-desc">Cartões de crédito ou à vista ♡</p>
            </div>

            <div className="ref-benefit-item">
              <div className="ref-benefit-header">
                <span className="ref-benefit-icon">💬</span>
                <span className="ref-benefit-title">FICOU ALGUMA DÚVIDA?</span>
              </div>
              <p className="ref-benefit-desc">Chame a gente no WhatsApp! ♡</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. BOTÃO FLUTUANTE DO WHATSAPP (Canto inferior direito)
          ======================================================== */}
      <a
        href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20as%20semi%20joias%20da%20Peixoto."
        target="_blank"
        rel="noopener noreferrer"
        className="ref-floating-whatsapp"
        aria-label="Fale conosco no WhatsApp"
        title="Fale conosco no WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="32" height="32" fill="#ffffff">
          <path d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 8.135-2.135c2.38 1.34 5.093 2.135 8.002 2.135 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.333c-2.482 0-4.912-0.668-7.042-1.933l-0.505-0.3-5.235 1.373 1.398-5.105-0.33-0.525c-1.385-2.205-2.12-4.757-2.12-7.343 0-7.618 6.182-13.8 13.8-13.8s13.8 6.182 13.8 13.8c0 7.618-6.182 13.8-13.8 13.8zM23.57 19.342c-0.415-0.208-2.455-1.212-2.835-1.35-0.38-0.138-0.657-0.208-0.933 0.208s-1.073 1.35-1.315 1.627c-0.242 0.277-0.485 0.312-0.9 0.103s-1.758-0.648-3.35-2.067c-1.238-1.103-2.073-2.467-2.317-2.882s-0.025-0.64 0.183-0.847c0.187-0.187 0.415-0.485 0.623-0.727s0.277-0.415 0.415-0.692c0.138-0.277 0.070-0.518-0.035-0.727s-0.933-2.25-1.28-3.083c-0.337-0.812-0.68-0.702-0.933-0.715s-0.518-0.015-0.797-0.015c-0.277 0-0.727 0.103-1.108 0.518s-1.453 1.42-1.453 3.463 1.488 4.017 1.697 4.293c0.208 0.277 2.928 4.472 7.093 6.273 0.992 0.428 1.767 0.685 2.372 0.877 0.998 0.317 1.907 0.272 2.625 0.165 0.8-0.12 2.455-1.003 2.8-1.972s0.345-1.8 0.242-1.972c-0.103-0.173-0.38-0.277-0.797-0.485z" />
        </svg>
      </a>
    </div>
  );
}
