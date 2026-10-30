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
      let query = supabase
        .from('products')
        .select(`
          *,
          categories (id, name, slug),
          product_images (id, url, alt, is_primary, sort_order),
          product_variations (id, type, value, price_adjustment, stock_quantity, sku_suffix)
        `);

      if (isNum) {
        query = query.or(`id.eq.${id},slug.eq.${id}`);
      } else {
        query = query.eq('slug', id);
      }

      const { data: supaProd, error } = await query.maybeSingle();

      if (!error && supaProd) {
        const cat = supaProd.categories as { id: number; name: string; slug: string } | null;
        const images = (supaProd.product_images as Array<{ url: string; is_primary: number; sort_order: number }>) || [];
        const variations = supaProd.product_variations || [];

        // Related
        let related: Record<string, unknown>[] = [];
        if (supaProd.category_id) {
          const { data: relData } = await supabase
            .from('products')
            .select(`
              *,
              product_images (url, is_primary, sort_order)
            `)
            .eq('category_id', supaProd.category_id)
            .neq('id', supaProd.id)
            .eq('published', 1)
            .limit(4);

          if (relData) {
            related = relData.map(rp => {
              const rImgs = (rp.product_images as Array<{ url: string; is_primary: number }>) || [];
              return {
                ...rp,
                image: rImgs.find(i => i.is_primary === 1)?.url || rImgs[0]?.url || null
              };
            });
          }
        }

        const now = new Date().toISOString();
        const hasActivePromo = supaProd.is_promo && supaProd.promo_price &&
          (!supaProd.promo_start || (supaProd.promo_start as string) <= now) &&
          (!supaProd.promo_end || (supaProd.promo_end as string) >= now);

        return NextResponse.json({
          ...supaProd,
          category_name: cat?.name || null,
          category_slug: cat?.slug || null,
          effective_price: hasActivePromo ? supaProd.promo_price : supaProd.price,
          has_active_promo: !!hasActivePromo,
          images,
          variations,
          related
        });
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? OR p.slug = ?
    `).get(id, id) as Record<string, unknown> | undefined;
    
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(product.id);
    const variations = db.prepare('SELECT * FROM product_variations WHERE product_id = ? AND active = 1').all(product.id);
    
    // Related products
    const related = db.prepare(`
      SELECT p.*, 
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) as image
      FROM products p
      WHERE p.category_id = ? AND p.id != ? AND p.published = 1
      ORDER BY RANDOM() LIMIT 4
    `).all(product.category_id, product.id);

    const now = new Date().toISOString();
    const hasActivePromo = product.is_promo && product.promo_price &&
      (!product.promo_start || (product.promo_start as string) <= now) &&
      (!product.promo_end || (product.promo_end as string) >= now);

    return NextResponse.json({
      ...product,
      effective_price: hasActivePromo ? product.promo_price : product.price,
      has_active_promo: !!hasActivePromo,
      images,
      variations,
      related
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const {
      name, description, sku, category_id, price, promo_price, promo_start, promo_end,
      cost_price, stock_quantity, low_stock_threshold, materials, care_instructions,
      weight, dimensions, published, featured, is_new, is_promo, images, variations
    } = body;

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: existing, error: existErr } = await supabase.from('products').select('*').eq('id', id).single();
      if (existErr || !existing) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
      }

      // Track price history
      if (price !== undefined || promo_price !== undefined || cost_price !== undefined) {
        await supabase.from('price_history').insert({
          product_id: Number(id),
          old_price: existing.price,
          new_price: price !== undefined ? price : existing.price,
          old_promo_price: existing.promo_price,
          new_promo_price: promo_price !== undefined ? promo_price : existing.promo_price,
          old_cost_price: existing.cost_price,
          new_cost_price: cost_price !== undefined ? cost_price : existing.cost_price,
          changed_by: user.username,
          reason: 'Atualização de preço'
        });
      }

      // Track stock movement
      if (stock_quantity !== undefined && stock_quantity !== existing.stock_quantity) {
        const diff = stock_quantity - existing.stock_quantity;
        await supabase.from('stock_movements').insert({
          product_id: Number(id),
          type: diff > 0 ? 'entrada' : 'saida',
          quantity: Math.abs(diff),
          previous_quantity: existing.stock_quantity,
          new_quantity: stock_quantity,
          reason: 'Ajuste manual via edição de produto',
          created_by: user.username
        });
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (sku !== undefined) updateData.sku = sku;
      if (category_id !== undefined) updateData.category_id = category_id;
      if (price !== undefined) updateData.price = price;
      if (promo_price !== undefined) updateData.promo_price = promo_price;
      if (promo_start !== undefined) updateData.promo_start = promo_start;
      if (promo_end !== undefined) updateData.promo_end = promo_end;
      if (cost_price !== undefined) updateData.cost_price = cost_price;
      if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
      if (low_stock_threshold !== undefined) updateData.low_stock_threshold = low_stock_threshold;
      if (materials !== undefined) updateData.materials = materials;
      if (care_instructions !== undefined) updateData.care_instructions = care_instructions;
      if (weight !== undefined) updateData.weight = weight;
      if (dimensions !== undefined) updateData.dimensions = dimensions;
      if (published !== undefined) updateData.published = published ? 1 : 0;
      if (featured !== undefined) updateData.featured = featured ? 1 : 0;
      if (is_new !== undefined) updateData.is_new = is_new ? 1 : 0;
      if (is_promo !== undefined) updateData.is_promo = is_promo ? 1 : 0;

      const { data: updatedProd, error: updateErr } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (updateErr) {
        console.error('Supabase update error:', updateErr);
        throw new Error(updateErr.message);
      }

      // Update images
      if (images !== undefined) {
        await supabase.from('product_images').delete().eq('product_id', id);
        if (images.length > 0) {
          const imgRows = images.map((img: { url: string; alt?: string }, idx: number) => ({
            product_id: Number(id),
            url: img.url,
            alt: img.alt || name || existing.name,
            sort_order: idx,
            is_primary: idx === 0 ? 1 : 0
          }));
          await supabase.from('product_images').insert(imgRows);
        }
      }

      // Update variations
      if (variations !== undefined) {
        await supabase.from('product_variations').delete().eq('product_id', id);
        if (variations.length > 0) {
          const varRows = variations.map((v: { type: string; value: string; price_adjustment?: number; stock_quantity?: number; sku_suffix?: string }) => ({
            product_id: Number(id),
            type: v.type,
            value: v.value,
            price_adjustment: v.price_adjustment || 0,
            stock_quantity: v.stock_quantity || 0,
            sku_suffix: v.sku_suffix || null
          }));
          await supabase.from('product_variations').insert(varRows);
        }
      }

      logAdminAction(user.userId, user.username, 'update_product', 'product', Number(id), name || existing.name as string);
      return NextResponse.json(updatedProd);
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

    const updateProduct = db.transaction(() => {
      if (price !== undefined || promo_price !== undefined || cost_price !== undefined) {
        db.prepare(`
          INSERT INTO price_history (product_id, old_price, new_price, old_promo_price, new_promo_price, old_cost_price, new_cost_price, changed_by, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Atualização de preço')
        `).run(
          id, existing.price, price ?? existing.price,
          existing.promo_price, promo_price !== undefined ? promo_price : existing.promo_price,
          existing.cost_price, cost_price !== undefined ? cost_price : existing.cost_price,
          user.username
        );
      }

      if (stock_quantity !== undefined && stock_quantity !== existing.stock_quantity) {
        const diff = stock_quantity - (existing.stock_quantity as number);
        db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, reason, created_by)
          VALUES (?, ?, ?, ?, ?, 'Ajuste manual via edição de produto', ?)
        `).run(id, diff > 0 ? 'entrada' : 'saida', Math.abs(diff), existing.stock_quantity, stock_quantity, user.username);
      }

      db.prepare(`
        UPDATE products SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          sku = COALESCE(?, sku),
          category_id = COALESCE(?, category_id),
          price = COALESCE(?, price),
          promo_price = ?,
          promo_start = ?,
          promo_end = ?,
          cost_price = ?,
          stock_quantity = COALESCE(?, stock_quantity),
          low_stock_threshold = COALESCE(?, low_stock_threshold),
          materials = COALESCE(?, materials),
          care_instructions = COALESCE(?, care_instructions),
          weight = COALESCE(?, weight),
          dimensions = COALESCE(?, dimensions),
          published = COALESCE(?, published),
          featured = COALESCE(?, featured),
          is_new = COALESCE(?, is_new),
          is_promo = COALESCE(?, is_promo),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        name || null, description ?? null, sku || null, category_id ?? null,
        price ?? null,
        promo_price !== undefined ? promo_price : existing.promo_price,
        promo_start !== undefined ? promo_start : existing.promo_start,
        promo_end !== undefined ? promo_end : existing.promo_end,
        cost_price !== undefined ? cost_price : existing.cost_price,
        stock_quantity ?? null, low_stock_threshold ?? null,
        materials ?? null, care_instructions ?? null,
        weight ?? null, dimensions ?? null,
        published !== undefined ? (published ? 1 : 0) : null,
        featured !== undefined ? (featured ? 1 : 0) : null,
        is_new !== undefined ? (is_new ? 1 : 0) : null,
        is_promo !== undefined ? (is_promo ? 1 : 0) : null,
        id
      );

      if (images !== undefined) {
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
        if (images.length > 0) {
          const insertImage = db.prepare('INSERT INTO product_images (product_id, url, alt, sort_order, is_primary) VALUES (?, ?, ?, ?, ?)');
          images.forEach((img: { url: string; alt?: string }, idx: number) => {
            insertImage.run(id, img.url, img.alt || name || existing.name, idx, idx === 0 ? 1 : 0);
          });
        }
      }

      if (variations !== undefined) {
        db.prepare('DELETE FROM product_variations WHERE product_id = ?').run(id);
        if (variations.length > 0) {
          const insertVar = db.prepare('INSERT INTO product_variations (product_id, type, value, price_adjustment, stock_quantity, sku_suffix) VALUES (?, ?, ?, ?, ?, ?)');
          variations.forEach((v: { type: string; value: string; price_adjustment?: number; stock_quantity?: number; sku_suffix?: string }) => {
            insertVar.run(id, v.type, v.value, v.price_adjustment || 0, v.stock_quantity || 0, v.sku_suffix || null);
          });
        }
      }

      logAdminAction(user.userId, user.username, 'update_product', 'product', Number(id), name || existing.name as string);
    });

    updateProduct();
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error('Product update error:', e);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { count } = await supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('product_id', id);
      if (count && count > 0) {
        await supabase.from('products').update({ published: 0, updated_at: new Date().toISOString() }).eq('id', id);
        logAdminAction(user.userId, user.username, 'archive_product', 'product', Number(id));
        return NextResponse.json({ success: true, archived: true });
      }

      await supabase.from('product_images').delete().eq('product_id', id);
      await supabase.from('product_variations').delete().eq('product_id', id);
      await supabase.from('products').delete().eq('id', id);
      logAdminAction(user.userId, user.username, 'delete_product', 'product', Number(id));
      return NextResponse.json({ success: true });
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const orderItems = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(id) as { count: number };
    if (orderItems.count > 0) {
      db.prepare('UPDATE products SET published = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id);
      logAdminAction(user.userId, user.username, 'archive_product', 'product', Number(id));
      return NextResponse.json({ success: true, archived: true });
    }
    
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    logAdminAction(user.userId, user.username, 'delete_product', 'product', Number(id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
