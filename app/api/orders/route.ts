import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateOrderNumber } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) {
      query += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (dateFrom) { query += ' AND created_at >= ?'; params.push(dateFrom); }
    if (dateTo) { query += ' AND created_at <= ?'; params.push(dateTo + ' 23:59:59'); }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const orders = db.prepare(query).all(...params) as Record<string, unknown>[];
    
    // Get items for each order
    const ordersWithItems = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      return { ...order, items };
    });

    return NextResponse.json({ orders: ordersWithItems, total: totalResult.total });
  } catch (e) {
    console.error('Orders GET error:', e);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { items, customer_name, customer_phone, customer_notes } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'O pedido precisa ter ao menos um item' }, { status: 400 });
    }

    const createOrder = db.transaction(() => {
      // Validate all items
      const validatedItems: {
        product_id: number; product_name: string; product_sku: string;
        variation_type?: string | null; variation_value?: string | null;
        quantity: number; unit_price: number; subtotal: number; image_url?: string | null;
      }[] = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND published = 1').get(item.product_id) as Record<string, unknown> | undefined;
        if (!product) {
          throw new Error(`Produto não encontrado ou indisponível: ${item.product_id}`);
        }
        
        if ((product.stock_quantity as number) < item.quantity) {
          throw new Error(`Estoque insuficiente para "${product.name}". Disponível: ${product.stock_quantity}`);
        }

        // Calculate effective price
        const now = new Date().toISOString();
        const hasActivePromo = product.is_promo && product.promo_price &&
          (!product.promo_start || (product.promo_start as string) <= now) &&
          (!product.promo_end || (product.promo_end as string) >= now);
        const unitPrice = hasActivePromo ? product.promo_price as number : product.price as number;

        const primaryImage = db.prepare(
          'SELECT url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC LIMIT 1'
        ).get(product.id) as { url: string } | undefined;

        validatedItems.push({
          product_id: product.id as number,
          product_name: product.name as string,
          product_sku: product.sku as string,
          variation_type: item.variation_type || null,
          variation_value: item.variation_value || null,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal: unitPrice * item.quantity,
          image_url: primaryImage?.url || null,
        });
      }

      const total = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const orderNumber = generateOrderNumber();

      const orderResult = db.prepare(`
        INSERT INTO orders (order_number, status, customer_name, customer_phone, customer_notes, subtotal, total)
        VALUES (?, 'aguardando_contato', ?, ?, ?, ?, ?)
      `).run(orderNumber, customer_name || null, customer_phone || null, customer_notes || null, total, total);

      const orderId = orderResult.lastInsertRowid as number;

      // Insert items
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, product_sku, variation_type, variation_value, quantity, unit_price, subtotal, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of validatedItems) {
        insertItem.run(orderId, item.product_id, item.product_name, item.product_sku, item.variation_type, item.variation_value, item.quantity, item.unit_price, item.subtotal, item.image_url);
      }

      // Status history
      db.prepare(`
        INSERT INTO order_status_history (order_id, new_status, changed_by, notes)
        VALUES (?, 'aguardando_contato', 'sistema', 'Pedido criado pelo site')
      `).run(orderId);

      return { orderId, orderNumber, total, items: validatedItems };
    });

    const result = createOrder();
    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar pedido';
    console.error('Order create error:', e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
