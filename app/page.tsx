import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ProductCardData {
  id: number;
  name: string;
  slug: string;
  price: number;
  promo_price?: number;
  is_promo?: number;
  short_description?: string;
  category_name?: string;
  category_slug?: string;
  image_url?: string;
  stock_quantity: number;
}

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
}

function getHomeData() {
  try {
    const db = getDb();
    
    // Featured categories
    const categories = db.prepare(`
      SELECT id, name, slug, image_url 
      FROM categories 
      WHERE active = 1 
      ORDER BY sort_order ASC, name ASC 
      LIMIT 6
    `).all() as CategoryData[];

    // Featured & Highlights products
    const featuredProducts = db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.price, p.promo_price, p.is_promo, p.short_description, p.stock_quantity,
        c.name as category_name, c.slug as category_slug,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.published = 1 AND (p.featured = 1 OR p.highlight = 1)
      ORDER BY p.sort_order ASC, p.id DESC
      LIMIT 8
    `).all() as ProductCardData[];

    // New releases / all products if few featured
    const newProducts = db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.price, p.promo_price, p.is_promo, p.short_description, p.stock_quantity,
        c.name as category_name, c.slug as category_slug,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.published = 1
      ORDER BY p.id DESC
      LIMIT 8
    `).all() as ProductCardData[];

    return { categories, featuredProducts, newProducts };
  } catch (e) {
    console.error('Error fetching home data:', e);
    return { categories: [], featuredProducts: [], newProducts: [] };
  }
}

export default function HomePage() {
  const { categories, featuredProducts, newProducts } = getHomeData();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <span className="hero-badge">Coleção Exclusiva</span>
            <h1 className="hero-title">
              O brilho sofisticado que traduz a sua verdadeira essência
            </h1>
            <p className="hero-description">
              Semi joias premium banhadas a ouro 18k e prata 925 com acabamento refinado, garantia e a facilidade de finalizar seu pedido diretamente pelo WhatsApp.
            </p>
            <div className="hero-actions">
              <Link href="/produtos" className="btn btn-primary">
                Ver Todas as Joias
              </Link>
              <a
                href="#categorias"
                className="btn btn-outline"
                style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Explorar Categorias
              </a>
            </div>
            <div className="hero-badges-row">
              <div className="hero-badge-item">
                <span className="hero-badge-icon">✨</span>
                <span>Banho Ouro 18k & Prata</span>
              </div>
              <div className="hero-badge-item">
                <span className="hero-badge-icon">🛡️</span>
                <span>Garantia Certificada</span>
              </div>
              <div className="hero-badge-item">
                <span className="hero-badge-icon">💬</span>
                <span>Atendimento WhatsApp VIP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section id="categorias" className="section-categories">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Categorias</span>
            <h2 className="section-title">Encontre Sua Peça Perfeita</h2>
            <p className="section-subtitle">
              Navegue pelas nossas seleções exclusivas desenhadas para todos os momentos.
            </p>
          </div>

          <div className="categories-grid">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/produtos?category=${cat.slug}`}
                className="category-card"
              >
                <div className="category-card-icon">
                  {cat.slug === 'brincos' && '✨'}
                  {cat.slug === 'colares' && '📿'}
                  {cat.slug === 'aneis' && '💍'}
                  {cat.slug === 'pulseiras' && '💫'}
                  {!['brincos', 'colares', 'aneis', 'pulseiras'].includes(cat.slug) && '💎'}
                </div>
                <h3 className="category-card-title">{cat.name}</h3>
                <span className="category-card-link">Ver coleção →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-featured">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Destaques</span>
            <h2 className="section-title">Mais Desejadas</h2>
            <p className="section-subtitle">
              As semi joias mais adoradas por nossas clientes nesta temporada.
            </p>
          </div>

          <div className="products-grid">
            {featuredProducts.length > 0 ? (
              featuredProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))
            ) : newProducts.length > 0 ? (
              newProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))
            ) : (
              <div className="empty-state">
                <p>Nossos novos lançamentos estão sendo preparados com muito carinho!</p>
              </div>
            )}
          </div>

          <div className="section-cta-center">
            <Link href="/produtos" className="btn btn-primary">
              Ver Catálogo Completo
            </Link>
          </div>
        </div>
      </section>

      {/* WhatsApp Experience Banner */}
      <section className="whatsapp-banner">
        <div className="container">
          <div className="whatsapp-banner-card">
            <div className="whatsapp-banner-content">
              <span className="whatsapp-pill">Compra Simples & Humana</span>
              <h2>Escolha no site, conclua no WhatsApp</h2>
              <p>
                Adicione suas peças favoritas ao carrinho e com um clique nossa equipe recebe todos os detalhes do seu pedido com atendimento personalizado para confirmar frete, prazos e pagamento.
              </p>
              <div className="whatsapp-steps">
                <div className="whatsapp-step">
                  <span className="step-num">1</span>
                  <span>Escolha as peças</span>
                </div>
                <div className="whatsapp-step-arrow">→</div>
                <div className="whatsapp-step">
                  <span className="step-num">2</span>
                  <span>Adicione à sacola</span>
                </div>
                <div className="whatsapp-step-arrow">→</div>
                <div className="whatsapp-step">
                  <span className="step-num">3</span>
                  <span>Finalize no WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product }: { product: ProductCardData }) {
  const isOutOfStock = product.stock_quantity <= 0;
  const hasPromo = Boolean(product.is_promo && product.promo_price && product.promo_price < product.price);

  return (
    <div className="product-card">
      <Link href={`/produtos/${product.slug}`} className="product-card-media">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-card-img"
            loading="lazy"
          />
        ) : (
          <div className="product-card-placeholder">
            <span>✨</span>
          </div>
        )}
        {hasPromo && <span className="product-badge-promo">Oferta</span>}
        {isOutOfStock && <span className="product-badge-stock">Esgotado</span>}
      </Link>

      <div className="product-card-body">
        {product.category_name && (
          <span className="product-card-category">{product.category_name}</span>
        )}
        <h3 className="product-card-name">
          <Link href={`/produtos/${product.slug}`}>{product.name}</Link>
        </h3>

        <div className="product-card-prices">
          {hasPromo && product.promo_price ? (
            <>
              <span className="product-card-price-promo">
                R$ {product.promo_price.toFixed(2).replace('.', ',')}
              </span>
              <span className="product-card-price-old">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
            </>
          ) : (
            <span className="product-card-price">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>

        <Link
          href={`/produtos/${product.slug}`}
          className="btn btn-outline btn-block product-card-btn"
        >
          Ver Detalhes
        </Link>
      </div>
    </div>
  );
}
