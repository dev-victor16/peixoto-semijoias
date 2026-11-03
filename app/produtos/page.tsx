import React from 'react';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getDb } from '@/lib/db';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

interface ProdutosPageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

async function getProdutos(categorySlug?: string, search?: string): Promise<{ products: ProductCardData[]; title: string }> {
  // 1. Tenta Supabase
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      let query = supabase
        .from('products')
        .select(`
          id, name, slug, price, promo_price, is_promo, description, stock_quantity, sort_order, category_id,
          categories (id, name, slug),
          product_images (url, is_primary, sort_order)
        `)
        .eq('published', 1);

      let title = 'Catálogo Oficial de Semijoias';

      if (categorySlug) {
        const cleanCat = categorySlug.toLowerCase().trim();
        let cat = (await supabase
          .from('categories')
          .select('id, name')
          .or(`slug.eq.${cleanCat},name.ilike.%${cleanCat}%`)
          .maybeSingle()).data;

        if (!cat) {
          let catIdFallback: number | null = null;
          if (cleanCat.includes('brinco') || cleanCat.includes('piercing')) catIdFallback = 1;
          else if (cleanCat.includes('colar') || cleanCat.includes('choker')) catIdFallback = 2;
          else if (cleanCat.includes('anel') || cleanCat.includes('aneis')) catIdFallback = 3;
          else if (cleanCat.includes('pulseira')) catIdFallback = 4;
          else if (cleanCat.includes('conjunto')) catIdFallback = 5;
          else if (cleanCat.includes('berloque')) catIdFallback = 6;

          if (catIdFallback) {
            cat = (await supabase
              .from('categories')
              .select('id, name')
              .eq('id', catIdFallback)
              .maybeSingle()).data;
          }
        }

        if (cat) {
          query = query.eq('category_id', cat.id);
          title = cat.name;
        }
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
        title = `Resultados para "${search}"`;
      }

      const { data: supaProds } = await query.order('id', { ascending: true });

      if (supaProds) {
        const products = supaProds.map(p => {
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
            image_url: primaryImg || firstImg || undefined
          } as ProductCardData;
        });

        return { products, title };
      }
    }
  } catch (err) {
    console.error('Erro ao buscar produtos no Supabase:', err);
  }

  // 2. Fallback SQLite
  try {
    const db = getDb();
    let query = `
      SELECT 
        p.id, p.name, p.slug, p.price, p.promo_price, p.is_promo, p.description as short_description, p.stock_quantity,
        c.name as category_name, c.slug as category_slug,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.published = 1
    `;
    const params: any[] = [];
    let title = 'Catálogo Oficial de Semijoias';

    if (categorySlug) {
      let cat = db.prepare(`SELECT id, name FROM categories WHERE slug = ? OR slug LIKE ? OR name LIKE ?`).get(categorySlug, `%${categorySlug}%`, `%${categorySlug}%`) as { id: number; name: string } | undefined;
      if (!cat) {
        if (categorySlug.includes('brinco') || categorySlug.includes('piercing')) cat = db.prepare("SELECT id, name FROM categories WHERE id = 1").get() as any;
        else if (categorySlug.includes('colar') || categorySlug.includes('choker')) cat = db.prepare("SELECT id, name FROM categories WHERE id = 2").get() as any;
        else if (categorySlug.includes('anel') || categorySlug.includes('aneis')) cat = db.prepare("SELECT id, name FROM categories WHERE id = 3").get() as any;
        else if (categorySlug.includes('pulseira')) cat = db.prepare("SELECT id, name FROM categories WHERE id = 4").get() as any;
        else if (categorySlug.includes('conjunto')) cat = db.prepare("SELECT id, name FROM categories WHERE id = 5").get() as any;
        else if (categorySlug.includes('berloque')) cat = db.prepare("SELECT id, name FROM categories WHERE id = 6").get() as any;
      }

      if (cat) {
        query += ` AND p.category_id = ?`;
        params.push(cat.id);
        title = cat.name;
      }
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      title = `Resultados para "${search}"`;
    }

    query += ` ORDER BY p.id ASC`;
    const products = db.prepare(query).all(...params) as ProductCardData[];

    return { products, title };
  } catch (err) {
    console.error('Erro ao buscar produtos no SQLite:', err);
    return { products: [], title: 'Catálogo de Semijoias' };
  }
}

export default async function ProdutosPage({ searchParams }: ProdutosPageProps) {
  const { category, search } = await searchParams;
  const { products, title } = await getProdutos(category, search);

  return (
    <div className="ref-home-page" style={{ paddingBottom: '4rem' }}>
      <div className="ref-container" style={{ paddingTop: '1.5rem' }}>
        <nav style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--slate-blue)', textDecoration: 'none', fontWeight: 600 }}>
            Início
          </Link>
          <span>/</span>
          <span style={{ color: '#1a2234', fontWeight: 700 }}>{title}</span>
        </nav>
      </div>

      <section className="ref-collection-header-section" style={{ paddingTop: '1.2rem', paddingBottom: '1.5rem' }}>
        <div className="ref-container">
          <h1 className="ref-collection-title" style={{ fontSize: '1.45rem' }}>
            {title}
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.4rem' }}>
            Semijoias banhadas a Prata 925 • Acabamento nobre e antialérgico
          </p>
        </div>
      </section>

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
                Nenhuma peça encontrada
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Não encontramos produtos disponíveis para esta consulta no momento.
              </p>
              <Link href="/" className="zom-btn-primary" style={{ padding: '0.7rem 1.4rem', textDecoration: 'none', fontSize: '0.8rem' }}>
                Voltar à Página Inicial
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
