import { NextRequest, NextResponse } from 'next/server';
import { getDb, slugify } from '@/lib/db';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const published = searchParams.get('published');
    const featured = searchParams.get('featured');
    const isNew = searchParams.get('is_new');
    const isPromo = searchParams.get('is_promo');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const inStock = searchParams.get('in_stock');
    const sort = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const admin = searchParams.get('admin') === '1';

    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as primary_image,
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) as first_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (!admin) {
      query += ' AND p.published = 1';
    } else if (published !== null) {
      query += ' AND p.published = ?';
      params.push(parseInt(published));
    }

    if (category) {
      query += ' AND (c.slug = ? OR c.id = ?)';
      params.push(category, isNaN(Number(category)) ? -1 : Number(category));
    }
    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (featured === '1') { query += ' AND p.featured = 1'; }
    if (isNew === '1') { query += ' AND p.is_new = 1'; }
    if (isPromo === '1') {
      query += ` AND p.is_promo = 1 AND p.promo_price IS NOT NULL 
        AND (p.promo_start IS NULL OR p.promo_start <= datetime('now'))
        AND (p.promo_end IS NULL OR p.promo_end >= datetime('now'))`;
    }
    if (minPrice) { query += ' AND COALESCE(p.promo_price, p.price) >= ?'; params.push(parseFloat(minPrice)); }
    if (maxPrice) { query += ' AND COALESCE(p.promo_price, p.price) <= ?'; params.push(parseFloat(maxPrice)); }
    if (inStock === '1') { query += ' AND p.stock_quantity > 0'; }

    // Count total
    const countQuery = query.replace(/SELECT p\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };

    switch (sort) {
      case 'price_asc': query += ' ORDER BY COALESCE(p.promo_price, p.price) ASC'; break;
      case 'price_desc': query += ' ORDER BY COALESCE(p.promo_price, p.price) DESC'; break;
      case 'name': query += ' ORDER BY p.name ASC'; break;
      case 'oldest': query += ' ORDER BY p.created_at ASC'; break;
      default: query += ' ORDER BY p.created_at DESC';
    }
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = db.prepare(query).all(...params) as Record<string, unknown>[];
    
    // Get current active promo prices
    const now = new Date().toISOString();
    const processedProducts = products.map((p) => {
      const hasActivePromo = p.is_promo && p.promo_price &&
        (!p.promo_start || (p.promo_start as string) <= now) &&
        (!p.promo_end || (p.promo_end as string) >= now);
      return {
        ...p,
        effective_price: hasActivePromo ? p.promo_price : p.price,
        has_active_promo: !!hasActivePromo,
        image: p.primary_image || p.first_image,
      };
    });

    return NextResponse.json({ products: processedProducts, total: totalResult.total, limit, offset });
  } catch (e) {
    console.error('Products GET error:', e);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      name, description, sku, category_id, price, promo_price, promo_start, promo_end,
      cost_price, stock_quantity, low_stock_threshold, materials, care_instructions,
      weight, dimensions, published, featured, is_new, is_promo, images, variations
    } = body;

    if (!name || !sku || price === undefined) {
      return NextResponse.json({ error: 'Nome, SKU e preço são obrigatórios' }, { status: 400 });
    }

    const db = getDb();
    let slug = slugify(name);
    const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
    if (existingSlug) slug = `${slug}-${Date.now()}`;

    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existingSku) {
      return NextResponse.json({ error: 'SKU já existe' }, { status: 409 });
    }

    const insertProduct = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO products (name, slug, description, sku, category_id, price, promo_price, promo_start, promo_end,
          cost_price, stock_quantity, low_stock_threshold, materials, care_instructions, weight, dimensions,
          published, featured, is_new, is_promo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, slug, description || null, sku, category_id || null, price, promo_price || null,
        promo_start || null, promo_end || null, cost_price || null, stock_quantity || 0,
        low_stock_threshold || 3, materials || null, care_instructions || null,
        weight || null, dimensions || null, published ? 1 : 0, featured ? 1 : 0, is_new ? 1 : 0, is_promo ? 1 : 0
      );
      const productId = result.lastInsertRowid as number;

      // Insert images
      if (images && images.length > 0) {
        const insertImage = db.prepare('INSERT INTO product_images (product_id, url, alt, sort_order, is_primary) VALUES (?, ?, ?, ?, ?)');
        images.forEach((img: { url: string; alt?: string }, idx: number) => {
          insertImage.run(productId, img.url, img.alt || name, idx, idx === 0 ? 1 : 0);
        });
      }

      // Insert variations
      if (variations && variations.length > 0) {
        const insertVar = db.prepare('INSERT INTO product_variations (product_id, type, value, price_adjustment, stock_quantity, sku_suffix) VALUES (?, ?, ?, ?, ?, ?)');
        variations.forEach((v: { type: string; value: string; price_adjustment?: number; stock_quantity?: number; sku_suffix?: string }) => {
          insertVar.run(productId, v.type, v.value, v.price_adjustment || 0, v.stock_quantity || 0, v.sku_suffix || null);
        });
      }

      // Stock movement
      if (stock_quantity && stock_quantity > 0) {
        db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, reason, created_by)
          VALUES (?, 'entrada', ?, 0, ?, 'Estoque inicial', ?)
        `).run(productId, stock_quantity, stock_quantity, user.username);
      }

      // Price history
      db.prepare(`
        INSERT INTO price_history (product_id, new_price, new_promo_price, new_cost_price, changed_by, reason)
        VALUES (?, ?, ?, ?, ?, 'Cadastro inicial')
      `).run(productId, price, promo_price || null, cost_price || null, user.username);

      logAdminAction(user.userId, user.username, 'create_product', 'product', productId, name);
      return productId;
    });

    const productId = insertProduct();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    return NextResponse.json(product, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error('Product create error:', e);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}
