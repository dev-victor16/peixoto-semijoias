import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const { items } = await request.json();
    
    if (!items || items.length === 0) {
      return NextResponse.json({ valid: false, error: 'Carrinho vazio' }, { status: 400 });
    }

    const validatedItems: Record<string, unknown>[] = [];
    const warnings: string[] = [];
    let hasChanges = false;

    for (const item of items) {
      const product = db.prepare(`
        SELECT p.*, 
          (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) as image
        FROM products p WHERE p.id = ? AND p.published = 1
      `).get(item.product_id) as Record<string, unknown> | undefined;

      if (!product) {
        warnings.push(`"${item.product_name || 'Produto'}" não está mais disponível`);
        hasChanges = true;
        continue;
      }

      const now = new Date().toISOString();
      const hasActivePromo = product.is_promo && product.promo_price &&
        (!product.promo_start || (product.promo_start as string) <= now) &&
        (!product.promo_end || (product.promo_end as string) >= now);
      const currentPrice = hasActivePromo ? product.promo_price as number : product.price as number;

      let quantity = item.quantity;
      if ((product.stock_quantity as number) === 0) {
        warnings.push(`"${product.name}" está esgotado`);
        hasChanges = true;
        continue;
      }
      if (quantity > (product.stock_quantity as number)) {
        quantity = product.stock_quantity as number;
        warnings.push(`Quantidade de "${product.name}" ajustada para ${quantity} (estoque disponível)`);
        hasChanges = true;
      }
      if (currentPrice !== item.unit_price) {
        warnings.push(`Preço de "${product.name}" foi atualizado`);
        hasChanges = true;
      }

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        variation_type: item.variation_type || null,
        variation_value: item.variation_value || null,
        quantity,
        unit_price: currentPrice,
        subtotal: currentPrice * quantity,
        image: product.image,
        stock_available: product.stock_quantity,
      });
    }

    const total = validatedItems.reduce((sum, item) => sum + (item.subtotal as number), 0);

    return NextResponse.json({
      valid: validatedItems.length > 0,
      items: validatedItems,
      total,
      warnings,
      hasChanges,
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao validar carrinho' }, { status: 500 });
  }
}
