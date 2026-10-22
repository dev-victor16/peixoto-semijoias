import { NextRequest, NextResponse } from 'next/server';
import { getDb, slugify } from '@/lib/db';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar categoria' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, description, image_url, sort_order, active, featured } = body;
    
    const db = getDb();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as { id: number } | undefined;
    if (!existing) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    
    let slug;
    if (name) {
      slug = slugify(name);
      const existingSlug = db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').get(slug, id);
      if (existingSlug) slug = `${slug}-${Date.now()}`;
    }
    
    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        sort_order = COALESCE(?, sort_order),
        active = COALESCE(?, active),
        featured = COALESCE(?, featured),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name || null, slug || null, description ?? null, image_url ?? null, sort_order ?? null, active !== undefined ? (active ? 1 : 0) : null, featured !== undefined ? (featured ? 1 : 0) : null, id);
    
    logAdminAction(user.userId, user.username, 'update_category', 'category', Number(id), name || '');
    
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();
    
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id) as { count: number };
    if (productCount.count > 0) {
      return NextResponse.json({ error: 'Não é possível excluir uma categoria com produtos vinculados' }, { status: 400 });
    }
    
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    logAdminAction(user.userId, user.username, 'delete_category', 'category', Number(id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}
