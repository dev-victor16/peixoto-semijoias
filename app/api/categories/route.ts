import { NextRequest, NextResponse } from 'next/server';
import { getDb, slugify } from '@/lib/db';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === '1';
    const featuredOnly = searchParams.get('featured') === '1';
    
    let query = 'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.published = 1) as product_count FROM categories c WHERE 1=1';
    const params: (string | number)[] = [];
    
    if (activeOnly) { query += ' AND c.active = 1'; }
    if (featuredOnly) { query += ' AND c.featured = 1'; }
    query += ' ORDER BY c.sort_order ASC, c.name ASC';
    
    const categories = db.prepare(query).all(...params);
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description, image_url, sort_order, active, featured } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    
    const db = getDb();
    let slug = slugify(name);
    const existingSlug = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (existingSlug) slug = `${slug}-${Date.now()}`;
    
    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, image_url, sort_order, active, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, slug, description || null, image_url || null, sort_order || 0, active !== false ? 1 : 0, featured ? 1 : 0);
    
    logAdminAction(user.userId, user.username, 'create_category', 'category', result.lastInsertRowid as number, name);
    
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(category, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
