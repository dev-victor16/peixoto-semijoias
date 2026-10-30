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
          <div className="ref-product-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8894a8" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </Link>

      {/* Product Details */}
      <div className="ref-product-body">
        <h3 className="ref-product-name">
          <Link href={`/produtos/${product.slug}`}>{product.name}</Link>
        </h3>

        <div className="ref-product-price">
          R$ {effectivePrice.toFixed(2).replace('.', ',')}
        </div>

        <div className="ref-product-installments">
          2x de R$ {installmentValue} sem juros
        </div>

        {/* COMPRAR Button */}
        <button
          type="button"
          onClick={handleBuy}
          className="ref-product-btn"
          title="Adicionar à sacola e consultar no WhatsApp"
        >
          {added ? 'ADICIONADO' : 'COMPRAR'}
        </button>
      </div>
    </div>
  );
}
