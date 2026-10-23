'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { totalItems, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
      setSearchOpen(false);
    }
  };

  return (
    <>
      <header className="header" style={scrolled ? { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } : undefined}>
        <div className="header-inner">
          <Link href="/" className="header-logo">
            <img src="/logo.png" alt="Peixoto Semi Joias" className="header-logo-img" style={{ height: '44px', width: 'auto', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="header-logo-text">peixoto</span>
          </Link>

          <nav className="header-nav">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>Início</Link>
            <Link href="/produtos" className={pathname.startsWith('/produtos') ? 'active' : ''}>Produtos</Link>
            <Link href="/produtos?category=brincos">Brincos</Link>
            <Link href="/produtos?category=colares">Colares</Link>
            <Link href="/produtos?category=aneis">Anéis</Link>
            <Link href="/produtos?category=pulseiras">Pulseiras</Link>
          </nav>

          <div className="header-actions">
            <div className="header-search" style={{ display: searchOpen ? 'block' : undefined }}>
              <form onSubmit={handleSearch}>
                <span className="header-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar peças..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </form>
            </div>
            <button
              className="header-cart"
              onClick={() => setIsOpen(true)}
              aria-label="Carrinho"
            >
              🛍️
              {totalItems > 0 && <span className="header-cart-count">{totalItems}</span>}
            </button>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 'var(--header-height)', left: 0, right: 0, bottom: 0,
          background: 'var(--white)', zIndex: 99, padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Buscar peças..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
            />
          </form>
          {[
            { href: '/', label: 'Início' },
            { href: '/produtos', label: 'Todos os Produtos' },
            { href: '/produtos?category=brincos', label: 'Brincos' },
            { href: '/produtos?category=colares', label: 'Colares' },
            { href: '/produtos?category=aneis', label: 'Anéis' },
            { href: '/produtos?category=pulseiras', label: 'Pulseiras' },
            { href: '/produtos?category=conjuntos', label: 'Conjuntos' },
            { href: '/carrinho', label: 'Carrinho' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)',
                fontSize: '1rem', color: 'var(--navy)', fontWeight: 500
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
