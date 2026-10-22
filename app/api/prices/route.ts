import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (productId) {
      const history = db.prepare(`
        SELECT ph.*, p.name as product_name, p.sku
        FROM price_history ph
        JOIN products p ON ph.product_id = p.id
        WHERE ph.product_id = ?
        ORDER BY ph.created_at DESC
      `).all(productId);
      return NextResponse.json(history);
    }

    // All products with price info (for admin pricing page)
    const products = db.prepare(`
      SELECT p.id, p.name, p.sku, p.price, p.promo_price, p.promo_start, p.promo_end,
        p.cost_price, p.is_promo, p.published,
        c.name as category_name,
        CASE WHEN p.cost_price > 0 THEN ROUND(((COALESCE(p.promo_price, p.price) - p.cost_price) / COALESCE(p.promo_price, p.price)) * 100, 1) ELSE NULL END as margin_percent,
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) as image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `).all();
    return NextResponse.json(products);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao buscar preços' }, { status: 500 });
  }
}
