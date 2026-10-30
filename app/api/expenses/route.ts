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
      let query = supabase.from('expenses').select('*');
      if (dateFrom) query = query.gte('expense_date', dateFrom);
      if (dateTo) query = query.lte('expense_date', dateTo);
      query = query.order('expense_date', { ascending: false }).order('id', { ascending: false });

      const { data: expenses, error } = await query;
      if (!error && expenses) {
        const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return NextResponse.json({ expenses, total });
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: string[] = [];

    if (dateFrom) {
      query += ' AND expense_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND expense_date <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY expense_date DESC, id DESC';
    const expenses = db.prepare(query).all(...params);

    const total = (db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1 ${
        dateFrom ? ' AND expense_date >= ?' : ''
      } ${dateTo ? ' AND expense_date <= ?' : ''}`
    ).get(...params) as { total: number }).total;

    return NextResponse.json({ expenses, total });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { description, category, amount, expense_date, notes } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { error: 'Descrição e valor são obrigatórios' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Valor da despesa inválido' },
        { status: 400 }
      );
    }

    const dateVal = expense_date || new Date().toISOString().slice(0, 10);
    const catVal = category || 'Geral';

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: newExp, error } = await supabase.from('expenses').insert({
        description,
        category: catVal,
        amount: parsedAmount,
        expense_date: dateVal,
        notes: notes || null
      }).select('*').single();

      if (error || !newExp) throw new Error(error?.message || 'Erro ao criar despesa no Supabase');
      return NextResponse.json({ success: true, expense: newExp });
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO expenses (description, category, amount, expense_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(description, catVal, parsedAmount, dateVal, notes || null);

    return NextResponse.json({
      success: true,
      expense: {
        id: result.lastInsertRowid,
        description,
        category: catVal,
        amount: parsedAmount,
        expense_date: dateVal,
        notes: notes || null
      }
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao salvar despesa' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from('expenses').delete().eq('id', id);
      return NextResponse.json({ success: true });
    }

    // 2. Fallback to SQLite
    const db = getDb();
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 });
  }
}
