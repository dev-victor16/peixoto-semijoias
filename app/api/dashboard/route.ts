import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      // Products
      const { data: allProds } = await supabase.from('products').select('*');
      const products = allProds || [];
      const totalProducts = products.length;
      const publishedProducts = products.filter(p => p.published === 1).length;
      const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length;
      const outOfStockProducts = products.filter(p => p.stock_quantity === 0 && p.published === 1).length;

      // Inventory stats
      const totalUnits = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
      const retailValue = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0);
      const costValue = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0);

      // Orders
      let ordersQuery = supabase.from('orders').select('*, order_items(*)');
      if (dateFrom) ordersQuery = ordersQuery.gte('created_at', dateFrom);
      if (dateTo) ordersQuery = ordersQuery.lte('created_at', dateTo + 'T23:59:59');

      const { data: allOrders } = await ordersQuery;
      const orders = allOrders || [];
      const totalOrders = orders.length;
      const awaitingContact = orders.filter(o => o.status === 'aguardando_contato').length;
      const inService = orders.filter(o => o.status === 'em_atendimento').length;
      const confirmed = orders.filter(o => o.status === 'confirmado').length;
      const completed = orders.filter(o => o.status === 'concluido').length;
      const cancelled = orders.filter(o => o.status === 'cancelado').length;

      const completedOrders = orders.filter(o => o.status === 'concluido');
      const revenue = completedOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
      const pendingOrders = orders.filter(o => !['concluido', 'cancelado'].includes(o.status));
      const pendingValue = pendingOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

      // Cost of goods sold (CMV) from completed orders
      let costOfGoodsSold = 0;
      const prodMap = new Map(products.map(p => [p.id, p]));
      const topSellingMap = new Map<number, { name: string; sku: string; sold: number; revenue: number; image: string | null }>();

      completedOrders.forEach(o => {
        const items = (o.order_items as Array<{ product_id: number; product_name: string; product_sku: string; quantity: number; subtotal: number; image_url: string | null }>) || [];
        items.forEach(it => {
          const prod = prodMap.get(it.product_id);
          const unitCost = prod?.cost_price || 0;
          costOfGoodsSold += it.quantity * unitCost;

          const current = topSellingMap.get(it.product_id) || {
            name: it.product_name,
            sku: it.product_sku,
            sold: 0,
            revenue: 0,
            image: it.image_url
          };
          current.sold += it.quantity;
          current.revenue += Number(it.subtotal) || 0;
          topSellingMap.set(it.product_id, current);
        });
      });

      // Expenses
      let expQuery = supabase.from('expenses').select('*');
      if (dateFrom) expQuery = expQuery.gte('expense_date', dateFrom);
      if (dateTo) expQuery = expQuery.lte('expense_date', dateTo);
      const { data: expenses } = await expQuery;
      const totalExpenses = (expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      const grossProfit = revenue - costOfGoodsSold;
      const netProfit = grossProfit - totalExpenses;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      // Top products array
      const topProducts = Array.from(topSellingMap.values())
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10)
        .map(t => ({
          product_name: t.name,
          product_sku: t.sku,
          total_sold: t.sold,
          total_revenue: t.revenue,
          image_url: t.image
        }));

      // Recent orders (last 5)
      const { data: recentOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);

      // Orders by day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: lastMonthOrders } = await supabase.from('orders').select('created_at, total').gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true });

      const dayMap: Record<string, { count: number; total: number }> = {};
      (lastMonthOrders || []).forEach(o => {
        const d = (o.created_at as string).slice(0, 10);
        if (!dayMap[d]) dayMap[d] = { count: 0, total: 0 };
        dayMap[d].count += 1;
        dayMap[d].total += Number(o.total) || 0;
      });

      const ordersByDay = Object.entries(dayMap).map(([date, val]) => ({
        date,
        count: val.count,
        total: val.total
      }));

      return NextResponse.json({
        products: { total: totalProducts, published: publishedProducts, lowStock: lowStockProducts, outOfStock: outOfStockProducts },
        orders: { total: totalOrders, awaitingContact, inService, confirmed, completed, cancelled },
        financial: {
          revenue,
          costOfGoodsSold,
          grossProfit,
          totalExpenses,
          netProfit,
          netMargin,
          pendingValue,
          inventory: { total_units: totalUnits, retail_value: retailValue, cost_value: costValue }
        },
        topProducts,
        recentOrders: recentOrders || [],
        ordersByDay
      });
    }

    // 2. Fallback to SQLite
    const db = getDb();
    let dateFilter = '';
    const dateParams: string[] = [];
    if (dateFrom) { dateFilter += " AND created_at >= ?"; dateParams.push(dateFrom); }
    if (dateTo) { dateFilter += " AND created_at <= ?"; dateParams.push(dateTo + ' 23:59:59'); }

    const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
    const publishedProducts = (db.prepare('SELECT COUNT(*) as c FROM products WHERE published = 1').get() as { c: number }).c;
    const lowStockProducts = (db.prepare('SELECT COUNT(*) as c FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0').get() as { c: number }).c;
    const outOfStockProducts = (db.prepare('SELECT COUNT(*) as c FROM products WHERE stock_quantity = 0 AND published = 1').get() as { c: number }).c;

    const totalOrders = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE 1=1 ${dateFilter}`).get(...dateParams) as { c: number }).c;
    const awaitingContact = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'aguardando_contato' ${dateFilter}`).get(...dateParams) as { c: number }).c;
    const inService = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'em_atendimento' ${dateFilter}`).get(...dateParams) as { c: number }).c;
    const confirmed = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'confirmado' ${dateFilter}`).get(...dateParams) as { c: number }).c;
    const completed = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'concluido' ${dateFilter}`).get(...dateParams) as { c: number }).c;
    const cancelled = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'cancelado' ${dateFilter}`).get(...dateParams) as { c: number }).c;

    const revenue = (db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'concluido' ${dateFilter}`).get(...dateParams) as { total: number }).total;
    const pendingValue = (db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status NOT IN ('concluido', 'cancelado') ${dateFilter}`).get(...dateParams) as { total: number }).total;

    const cogsQuery = `
      SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'concluido' ${dateFilter.replace(/created_at/g, 'o.created_at')}
    `;
    const costOfGoodsSold = (db.prepare(cogsQuery).get(...dateParams) as { total_cost: number }).total_cost;

    let expenseDateFilter = '';
    const expenseParams: string[] = [];
    if (dateFrom) { expenseDateFilter += " AND expense_date >= ?"; expenseParams.push(dateFrom); }
    if (dateTo) { expenseDateFilter += " AND expense_date <= ?"; expenseParams.push(dateTo); }

    const totalExpenses = (db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1 ${expenseDateFilter}`
    ).get(...expenseParams) as { total: number }).total;

    const grossProfit = revenue - costOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;

    const inventoryStats = db.prepare(`
      SELECT 
        COALESCE(SUM(stock_quantity), 0) as total_units,
        COALESCE(SUM(stock_quantity * price), 0) as retail_value,
        COALESCE(SUM(stock_quantity * COALESCE(cost_price, 0)), 0) as cost_value
      FROM products
    `).get() as { total_units: number; retail_value: number; cost_value: number };

    const topProducts = db.prepare(`
      SELECT oi.product_name, oi.product_sku, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as total_revenue,
        oi.image_url
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'concluido' ${dateFilter.replace(/created_at/g, 'o.created_at')}
      GROUP BY oi.product_id
      ORDER BY total_sold DESC
      LIMIT 10
    `).all(...dateParams);

    const recentOrders = db.prepare(`
      SELECT * FROM orders ORDER BY created_at DESC LIMIT 5
    `).all();

    const ordersByDay = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as total
      FROM orders
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    return NextResponse.json({
      products: { total: totalProducts, published: publishedProducts, lowStock: lowStockProducts, outOfStock: outOfStockProducts },
      orders: { total: totalOrders, awaitingContact, inService, confirmed, completed, cancelled },
      financial: {
        revenue,
        costOfGoodsSold,
        grossProfit,
        totalExpenses,
        netProfit,
        netMargin,
        pendingValue,
        inventory: inventoryStats
      },
      topProducts,
      recentOrders,
      ordersByDay,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao buscar dashboard' }, { status: 500 });
  }
}
