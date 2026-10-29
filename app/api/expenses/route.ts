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
    const db = getDb();
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
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 });
  }
}
