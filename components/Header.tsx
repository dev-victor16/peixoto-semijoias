'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { totalItems, totalPrice, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/produtos?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="top-bar">
        <div className="container top-bar-inner">
          <span className="top-bar-announcement">
            ✨ Peixoto Semi Joias • Catálogo Digital com Atendimento Exclusivo no WhatsApp
          </span>
          <div className="top-bar-links">
            <span className="top-bar-pill">Banho Ouro 18k & Prata 925</span>
          </div>
        </div>
      </div>

      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          {/* Logo */}
          <Link href="/" className="header-logo">
            <img
              src="/logo.png"
              alt="Peixoto Semi Joias"
              className="header-logo-img"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="header-logo-text">peixoto</span>
          </Link>

          {/* Navigation Links */}
          <nav className="header-nav">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>Início</Link>
            <Link href="/produtos" className={pathname === '/produtos' ? 'active' : ''}>Catálogo</Link>
            <Link href="/produtos?category=brincos">Brincos</Link>
            <Link href="/produtos?category=colares">Colares</Link>
            <Link href="/produtos?category=aneis">Anéis</Link>
            <Link href="/produtos?category=pulseiras">Pulseiras</Link>
          </nav>

          {/* Actions: Search & Cart Button */}
          <div className="header-actions">
            <div className="header-search">
              <form onSubmit={handleSearch}>
                <span className="header-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar no catálogo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            {/* Shopping Bag Button (Triggers lateral drawer) */}
            <button
              type="button"
              className="header-cart"
              onClick={() => setIsOpen(true)}
              aria-label={`Abrir sacola com ${totalItems} itens`}
              title="Ver sacola de produtos"
            >
              <span className="header-cart-icon">🛍️</span>
              <div className="header-cart-meta">
                <span className="header-cart-title">Sacola</span>
                {totalPrice > 0 && (
                  <span className="header-cart-val">
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
              {totalItems > 0 && (
                <span className="header-cart-count">{totalItems}</span>
              )}
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Slide */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay">
          <form onSubmit={handleSearch} className="mobile-search-form">
            <input
              type="text"
              placeholder="Buscar no catálogo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
            />
          </form>

          <div className="mobile-menu-links">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>Início</Link>
            <Link href="/produtos" onClick={() => setMobileMenuOpen(false)}>Todos os Produtos</Link>
            <Link href="/produtos?category=brincos" onClick={() => setMobileMenuOpen(false)}>Brincos</Link>
            <Link href="/produtos?category=colares" onClick={() => setMobileMenuOpen(false)}>Colares</Link>
            <Link href="/produtos?category=aneis" onClick={() => setMobileMenuOpen(false)}>Anéis</Link>
            <Link href="/produtos?category=pulseiras" onClick={() => setMobileMenuOpen(false)}>Pulseiras</Link>

            <button
              type="button"
              className="mobile-bag-trigger"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsOpen(true);
              }}
            >
              🛍️ Abrir Minha Sacola ({totalItems} itens)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
