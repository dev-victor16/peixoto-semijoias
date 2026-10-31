import React from 'react';
import { getDb } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import ProductCard, { ProductCardData } from '@/components/ProductCard';
import MobileBannerCarousel from '@/components/MobileBannerCarousel';
import DesktopBannerCarousel from '@/components/DesktopBannerCarousel';

export const dynamic = 'force-dynamic';

async function getHomeProducts(): Promise<ProductCardData[]> {
  try {
    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: supaProds, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, promo_price, is_promo, description, stock_quantity, sort_order,
          categories (name, slug),
          product_images (url, is_primary, sort_order)
        `)
        .eq('published', 1)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })
        .limit(8);

      if (!error && supaProds) {
        return supaProds.map(p => {
          const imgs = (p.product_images as Array<{ url: string; is_primary: number; sort_order: number }>) || [];
          const primaryImg = imgs.find(i => i.is_primary === 1)?.url;
          const firstImg = imgs.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
          const cat = Array.isArray(p.categories) ? p.categories[0] : (p.categories as { name: string; slug: string } | null);

          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            promo_price: p.promo_price,
            is_promo: p.is_promo,
            short_description: p.description,
            stock_quantity: p.stock_quantity,
            category_name: cat?.name || '',
            category_slug: cat?.slug || '',
            image_url: primaryImg || firstImg || null
          } as ProductCardData;
        });
      }
    }

    // 2. Fallback to SQLite
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

export default async function HomePage() {
  const products = await getHomeProducts();

  return (
    <div className="ref-home-page">
      {/* Banner Carrossel Mobile Exclusivo (logo abaixo da barra superior) */}
      <MobileBannerCarousel />

      {/* ========================================================
          1. HERO BANNER PRINCIPAL (Exibido apenas na versão Desktop)
          ======================================================== */}
      <DesktopBannerCarousel />

      {/* ========================================================
          2. TÍTULO DA VITRINE (Elegante, limpo e sem corações ou datas fictícias)
          ======================================================== */}
      <section className="ref-collection-header-section">
        <div className="ref-container">
          <h2 className="ref-collection-title">
            SEMI JOIAS EM DESTAQUE
          </h2>
        </div>
      </section>

      {/* ========================================================
          3. VITRINE DE PRODUTOS
          ======================================================== */}
      <section className="ref-products-section">
        <div className="ref-container ref-showcase-container">
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
                <p>Nenhuma peça cadastrada no momento.</p>
              </div>
            )}
          </div>

          <button type="button" className="ref-showcase-arrow arrow-right" aria-label="Avançar peças">
            ›
          </button>
        </div>
      </section>

      {/* ========================================================
          4. FAIXA DE BENEFÍCIOS (Ícones SVG limpos e consistentes, sem emojis)
          ======================================================== */}
      <section className="ref-benefits-section">
        <div className="ref-container">
          <div className="ref-benefits-grid">
            <div className="ref-benefit-item">
              <div className="ref-benefit-header">
                <svg
                  className="ref-benefit-svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="ref-benefit-title">PEÇAS ANTIALÉRGICAS</span>
              </div>
              <p className="ref-benefit-desc">Desenvolvidas com conforto e tecnologia para peles sensíveis</p>
            </div>

            <div className="ref-benefit-item">
              <div className="ref-benefit-header">
                <svg
                  className="ref-benefit-svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
                <span className="ref-benefit-title">BANHADO A PRATA 925</span>
              </div>
              <p className="ref-benefit-desc">Semijoias com garantia e banho nobre de alto padrão</p>
            </div>

            <div className="ref-benefit-item">
              <div className="ref-benefit-header">
                <svg
                  className="ref-benefit-svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="ref-benefit-title">ATENDIMENTO PERSONALIZADO</span>
              </div>
              <p className="ref-benefit-desc">Tire dúvidas e finalize seu pedido diretamente conosco</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. BOTÃO FLUTUANTE DO WHATSAPP (Abertura direta da conversa)
          ======================================================== */}
      <a
        href="https://wa.me/5531995779163?text=Ol%C3%A1!%20Gostaria%20de%20consultar%20as%20pe%C3%A7as%20do%20cat%C3%A1logo%20Peixoto%20Semi%20Joias."
        target="_blank"
        rel="noopener noreferrer"
        className="ref-floating-whatsapp"
        aria-label="Fale conosco no WhatsApp"
        title="Fale conosco no WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" fill="#ffffff">
          <path d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 8.135-2.135c2.38 1.34 5.093 2.135 8.002 2.135 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.333c-2.482 0-4.912-0.668-7.042-1.933l-0.505-0.3-5.235 1.373 1.398-5.105-0.33-0.525c-1.385-2.205-2.12-4.757-2.12-7.343 0-7.618 6.182-13.8 13.8-13.8s13.8 6.182 13.8 13.8c0 7.618-6.182 13.8-13.8 13.8zM23.57 19.342c-0.415-0.208-2.455-1.212-2.835-1.35-0.38-0.138-0.657-0.208-0.933 0.208s-1.073 1.35-1.315 1.627c-0.242 0.277-0.485 0.312-0.9 0.103s-1.758-0.648-3.35-2.067c-1.238-1.103-2.073-2.467-2.317-2.882s-0.025-0.64 0.183-0.847c0.187-0.187 0.415-0.485 0.623-0.727s0.277-0.415 0.415-0.692c0.138-0.277 0.070-0.518-0.035-0.727s-0.933-2.25-1.28-3.083c-0.337-0.812-0.68-0.702-0.933-0.715s-0.518-0.015-0.797-0.015c-0.277 0-0.727 0.103-1.108 0.518s-1.453 1.42-1.453 3.463 1.488 4.017 1.697 4.293c0.208 0.277 2.928 4.472 7.093 6.273 0.992 0.428 1.767 0.685 2.372 0.877 0.998 0.317 1.907 0.272 2.625 0.165 0.8-0.12 2.455-1.003 2.8-1.972s0.345-1.8 0.242-1.972c-0.103-0.173-0.38-0.277-0.797-0.485z" />
        </svg>
      </a>
    </div>
  );
}
