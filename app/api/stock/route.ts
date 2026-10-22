import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const lowStock = searchParams.get('low_stock') === '1';
    const outOfStock = searchParams.get('out_of_stock') === '1';

    if (productId) {
      const movements = db.prepare(`
        SELECT sm.*, p.name as product_name, p.sku
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE sm.product_id = ?
        ORDER BY sm.created_at DESC
      `).all(productId);
      return NextResponse.json(movements);
    }

    let query = `
      SELECT p.id, p.name, p.sku, p.stock_quantity, p.low_stock_threshold, p.published,
        c.name as category_name,
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) as image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    if (lowStock) { query += ' AND p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0'; }
    if (outOfStock) { query += ' AND p.stock_quantity = 0'; }
    query += ' ORDER BY p.stock_quantity ASC, p.name ASC';

    const products = db.prepare(query).all();
    return NextResponse.json(products);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao buscar estoque' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { product_id, type, quantity, reason } = body;

    if (!product_id || !type || !quantity) {
      return NextResponse.json({ error: 'Produto, tipo e quantidade são obrigatórios' }, { status: 400 });
    }
    if (!['entrada', 'saida', 'ajuste'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const db = getDb();
    const adjustStock = db.transaction(() => {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as Record<string, unknown> | undefined;
      if (!product) throw new Error('Produto não encontrado');

      const currentQty = product.stock_quantity as number;
      let newQty: number;

      if (type === 'entrada') {
        newQty = currentQty + quantity;
      } else if (type === 'saida') {
        newQty = currentQty - quantity;
        if (newQty < 0) throw new Error('Estoque insuficiente');
      } else {
        newQty = quantity; // ajuste direto
      }

      db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, product_id);
      
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, reason, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(product_id, type, type === 'ajuste' ? Math.abs(newQty - currentQty) : quantity, currentQty, newQty, reason || null, user.username);

      logAdminAction(user.userId, user.username, `stock_${type}`, 'product', product_id, `${type}: ${quantity} | ${reason || ''}`);

      return { product_id, previous: currentQty, current: newQty, type, quantity };
    });

    const result = adjustStock();
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const msg = e instanceof Error ? e.message : 'Erro ao ajustar estoque';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
