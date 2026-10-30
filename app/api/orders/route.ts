import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateOrderNumber } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      let query = supabase.from('orders').select(`
        *,
        order_items (*)
      `, { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (search) {
        query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data: orders, count, error } = await query;
      if (!error && orders) {
        const mapped = orders.map(o => ({
          ...o,
          items: o.order_items || []
        }));
        return NextResponse.json({ orders: mapped, total: count || mapped.length });
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
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
    const body = await request.json();
    const { items, customer_name, customer_phone, customer_notes } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'O pedido precisa ter ao menos um item' }, { status: 400 });
    }

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const validatedItems: {
        product_id: number; product_name: string; product_sku: string;
        variation_type?: string | null; variation_value?: string | null;
        quantity: number; unit_price: number; subtotal: number; image_url?: string | null;
      }[] = [];

      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select(`
            *,
            product_images (url, is_primary, sort_order)
          `)
          .eq('id', item.product_id)
          .eq('published', 1)
          .single();

        if (!product) {
          throw new Error(`Produto não encontrado ou indisponível: ${item.product_id}`);
        }
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para "${product.name}". Disponível: ${product.stock_quantity}`);
        }

        const now = new Date().toISOString();
        const hasActivePromo = product.is_promo && product.promo_price &&
          (!product.promo_start || product.promo_start <= now) &&
          (!product.promo_end || product.promo_end >= now);
        const unitPrice = hasActivePromo ? product.promo_price : product.price;

        const imgs = (product.product_images as Array<{ url: string; is_primary: number; sort_order: number }>) || [];
        const primaryImg = imgs.find(i => i.is_primary === 1)?.url || imgs[0]?.url || null;

        validatedItems.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          variation_type: item.variation_type || null,
          variation_value: item.variation_value || null,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal: unitPrice * item.quantity,
          image_url: primaryImg
        });
      }

      const total = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const orderNumber = generateOrderNumber();

      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          status: 'aguardando_contato',
          customer_name: customer_name || null,
          customer_phone: customer_phone || null,
          customer_notes: customer_notes || null,
          subtotal: total,
          total: total
        })
        .select('*')
        .single();

      if (orderErr || !newOrder) throw new Error(orderErr?.message || 'Erro ao criar pedido no Supabase');

      const itemRows = validatedItems.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        variation_type: item.variation_type,
        variation_value: item.variation_value,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        image_url: item.image_url
      }));

      await supabase.from('order_items').insert(itemRows);
      await supabase.from('order_status_history').insert({
        order_id: newOrder.id,
        new_status: 'aguardando_contato',
        changed_by: 'sistema',
        notes: 'Pedido criado pelo site'
      });

      return NextResponse.json({ orderId: newOrder.id, orderNumber, total, items: validatedItems }, { status: 201 });
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const createOrder = db.transaction(() => {
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

      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, product_sku, variation_type, variation_value, quantity, unit_price, subtotal, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of validatedItems) {
        insertItem.run(orderId, item.product_id, item.product_name, item.product_sku, item.variation_type, item.variation_value, item.quantity, item.unit_price, item.subtotal, item.image_url);
      }

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
