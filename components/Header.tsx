'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { totalItems, totalPrice, setIsOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/produtos?search=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false);
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

      {/* 2. Main Header / Cabeçalho Rosa Suave com Logo Centralizada */}
      <header className="ref-header">
        <div className="ref-header-container">
          {/* LADO ESQUERDO: Botão de 3 barrinhas para abrir menu */}
          <div className="ref-header-left">
            <button
              type="button"
              className="ref-menu-trigger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir Menu de Navegação"
              title="Menu"
            >
              <span className="ref-menu-icon-bars">
                <span></span>
                <span></span>
                <span></span>
              </span>
              <span className="ref-menu-label">MENU</span>
            </button>
          </div>

          {/* CENTRO: Logo Oficial Centralizada */}
          <div className="ref-header-center">
            <Link href="/" className="ref-header-logo-center">
              <img
                src="/logo.png"
                alt="Peixoto Semi Joias"
                className="ref-header-logo-img"
              />
              <div className="ref-logo-box">
                <span className="ref-logo-main">peixoto</span>
                <span className="ref-logo-sub">✦ SEMI JOIAS ✦</span>
              </div>
            </Link>
          </div>

          {/* LADO DIREITO: Lupinha e Sacola */}
          <div className="ref-header-right">
            {/* Lupinha com Popover/Input de Busca */}
            <div className="ref-search-wrapper">
              <button
                type="button"
                className={`ref-search-toggle-btn ${searchOpen ? 'active' : ''}`}
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Buscar produtos"
                title="Pesquisar"
              >
                🔍
              </button>

              {searchOpen && (
                <div className="ref-search-popover">
                  <form onSubmit={handleSearch} className="ref-search-popover-form">
                    <input
                      type="text"
                      placeholder="Buscar semijoias..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="ref-search-popover-input"
                      autoFocus
                    />
                    <button type="submit" className="ref-search-popover-submit">
                      Buscar
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Sacola de compras */}
            <button
              type="button"
              className="ref-cart-btn"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir sacola de compras"
              title="Minha Sacola"
            >
              <span className="ref-cart-icon">🛍️</span>
              <div className="ref-cart-info">
                <span className="ref-cart-value">
                  R$ {totalPrice > 0 ? totalPrice.toFixed(2).replace('.', ',') : '0,00'}
                </span>
                {totalItems > 0 && (
                  <span className="ref-cart-badge">{totalItems}</span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Sub-barra de categorias desktop para navegação rápida e limpa */}
        <nav className="ref-header-quick-nav">
          <Link href="/" className={pathname === '/' ? 'active' : ''}>
            ÚLTIMOS LANÇAMENTOS
          </Link>
          <Link href="/produtos?category=brincos">BRINCOS</Link>
          <Link href="/produtos?category=colares">COLARES</Link>
          <Link href="/produtos?category=aneis">ANÉIS</Link>
          <Link href="/produtos?category=pulseiras">PULSEIRAS</Link>
          <Link href="/produtos?category=conjuntos">CONJUNTOS</Link>
        </nav>
      </header>

      {/* 3. Menu Lateral / Drawer de Navegação (Disponível em Desktop e Mobile) */}
      {mobileMenuOpen && (
        <div className="ref-nav-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="ref-nav-drawer" onClick={e => e.stopPropagation()}>
            <div className="ref-nav-drawer-header">
              <span className="ref-nav-drawer-title">CATEGORIAS</span>
              <button
                type="button"
                className="ref-nav-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSearch} className="ref-drawer-search">
              <input
                type="text"
                placeholder="Buscar no catálogo..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ref-drawer-search-input"
              />
              <button type="submit" className="ref-drawer-search-btn">
                🔍
              </button>
            </form>

            <nav className="ref-drawer-links">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <span>✨</span> ÚLTIMOS LANÇAMENTOS
              </Link>
              <Link href="/produtos?category=brincos" onClick={() => setMobileMenuOpen(false)}>
                <span>💎</span> BRINCOS
              </Link>
              <Link href="/produtos?category=colares" onClick={() => setMobileMenuOpen(false)}>
                <span>📿</span> COLARES
              </Link>
              <Link href="/produtos?category=aneis" onClick={() => setMobileMenuOpen(false)}>
                <span>💍</span> ANÉIS
              </Link>
              <Link href="/produtos?category=pulseiras" onClick={() => setMobileMenuOpen(false)}>
                <span>💫</span> PULSEIRAS
              </Link>
              <Link href="/produtos?category=conjuntos" onClick={() => setMobileMenuOpen(false)}>
                <span>👑</span> CONJUNTOS
              </Link>
            </nav>

            <div className="ref-drawer-footer">
              <button
                type="button"
                className="ref-drawer-bag-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsOpen(true);
                }}
              >
                🛍️ MINHA SACOLA ({totalItems} ITENS - R$ {totalPrice.toFixed(2).replace('.', ',')})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
