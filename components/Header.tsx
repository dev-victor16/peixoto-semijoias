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
      {/* 1. Top Bar / Faixa Superior: Informativa, limpa e sem cupons inventados */}
      <div className="ref-top-bar">
        <div className="ref-top-bar-container">
          <div className="ref-top-bar-left">
            <span>Catálogo Oficial Peixoto Semi Joias</span>
          </div>

          <div className="ref-top-bar-center">
            <span>Atendimento e Pedidos Exclusivos via WhatsApp • Enviamos para todo o Brasil</span>
          </div>

          <div className="ref-top-bar-right">
            <span>Garantia e Acabamento Premium</span>
          </div>
        </div>
      </div>

      {/* 2. Main Header / Cabeçalho Rosa e Azul Escuro da Marca */}
      <header className="ref-header">
        <div className="ref-header-container">
          {/* LADO ESQUERDO: Botão de Menu Limpo com Ícone SVG */}
          <div className="ref-header-left">
            <button
              type="button"
              className="ref-menu-trigger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir Menu de Navegação"
              title="Menu do catálogo"
            >
              <svg
                width="20"
                height="15"
                viewBox="0 0 20 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="ref-menu-svg-icon"
              >
                <rect width="20" height="2" rx="1" fill="currentColor" />
                <rect y="6.5" width="20" height="2" rx="1" fill="currentColor" />
                <rect y="13" width="20" height="2" rx="1" fill="currentColor" />
              </svg>
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
                <span className="ref-logo-sub">SEMI JOIAS</span>
              </div>
            </Link>
          </div>

          {/* LADO DIREITO: Busca e Sacola com Ícones SVG Vetoriais */}
          <div className="ref-header-right">
            {/* Botão de Busca com Popover */}
            <div className="ref-search-wrapper">
              <button
                type="button"
                className={`ref-search-toggle-btn ${searchOpen ? 'active' : ''}`}
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Buscar produtos no catálogo"
                title="Pesquisar peças"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>

              {searchOpen && (
                <div className="ref-search-popover">
                  <form onSubmit={handleSearch} className="ref-search-popover-form">
                    <input
                      type="text"
                      placeholder="Buscar por peça ou categoria..."
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

            {/* Sacola Lateral */}
            <button
              type="button"
              className="ref-cart-btn"
              onClick={() => setIsOpen(true)}
              aria-label="Visualizar sacola de pedidos"
              title="Minha Sacola"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ref-cart-svg-icon"
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
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

        {/* Sub-barra de categorias desktop */}
        <nav className="ref-header-quick-nav" aria-label="Navegação rápida por categorias">
          <Link href="/" className={pathname === '/' ? 'active' : ''}>
            DESTAQUES
          </Link>
          <Link href="/produtos?category=brincos">BRINCOS</Link>
          <Link href="/produtos?category=colares">COLARES</Link>
          <Link href="/produtos?category=aneis">ANÉIS</Link>
          <Link href="/produtos?category=pulseiras">PULSEIRAS</Link>
          <Link href="/produtos?category=conjuntos">CONJUNTOS</Link>
        </nav>
      </header>

      {/* 3. Menu Lateral / Drawer de Navegação */}
      {mobileMenuOpen && (
        <div className="ref-nav-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="ref-nav-drawer" onClick={e => e.stopPropagation()}>
            <div className="ref-nav-drawer-header">
              <span className="ref-nav-drawer-title">CATEGORIAS</span>
              <button
                type="button"
                className="ref-nav-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu de categorias"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
              <button type="submit" className="ref-drawer-search-btn" aria-label="Pesquisar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </form>

            <nav className="ref-drawer-links" aria-label="Links do catálogo">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                DESTAQUES
              </Link>
              <Link href="/produtos?category=brincos" onClick={() => setMobileMenuOpen(false)}>
                BRINCOS
              </Link>
              <Link href="/produtos?category=colares" onClick={() => setMobileMenuOpen(false)}>
                COLARES
              </Link>
              <Link href="/produtos?category=aneis" onClick={() => setMobileMenuOpen(false)}>
                ANÉIS
              </Link>
              <Link href="/produtos?category=pulseiras" onClick={() => setMobileMenuOpen(false)}>
                PULSEIRAS
              </Link>
              <Link href="/produtos?category=conjuntos" onClick={() => setMobileMenuOpen(false)}>
                CONJUNTOS
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
                VER SACOLA ({totalItems} {totalItems === 1 ? 'ITEM' : 'ITENS'} - R$ {totalPrice.toFixed(2).replace('.', ',')})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
