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
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.stock_quantity <= 0;
  const hasPromo = Boolean(product.is_promo && product.promo_price && product.promo_price < product.price);
  const effectivePrice = hasPromo && product.promo_price ? product.promo_price : product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: `PX-${product.id}`,
      unit_price: effectivePrice,
      quantity: 1,
      image: product.image_url,
      stock_available: product.stock_quantity
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="product-card">
      <Link href={`/produtos/${product.slug}`} className="product-card-media">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-card-img"
            loading="lazy"
          />
        ) : (
          <div className="product-card-placeholder">
            <span>✨</span>
          </div>
        )}
        {hasPromo && <span className="product-badge-promo">Oferta</span>}
        {isOutOfStock && <span className="product-badge-stock">Sob Consulta</span>}
      </Link>

      <div className="product-card-body">
        {product.category_name && (
          <span className="product-card-category">{product.category_name}</span>
        )}
        <h3 className="product-card-name">
          <Link href={`/produtos/${product.slug}`}>{product.name}</Link>
        </h3>

        <div className="product-card-prices">
          {hasPromo && product.promo_price ? (
            <>
              <span className="product-card-price-promo">
                R$ {product.promo_price.toFixed(2).replace('.', ',')}
              </span>
              <span className="product-card-price-old">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
            </>
          ) : (
            <span className="product-card-price">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`btn btn-block product-card-btn ${isOutOfStock ? 'btn-disabled' : 'btn-primary'}`}
          title={isOutOfStock ? 'Peça sob consulta' : 'Adicionar à sacola de compras'}
        >
          {isOutOfStock ? (
            'Sob Consulta'
          ) : added ? (
            '✓ Adicionado!'
          ) : (
            <>🛍️ Adicionar à Sacola</>
          )}
        </button>
      </div>
    </div>
  );
}
