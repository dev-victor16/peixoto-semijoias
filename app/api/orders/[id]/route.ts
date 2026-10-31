import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const isNum = !isNaN(Number(id));
      let query = supabase.from('orders').select(`
        *,
        order_items (*),
        order_status_history (*)
      `);
      if (isNum) query = query.or(`id.eq.${id},order_number.eq.${id}`);
      else query = query.eq('order_number', id);

      const { data: order, error } = await query.maybeSingle();
      if (!error && order) {
        return NextResponse.json({
          ...order,
          items: order.order_items || [],
          history: order.order_status_history || []
        });
      }
    }

    // 2. Fallback to SQLite
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
    const { status, admin_notes, customer_name, customer_phone, payment_method, payment_status } = body;

    const validStatuses = [
      'aguardando_contato', 'em_atendimento', 'aguardando_confirmacao',
      'confirmado', 'em_preparacao', 'concluido', 'cancelado'
    ];

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: order, error: ordErr } = await supabase.from('orders').select('*').eq('id', id).single();
      if (ordErr || !order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

      if (status && status !== order.status) {
        if (!validStatuses.includes(status)) throw new Error('Status inválido');

        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);

        // Confirming: deduct stock
        if (status === 'confirmado' && order.status !== 'confirmado' && items) {
          for (const item of items) {
            const { data: product } = await supabase.from('products').select('*').eq('id', item.product_id).single();
            if (product) {
              const newQty = product.stock_quantity - item.quantity;
              if (newQty < 0) {
                throw new Error(`Estoque insuficiente para "${item.product_name}". Disponível: ${product.stock_quantity}`);
              }
              await supabase.from('products').update({ stock_quantity: newQty, updated_at: new Date().toISOString() }).eq('id', item.product_id);
              await supabase.from('stock_movements').insert({
                product_id: item.product_id,
                type: 'saida',
                quantity: item.quantity,
                previous_quantity: product.stock_quantity,
                new_quantity: newQty,
                reason: `Pedido ${order.order_number} confirmado`,
                reference_type: 'order',
                reference_id: order.id,
                created_by: user.username
              });
            }
          }
        }

        // Canceling confirmed: restore stock
        if (status === 'cancelado' && ['confirmado', 'em_preparacao'].includes(order.status) && items) {
          for (const item of items) {
            const { data: product } = await supabase.from('products').select('*').eq('id', item.product_id).single();
            if (product) {
              const newQty = product.stock_quantity + item.quantity;
              await supabase.from('products').update({ stock_quantity: newQty, updated_at: new Date().toISOString() }).eq('id', item.product_id);
              await supabase.from('stock_movements').insert({
                product_id: item.product_id,
                type: 'entrada',
                quantity: item.quantity,
                previous_quantity: product.stock_quantity,
                new_quantity: newQty,
                reason: `Pedido ${order.order_number} cancelado - estorno`,
                reference_type: 'order',
                reference_id: order.id,
                created_by: user.username
              });
            }
          }
        }

        await supabase.from('order_status_history').insert({
          order_id: Number(id),
          old_status: order.status,
          new_status: status,
          changed_by: user.username,
          notes: admin_notes || null
        });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (status !== undefined) updateData.status = status;
      if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
      if (customer_name !== undefined) updateData.customer_name = customer_name;
      if (customer_phone !== undefined) updateData.customer_phone = customer_phone;
      if (payment_method !== undefined) updateData.payment_method = payment_method;
      if (payment_status !== undefined) updateData.payment_status = payment_status;

      const { data: updated } = await supabase.from('orders').update(updateData).eq('id', id).select('*').single();
      const { data: updatedItems } = await supabase.from('order_items').select('*').eq('order_id', id);
      const { data: updatedHist } = await supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at', { ascending: true });

      logAdminAction(user.userId, user.username, 'update_order', 'order', Number(id), `Status: ${status || order.status}`);
      return NextResponse.json({ ...updated, items: updatedItems || [], history: updatedHist || [] });
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const updateOrder = db.transaction(() => {
      if (status && status !== order.status) {
        if (!validStatuses.includes(status)) {
          throw new Error('Status inválido');
        }

        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as Record<string, unknown>[];
        
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
      if (payment_method !== undefined) {
        db.prepare('UPDATE orders SET payment_method = ?, updated_at = datetime(\'now\') WHERE id = ?').run(payment_method, id);
      }
      if (payment_status !== undefined) {
        db.prepare('UPDATE orders SET payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(payment_status, id);
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
      if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

      // Se o pedido estava confirmado ou em preparação, estorna o estoque antes de excluir
      if (['confirmado', 'em_preparacao'].includes(order.status)) {
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
        if (items) {
          for (const item of items) {
            const { data: product } = await supabase.from('products').select('*').eq('id', item.product_id).single();
            if (product) {
              const newQty = product.stock_quantity + item.quantity;
              await supabase.from('products').update({ stock_quantity: newQty, updated_at: new Date().toISOString() }).eq('id', item.product_id);
              await supabase.from('stock_movements').insert({
                product_id: item.product_id,
                type: 'entrada',
                quantity: item.quantity,
                previous_quantity: product.stock_quantity,
                new_quantity: newQty,
                reason: `Pedido ${order.order_number} excluído - estorno de estoque`,
                reference_type: 'order',
                reference_id: order.id,
                created_by: user.username
              });
            }
          }
        }
      }

      // Exclui itens associados, histórico e pedido
      await supabase.from('order_items').delete().eq('order_id', id);
      await supabase.from('order_status_history').delete().eq('order_id', id);
      const { error: delErr } = await supabase.from('orders').delete().eq('id', id);
      if (delErr) throw new Error(delErr.message);

      logAdminAction(user.userId, user.username, 'delete_order', 'order', Number(id), `Pedido ${order.order_number} excluído`);
      return NextResponse.json({ success: true, message: 'Pedido excluído com sucesso' });
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const deleteOrderTx = db.transaction(() => {
      // Estorna estoque se necessário
      if (['confirmado', 'em_preparacao'].includes(order.status as string)) {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as Record<string, unknown>[];
        for (const item of items) {
          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as Record<string, unknown>;
          if (product) {
            const newQty = (product.stock_quantity as number) + (item.quantity as number);
            db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, item.product_id);
            db.prepare(`
              INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
              VALUES (?, 'entrada', ?, ?, ?, ?, 'order', ?, ?)
            `).run(item.product_id, item.quantity, product.stock_quantity, newQty, `Pedido ${order.order_number} excluído - estorno de estoque`, id, user.username);
          }
        }
      }

      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
      db.prepare('DELETE FROM order_status_history WHERE order_id = ?').run(id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(id);

      logAdminAction(user.userId, user.username, 'delete_order', 'order', Number(id), `Pedido ${order.order_number} excluído`);
    });

    deleteOrderTx();
    return NextResponse.json({ success: true, message: 'Pedido excluído com sucesso' });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const msg = e instanceof Error ? e.message : 'Erro ao excluir pedido';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
