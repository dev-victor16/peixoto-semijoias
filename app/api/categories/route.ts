import { NextRequest, NextResponse } from 'next/server';
import { getDb, slugify } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === '1';
    const featuredOnly = searchParams.get('featured') === '1';

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      let query = supabase.from('categories').select('*');
      if (activeOnly) query = query.eq('active', 1);
      if (featuredOnly) query = query.eq('featured', 1);
      query = query.order('sort_order', { ascending: true }).order('name', { ascending: true });

      const { data: cats, error } = await query;
      if (!error && cats) {
        // Count products for each category
        const { data: prodCounts } = await supabase.from('products').select('category_id').eq('published', 1);
        const countMap: Record<number, number> = {};
        if (prodCounts) {
          prodCounts.forEach((p: { category_id: number | null }) => {
            if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
          });
        }
        const enriched = cats.map(c => ({
          ...c,
          product_count: countMap[c.id] || 0
        }));
        return NextResponse.json(enriched);
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
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

    let slug = slugify(name);

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: existingSlug } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle();
      if (existingSlug) slug = `${slug}-${Date.now().toString().slice(-4)}`;

      const { data: newCat, error } = await supabase.from('categories').insert({
        name,
        slug,
        description: description || null,
        image_url: image_url || null,
        sort_order: sort_order || 0,
        active: active !== false ? 1 : 0,
        featured: featured ? 1 : 0
      }).select('*').single();

      if (error || !newCat) {
        throw new Error(error?.message || 'Erro ao criar categoria no Supabase');
      }

      logAdminAction(user.userId, user.username, 'create_category', 'category', newCat.id, name);
      return NextResponse.json(newCat, { status: 201 });
    }

    // 2. Fallback to SQLite
    const db = getDb();
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
