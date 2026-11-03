import React from 'react';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getDb } from '@/lib/db';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function getCategoryData(slug: string) {
  const decodedSlug = decodeURIComponent(slug).toLowerCase().trim();

  // 1. Tenta Supabase
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      let catRes = await supabase
        .from('categories')
        .select('*')
        .or(`slug.eq.${decodedSlug},name.ilike.%${decodedSlug}%`)
        .maybeSingle();

      // Mapeamento inteligente para termos comuns
      if (!catRes.data) {
        let catIdFallback: number | null = null;
        if (decodedSlug.includes('brinco') || decodedSlug.includes('piercing')) catIdFallback = 1;
        else if (decodedSlug.includes('colar') || decodedSlug.includes('choker')) catIdFallback = 2;
        else if (decodedSlug.includes('anel') || decodedSlug.includes('aneis')) catIdFallback = 3;
        else if (decodedSlug.includes('pulseira')) catIdFallback = 4;
        else if (decodedSlug.includes('conjunto')) catIdFallback = 5;
        else if (decodedSlug.includes('berloque')) catIdFallback = 6;

        if (catIdFallback) {
          catRes = await supabase
            .from('categories')
            .select('*')
            .eq('id', catIdFallback)
            .maybeSingle();
        }
      }

      const cat = catRes.data;

      if (cat) {
        const { data: supaProds } = await supabase
          .from('products')
          .select(`
            id, name, slug, price, promo_price, is_promo, description, stock_quantity, sort_order,
            categories (name, slug),
            product_images (url, is_primary, sort_order)
          `)
          .eq('published', 1)
          .eq('category_id', cat.id)
          .order('id', { ascending: true });

        const products: ProductCardData[] = (supaProds || []).map(p => {
          const imgs = (p.product_images as Array<{ url: string; is_primary: number; sort_order: number }>) || [];
          const primaryImg = imgs.find(i => i.is_primary === 1)?.url;
          const firstImg = imgs.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;

          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            promo_price: p.promo_price,
            is_promo: p.is_promo,
            short_description: p.description,
            stock_quantity: p.stock_quantity,
            category_name: cat.name,
            category_slug: cat.slug,
            image_url: primaryImg || firstImg || undefined
          };
        });

        return { category: cat, products };
      }
    }
  } catch (err) {
    console.error('Erro ao buscar categoria no Supabase:', err);
  }

  // 2. Fallback SQLite
  try {
    const db = getDb();
    let cat = db.prepare(`
      SELECT * FROM categories 
      WHERE slug = ? OR slug LIKE ? OR name LIKE ?
    `).get(decodedSlug, `%${decodedSlug}%`, `%${decodedSlug}%`) as { id: number; name: string; slug: string; image_url?: string } | undefined;

    // Se o slug for mapeamento direto (ex: brincos -> brincos e piercing)
    if (!cat) {
      if (decodedSlug.includes('brinco') || decodedSlug.includes('piercing')) {
        cat = db.prepare("SELECT * FROM categories WHERE id = 1").get() as any;
      } else if (decodedSlug.includes('colar') || decodedSlug.includes('choker')) {
        cat = db.prepare("SELECT * FROM categories WHERE id = 2").get() as any;
      } else if (decodedSlug.includes('anel') || decodedSlug.includes('aneis')) {
        cat = db.prepare("SELECT * FROM categories WHERE id = 3").get() as any;
      } else if (decodedSlug.includes('pulseira')) {
        cat = db.prepare("SELECT * FROM categories WHERE id = 4").get() as any;
      } else if (decodedSlug.includes('conjunto')) {
        cat = db.prepare("SELECT * FROM categories WHERE id = 5").get() as any;
      } else if (decodedSlug.includes('berloque')) {
        cat = db.prepare("SELECT * FROM categories WHERE id = 6").get() as any;
      }
    }

    if (cat) {
      const products = db.prepare(`
        SELECT 
          p.id, p.name, p.slug, p.price, p.promo_price, p.is_promo, p.description as short_description, p.stock_quantity,
          c.name as category_name, c.slug as category_slug,
          (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.published = 1 AND p.category_id = ?
        ORDER BY p.id ASC
      `).all(cat.id) as ProductCardData[];

      return { category: cat, products };
    }
  } catch (err) {
    console.error('Erro ao buscar categoria no SQLite:', err);
  }

  return {
    category: {
      name: decodedSlug.replace(/-/g, ' ').toUpperCase(),
      slug: decodedSlug
    },
    products: []
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const { category, products } = await getCategoryData(slug);

  return (
    <div className="ref-home-page" style={{ paddingBottom: '4rem' }}>
      {/* Navegação / Breadcrumb */}
      <div className="ref-container" style={{ paddingTop: '1.5rem' }}>
        <nav style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--slate-blue)', textDecoration: 'none', fontWeight: 600 }}>
            Início
          </Link>
          <span>/</span>
          <span style={{ color: '#1a2234', fontWeight: 700 }}>{category.name}</span>
        </nav>
      </div>

      {/* Cabeçalho da Categoria */}
      <section className="ref-collection-header-section" style={{ paddingTop: '1.2rem', paddingBottom: '1.5rem' }}>
        <div className="ref-container">
          <h1 className="ref-collection-title" style={{ fontSize: '1.45rem' }}>
            {category.name}
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.4rem' }}>
            Semijoias banhadas a Prata 925 • Acabamento nobre e antialérgico
          </p>
        </div>
      </section>

      {/* Grid de Produtos */}
      <section className="ref-products-section">
        <div className="ref-container">
          {products.length > 0 ? (
            <div className="ref-products-grid">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              backgroundColor: '#FAF7F3',
              borderRadius: '16px',
              border: '1px solid var(--ref-border)',
              maxWidth: '520px',
              margin: '0 auto'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--slate-blue)', display: 'block', marginBottom: '0.6rem' }}>
                diamond
              </span>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-blue-dark)', marginBottom: '0.4rem', fontWeight: 700 }}>
                Novidades chegando em breve!
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Estamos preparando novas semijoias exclusivas para esta categoria. Consulte disponibilidade pelo WhatsApp.
              </p>
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/" className="zom-btn-primary" style={{ padding: '0.7rem 1.4rem', textDecoration: 'none', fontSize: '0.8rem' }}>
                  Ver Todas as Peças
                </Link>
                <a
                  href={`https://wa.me/5531995779163?text=Ol%C3%A1!%20Gostaria%20de%20consultar%20semijoias%20da%20categoria%20${encodeURIComponent(category.name)}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: '#25d366',
                    color: '#ffffff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textDecoration: 'none'
                  }}
                >
                  Consultar no WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
