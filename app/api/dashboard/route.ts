import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

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

    // Custo das mercadorias vendidas (CMV) em pedidos concluídos
    const cogsQuery = `
      SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'concluido' ${dateFilter.replace(/created_at/g, 'o.created_at')}
    `;
    const costOfGoodsSold = (db.prepare(cogsQuery).get(...dateParams) as { total_cost: number }).total_cost;

    // Despesas operacionais do período
    let expenseDateFilter = '';
    const expenseParams: string[] = [];
    if (dateFrom) { expenseDateFilter += " AND expense_date >= ?"; expenseParams.push(dateFrom); }
    if (dateTo) { expenseDateFilter += " AND expense_date <= ?"; expenseParams.push(dateTo); }

    const totalExpenses = (db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1 ${expenseDateFilter}`
    ).get(...expenseParams) as { total: number }).total;

    // Lucro Bruto = Faturamento Concluído - Custo das Peças Vendidas
    const grossProfit = revenue - costOfGoodsSold;

    // Lucro Líquido = Lucro Bruto - Despesas
    const netProfit = grossProfit - totalExpenses;

    // Margem líquida
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;

    // Valor total do inventário em estoque (a preço de custo e a preço de venda)
    const inventoryStats = db.prepare(`
      SELECT 
        COALESCE(SUM(stock_quantity), 0) as total_units,
        COALESCE(SUM(stock_quantity * price), 0) as retail_value,
        COALESCE(SUM(stock_quantity * COALESCE(cost_price, 0)), 0) as cost_value
      FROM products
    `).get() as { total_units: number; retail_value: number; cost_value: number };

    // Top selling products (from completed orders)
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

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT * FROM orders ORDER BY created_at DESC LIMIT 5
    `).all();

    // Orders by day (last 30 days)
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
        revenue,             // Faturamento bruto
        costOfGoodsSold,     // Custo das mercadorias vendidas
        grossProfit,         // Lucro bruto
        totalExpenses,       // Total de gastos
        netProfit,           // Lucro líquido
        netMargin,           // Margem líquida %
        pendingValue,        // Pedidos em andamento
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
