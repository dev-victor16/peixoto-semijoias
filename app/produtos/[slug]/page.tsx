import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getDb } from '@/lib/db';
import ProductDetailClient from './ProductDetailClient';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

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

async function getProductBySlug(slug: string): Promise<ProductDetailData | null> {
  const decodedSlug = decodeURIComponent(slug);

  // 1. Tenta Supabase
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, sku, price, promo_price, is_promo, description,
          materials, care_instructions, stock_quantity, published,
          categories (id, name, slug),
          product_images (id, url, alt, is_primary, sort_order)
        `)
        .eq('slug', decodedSlug)
        .eq('published', 1)
        .maybeSingle();

      if (!error && data) {
        const cat = Array.isArray(data.categories) ? data.categories[0] : data.categories as any;
        const rawImages = (data.product_images as any[]) || [];
        const sortedImages: ProductImage[] = rawImages
          .sort((a, b) => (b.is_primary || 0) - (a.is_primary || 0) || (a.sort_order || 0) - (b.sort_order || 0))
          .map(img => ({
            id: img.id,
            url: img.url,
            alt: img.alt || data.name,
            is_primary: img.is_primary || 0,
            sort_order: img.sort_order || 0
          }));

        return {
          id: data.id,
          name: data.name,
          slug: data.slug,
          sku: data.sku || `PX-${data.id}`,
          price: data.price,
          promo_price: data.promo_price,
          is_promo: data.is_promo,
          description: data.description || '',
          materials: data.materials || 'Semijoia banhada a prata 925 com acabamento nobre e tecnologia antialérgica.',
          care_instructions: data.care_instructions || 'Evite contato com água do mar, piscina, perfumes e produtos químicos para preservar o brilho.',
          stock_quantity: data.stock_quantity ?? 10,
          category_name: cat?.name || 'Semijoias',
          category_slug: cat?.slug || 'semijoias',
          images: sortedImages
        };
      }
    }
  } catch (err) {
    console.error('Erro ao buscar produto no Supabase:', err);
  }

  // 2. Fallback SQLite local
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.published = 1
    `).get(decodedSlug) as any;

    if (!row) return null;

    const images = db.prepare(`
      SELECT id, url, alt, is_primary, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order ASC
    `).all(row.id) as ProductImage[];

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku || `PX-${row.id}`,
      price: row.price,
      promo_price: row.promo_price,
      is_promo: row.is_promo,
      description: row.description || '',
      materials: row.materials || 'Semijoia banhada a prata 925 com acabamento nobre e tecnologia antialérgica.',
      care_instructions: row.care_instructions || 'Evite contato com água do mar, piscina, perfumes e produtos químicos para preservar o brilho.',
      stock_quantity: row.stock_quantity ?? 10,
      category_name: row.category_name || 'Semijoias',
      category_slug: row.category_slug || 'semijoias',
      images: images || []
    };
  } catch (err) {
    console.error('Erro ao buscar produto no SQLite:', err);
    return null;
  }
}

async function getRelatedProducts(currentId: number): Promise<ProductCardData[]> {
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, promo_price, is_promo, description, stock_quantity,
          categories (name, slug),
          product_images (url, is_primary, sort_order)
        `)
        .eq('published', 1)
        .neq('id', currentId)
        .limit(4);

      if (data && data.length > 0) {
        return data.map(p => {
          const imgs = (p.product_images as any[]) || [];
          const primaryImg = imgs.find(i => i.is_primary === 1)?.url;
          const firstImg = imgs.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
          const cat = Array.isArray(p.categories) ? p.categories[0] : (p.categories as any);
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
          };
        });
      }
    }
  } catch (err) {
    console.error('Erro related supabase:', err);
  }

  // Fallback SQLite
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.promo_price, p.is_promo, p.description, p.stock_quantity,
             c.name as category_name, c.slug as category_slug,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.published = 1 AND p.id != ?
      LIMIT 4
    `).all(currentId) as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      price: r.price,
      promo_price: r.promo_price,
      is_promo: r.is_promo,
      short_description: r.description,
      stock_quantity: r.stock_quantity,
      category_name: r.category_name,
      category_slug: r.category_slug,
      image_url: r.image_url
    }));
  } catch {
    return [];
  }
}

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(product.id);

  return (
    <div className="ref-product-detail-page">
      <div className="ref-container">
        {/* Breadcrumb Navigation */}
        <nav className="ref-detail-breadcrumb" aria-label="Navegação">
          <Link href="/">Início</Link>
          <span className="separator">/</span>
          <Link href={`/produtos?category=${product.category_slug}`}>
            {product.category_name}
          </Link>
          <span className="separator">/</span>
          <span className="current">{product.name}</span>
        </nav>

        {/* Client Interactive Area (Gallery, Selectors, Add to Cart, WhatsApp) */}
        <ProductDetailClient product={product} />

        {/* Related Products Section */}
        {related.length > 0 && (
          <section className="ref-related-section">
            <h2 className="ref-related-title">VOCÊ TAMBÉM PODE GOSTAR</h2>
            <div className="ref-products-grid">
              {related.map(rel => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
