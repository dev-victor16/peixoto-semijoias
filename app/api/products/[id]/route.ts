import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    
    // Try by id or slug
    let product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? OR p.slug = ?
    `).get(id, id) as Record<string, unknown> | undefined;
    
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(product.id);
    const variations = db.prepare('SELECT * FROM product_variations WHERE product_id = ? AND active = 1').all(product.id);
    
    // Related products
    const related = db.prepare(`
      SELECT p.*, 
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) as image
      FROM products p
      WHERE p.category_id = ? AND p.id != ? AND p.published = 1
      ORDER BY RANDOM() LIMIT 4
    `).all(product.category_id, product.id);

    const now = new Date().toISOString();
    const hasActivePromo = product.is_promo && product.promo_price &&
      (!product.promo_start || (product.promo_start as string) <= now) &&
      (!product.promo_end || (product.promo_end as string) >= now);

    return NextResponse.json({
      ...product,
      effective_price: hasActivePromo ? product.promo_price : product.price,
      has_active_promo: !!hasActivePromo,
      images,
      variations,
      related
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const db = getDb();
    
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

    const {
      name, description, sku, category_id, price, promo_price, promo_start, promo_end,
      cost_price, stock_quantity, low_stock_threshold, materials, care_instructions,
      weight, dimensions, published, featured, is_new, is_promo, images, variations
    } = body;

    const updateProduct = db.transaction(() => {
      // Price history tracking
      if (price !== undefined || promo_price !== undefined || cost_price !== undefined) {
        db.prepare(`
          INSERT INTO price_history (product_id, old_price, new_price, old_promo_price, new_promo_price, old_cost_price, new_cost_price, changed_by, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Atualização de preço')
        `).run(
          id, existing.price, price ?? existing.price,
          existing.promo_price, promo_price !== undefined ? promo_price : existing.promo_price,
          existing.cost_price, cost_price !== undefined ? cost_price : existing.cost_price,
          user.username
        );
      }

      // Stock movement tracking
      if (stock_quantity !== undefined && stock_quantity !== existing.stock_quantity) {
        const diff = stock_quantity - (existing.stock_quantity as number);
        db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, reason, created_by)
          VALUES (?, ?, ?, ?, ?, 'Ajuste manual via edição de produto', ?)
        `).run(id, diff > 0 ? 'entrada' : 'saida', Math.abs(diff), existing.stock_quantity, stock_quantity, user.username);
      }

      db.prepare(`
        UPDATE products SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          sku = COALESCE(?, sku),
          category_id = COALESCE(?, category_id),
          price = COALESCE(?, price),
          promo_price = ?,
          promo_start = ?,
          promo_end = ?,
          cost_price = ?,
          stock_quantity = COALESCE(?, stock_quantity),
          low_stock_threshold = COALESCE(?, low_stock_threshold),
          materials = COALESCE(?, materials),
          care_instructions = COALESCE(?, care_instructions),
          weight = COALESCE(?, weight),
          dimensions = COALESCE(?, dimensions),
          published = COALESCE(?, published),
          featured = COALESCE(?, featured),
          is_new = COALESCE(?, is_new),
          is_promo = COALESCE(?, is_promo),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        name || null, description ?? null, sku || null, category_id ?? null,
        price ?? null,
        promo_price !== undefined ? promo_price : existing.promo_price,
        promo_start !== undefined ? promo_start : existing.promo_start,
        promo_end !== undefined ? promo_end : existing.promo_end,
        cost_price !== undefined ? cost_price : existing.cost_price,
        stock_quantity ?? null, low_stock_threshold ?? null,
        materials ?? null, care_instructions ?? null,
        weight ?? null, dimensions ?? null,
        published !== undefined ? (published ? 1 : 0) : null,
        featured !== undefined ? (featured ? 1 : 0) : null,
        is_new !== undefined ? (is_new ? 1 : 0) : null,
        is_promo !== undefined ? (is_promo ? 1 : 0) : null,
        id
      );

      // Update images if provided
      if (images !== undefined) {
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
        if (images.length > 0) {
          const insertImage = db.prepare('INSERT INTO product_images (product_id, url, alt, sort_order, is_primary) VALUES (?, ?, ?, ?, ?)');
          images.forEach((img: { url: string; alt?: string }, idx: number) => {
            insertImage.run(id, img.url, img.alt || name || existing.name, idx, idx === 0 ? 1 : 0);
          });
        }
      }

      // Update variations if provided
      if (variations !== undefined) {
        db.prepare('DELETE FROM product_variations WHERE product_id = ?').run(id);
        if (variations.length > 0) {
          const insertVar = db.prepare('INSERT INTO product_variations (product_id, type, value, price_adjustment, stock_quantity, sku_suffix) VALUES (?, ?, ?, ?, ?, ?)');
          variations.forEach((v: { type: string; value: string; price_adjustment?: number; stock_quantity?: number; sku_suffix?: string }) => {
            insertVar.run(id, v.type, v.value, v.price_adjustment || 0, v.stock_quantity || 0, v.sku_suffix || null);
          });
        }
      }

      logAdminAction(user.userId, user.username, 'update_product', 'product', Number(id), name || existing.name as string);
    });

    updateProduct();
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error('Product update error:', e);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();
    
    const orderItems = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(id) as { count: number };
    if (orderItems.count > 0) {
      // Soft delete - just unpublish
      db.prepare('UPDATE products SET published = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id);
      logAdminAction(user.userId, user.username, 'archive_product', 'product', Number(id));
      return NextResponse.json({ success: true, archived: true });
    }
    
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    logAdminAction(user.userId, user.username, 'delete_product', 'product', Number(id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
