'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';

export interface ProductCardData {
  id: number;
  name: string;
  slug: string;
  price: number;
  promo_price?: number | null;
  is_promo?: number;
  short_description?: string;
  image_url?: string;
  category_name?: string;
  category_slug?: string;
  stock_quantity: number;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState<'ouro' | 'prata'>('ouro');
  const [added, setAdded] = useState(false);

  const effectivePrice = product.promo_price && product.promo_price < product.price
    ? product.promo_price
    : product.price;

  // Calculate 2x without interest installment
  const installmentValue = (effectivePrice / 2).toFixed(2).replace('.', ',');

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: `PX-${product.id}`,
      unit_price: effectivePrice,
      quantity: 1,
      image: product.image_url,
      variation_type: 'Banho',
      variation_value: selectedColor === 'ouro' ? 'Ouro 18k' : 'Prata 925',
      stock_available: product.stock_quantity
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="ref-product-card">
      {/* Product Image Link */}
      <Link href={`/produtos/${product.slug}`} className="ref-product-media">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="ref-product-img"
            loading="lazy"
          />
        ) : (
          <div className="ref-product-placeholder">✨</div>
        )}
      </Link>

      {/* Color Dots */}
      <div className="ref-color-dots">
        <button
          type="button"
          onClick={() => setSelectedColor('ouro')}
          className={`ref-color-dot dot-ouro ${selectedColor === 'ouro' ? 'active' : ''}`}
          title="Banho Ouro 18k"
          aria-label="Ouro 18k"
        />
        <button
          type="button"
          onClick={() => setSelectedColor('prata')}
          className={`ref-color-dot dot-prata ${selectedColor === 'prata' ? 'active' : ''}`}
          title="Prata 925"
          aria-label="Prata 925"
        />
      </div>

      {/* Product Details */}
      <div className="ref-product-body">
        <h3 className="ref-product-name">
          <Link href={`/produtos/${product.slug}`}>{product.name}</Link>
        </h3>

        <div className="ref-product-price">
          R$ {effectivePrice.toFixed(2).replace('.', ',')}
        </div>

        <div className="ref-product-installments">
          2 X DE R$ {installmentValue} SEM JUROS
        </div>

        {/* COMPRAR Button */}
        <button
          type="button"
          onClick={handleBuy}
          className="ref-product-btn"
          title="Adicionar à sacola e finalizar pelo WhatsApp"
        >
          {added ? '✓ ADICIONADO!' : 'COMPRAR'}
        </button>
      </div>
    </div>
  );
}
