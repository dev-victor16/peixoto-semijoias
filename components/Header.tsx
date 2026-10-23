'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { totalItems, totalPrice, setIsOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/produtos?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      {/* 1. Top Bar / Faixa Superior */}
      <div className="ref-top-bar">
        <div className="ref-top-bar-container">
          <div className="ref-top-bar-left">
            <span>(11) 99999-9999</span>
            <span className="ref-top-bar-sep">|</span>
            <span>contato@peixotosemijoias.com.br</span>
          </div>

          <div className="ref-top-bar-center">
            <span>♡ SUA PRIMEIRA VEZ AQUI? USE O CUPOM <strong>PRIMEIRACOMPRA</strong> E GANHE 5% OFF ♡</span>
          </div>

          <div className="ref-top-bar-right">
            <span>Atendimento VIP • WhatsApp</span>
          </div>
        </div>
      </div>

      {/* 2. Main Pink Header / Cabeçalho Rosa */}
      <header className="ref-header">
        <div className="ref-header-container">
          {/* Logo */}
          <Link href="/" className="ref-header-logo">
            <div className="ref-logo-box">
              <span className="ref-logo-main">Peixoto Semi Joias</span>
              <span className="ref-logo-sub">CATÁLOGO EXCLUSIVO</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="ref-header-nav">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>
              ÚLTIMOS LANÇAMENTOS
            </Link>
            <Link href="/produtos?category=brincos">BRINCOS</Link>
            <Link href="/produtos?category=colares">COLARES</Link>
            <Link href="/produtos?category=aneis">ANÉIS</Link>
            <Link href="/produtos?category=pulseiras">PULSEIRAS</Link>
            <Link href="/produtos?category=conjuntos">CONJUNTOS</Link>
          </nav>

          {/* Search Bar & Bag Icon */}
          <div className="ref-header-actions">
            {/* Search Pill Input */}
            <form onSubmit={handleSearch} className="ref-search-form">
              <span className="ref-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ref-search-input"
              />
            </form>

            {/* Shopping Cart / Bag */}
            <button
              type="button"
              className="ref-cart-btn"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir sacola de compras"
              title="Ver sacola de compras"
            >
              <span className="ref-cart-icon">🛒</span>
              <div className="ref-cart-info">
                <span className="ref-cart-value">
                  R$ {totalPrice > 0 ? totalPrice.toFixed(2).replace('.', ',') : '0,00'}
                </span>
                {totalItems > 0 && (
                  <span className="ref-cart-badge">{totalItems}</span>
                )}
              </div>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="ref-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="ref-mobile-menu">
          <form onSubmit={handleSearch} className="ref-mobile-search">
            <input
              type="text"
              placeholder="Buscar semijoias..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ref-search-input"
            />
          </form>

          <nav className="ref-mobile-nav">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>ÚLTIMOS LANÇAMENTOS</Link>
            <Link href="/produtos?category=brincos" onClick={() => setMobileMenuOpen(false)}>BRINCOS</Link>
            <Link href="/produtos?category=colares" onClick={() => setMobileMenuOpen(false)}>COLARES</Link>
            <Link href="/produtos?category=aneis" onClick={() => setMobileMenuOpen(false)}>ANÉIS</Link>
            <Link href="/produtos?category=pulseiras" onClick={() => setMobileMenuOpen(false)}>PULSEIRAS</Link>
            <Link href="/produtos?category=conjuntos" onClick={() => setMobileMenuOpen(false)}>CONJUNTOS</Link>

            <button
              type="button"
              className="ref-mobile-bag-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsOpen(true);
              }}
            >
              🛒 ABRIR SACOLA ({totalItems} ITENS - R$ {totalPrice.toFixed(2).replace('.', ',')})
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
