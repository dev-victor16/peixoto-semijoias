import { NextRequest, NextResponse } from 'next/server';
import { getDb, slugify } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const isNum = !isNaN(Number(id));
      let query = supabase.from('categories').select('*');
      if (isNum) query = query.or(`id.eq.${id},slug.eq.${id}`);
      else query = query.eq('slug', id);

      const { data: category, error } = await query.maybeSingle();
      if (!error && category) return NextResponse.json(category);
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const category = db.prepare('SELECT * FROM categories WHERE id = ? OR slug = ?').get(id, id);
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

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: existing, error: existErr } = await supabase.from('categories').select('*').eq('id', id).single();
      if (existErr || !existing) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (image_url !== undefined) updateData.image_url = image_url;
      if (sort_order !== undefined) updateData.sort_order = sort_order;
      if (active !== undefined) updateData.active = active ? 1 : 0;
      if (featured !== undefined) updateData.featured = featured ? 1 : 0;

      const { data: updated, error } = await supabase.from('categories').update(updateData).eq('id', id).select('*').single();
      if (error) throw new Error(error.message);

      logAdminAction(user.userId, user.username, 'update_category', 'category', Number(id), name || existing.name);
      return NextResponse.json(updated);
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as { id: number; name: string } | undefined;
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

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', id);
      if (count && count > 0) {
        return NextResponse.json({ error: 'Não é possível excluir uma categoria com produtos vinculados' }, { status: 400 });
      }

      await supabase.from('categories').delete().eq('id', id);
      logAdminAction(user.userId, user.username, 'delete_category', 'category', Number(id));
      return NextResponse.json({ success: true });
    }

    // 2. Fallback to SQLite
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
