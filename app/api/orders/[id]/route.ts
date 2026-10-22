import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id) as Record<string, unknown> | undefined;
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC').all(order.id);
    
    return NextResponse.json({ ...order, items, history });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { status, admin_notes, customer_name, customer_phone } = body;
    
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const validStatuses = [
      'aguardando_contato', 'em_atendimento', 'aguardando_confirmacao',
      'confirmado', 'em_preparacao', 'concluido', 'cancelado'
    ];

    const updateOrder = db.transaction(() => {
      if (status && status !== order.status) {
        if (!validStatuses.includes(status)) {
          throw new Error('Status inválido');
        }

        // Stock logic for status changes
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as Record<string, unknown>[];
        
        // When confirming: deduct stock
        if (status === 'confirmado' && order.status !== 'confirmado') {
          for (const item of items) {
            const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as Record<string, unknown>;
            if (product) {
              const newQty = (product.stock_quantity as number) - (item.quantity as number);
              if (newQty < 0) {
                throw new Error(`Estoque insuficiente para "${item.product_name}". Disponível: ${product.stock_quantity}`);
              }
              db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, item.product_id);
              db.prepare(`
                INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
                VALUES (?, 'saida', ?, ?, ?, ?, 'order', ?, ?)
              `).run(item.product_id, item.quantity, product.stock_quantity, newQty, `Pedido ${order.order_number} confirmado`, order.id, user.username);
            }
          }
        }

        // When canceling a confirmed order: restore stock
        if (status === 'cancelado' && ['confirmado', 'em_preparacao'].includes(order.status as string)) {
          for (const item of items) {
            const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as Record<string, unknown>;
            if (product) {
              const newQty = (product.stock_quantity as number) + (item.quantity as number);
              db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, item.product_id);
              db.prepare(`
                INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
                VALUES (?, 'entrada', ?, ?, ?, ?, 'order', ?, ?)
              `).run(item.product_id, item.quantity, product.stock_quantity, newQty, `Pedido ${order.order_number} cancelado - estorno`, order.id, user.username);
            }
          }
        }

        db.prepare('UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
        db.prepare(`
          INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, order.status, status, user.username, admin_notes || null);
      }

      if (admin_notes !== undefined) {
        db.prepare('UPDATE orders SET admin_notes = ?, updated_at = datetime(\'now\') WHERE id = ?').run(admin_notes, id);
      }
      if (customer_name !== undefined) {
        db.prepare('UPDATE orders SET customer_name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(customer_name, id);
      }
      if (customer_phone !== undefined) {
        db.prepare('UPDATE orders SET customer_phone = ?, updated_at = datetime(\'now\') WHERE id = ?').run(customer_phone, id);
      }

      logAdminAction(user.userId, user.username, 'update_order', 'order', Number(id), `Status: ${status || order.status}`);
    });

    updateOrder();
    
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const updatedItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    const updatedHistory = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC').all(id);
    
    return NextResponse.json({ ...updated as object, items: updatedItems, history: updatedHistory });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar pedido';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
