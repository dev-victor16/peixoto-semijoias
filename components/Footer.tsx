'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Settings { [key: string]: string }

export default function Footer() {
  const [s, setS] = useState<Settings>({});

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setS).catch(() => {});
  }, []);

  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-brand-name">{s.store_name || 'Peixoto Semi Joias'}</div>
          <p>{s.store_description || 'Semijoias exclusivas com design sofisticado e elegante.'}</p>
          <div className="footer-social">
            {s.instagram && (
              <a href={`https://instagram.com/${s.instagram?.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram">📷</a>
            )}
            {s.whatsapp_number && (
              <a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">💬</a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} aria-label="Email">✉️</a>
            )}
          </div>
        </div>
        <div>
          <div className="footer-title">Categorias</div>
          <ul className="footer-links">
            <li><Link href="/produtos?category=brincos">Brincos</Link></li>
            <li><Link href="/produtos?category=colares">Colares</Link></li>
            <li><Link href="/produtos?category=aneis">Anéis</Link></li>
            <li><Link href="/produtos?category=pulseiras">Pulseiras</Link></li>
            <li><Link href="/produtos?category=conjuntos">Conjuntos</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-title">Informações</div>
          <ul className="footer-links">
            <li><Link href="/produtos">Todos os Produtos</Link></li>
            <li><Link href="/produtos?is_new=1">Lançamentos</Link></li>
            <li><Link href="/produtos?is_promo=1">Promoções</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-title">Atendimento</div>
          <ul className="footer-links">
            {s.whatsapp_number && <li><a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            {s.email && <li><a href={`mailto:${s.email}`}>{s.email}</a></li>}
            {s.instagram && <li><a href={`https://instagram.com/${s.instagram?.replace('@', '')}`} target="_blank" rel="noopener noreferrer">{s.instagram}</a></li>}
          </ul>
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--gray-400)', lineHeight: 1.6 }}>
            {s.warranty_info && <p>{s.warranty_info}</p>}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} {s.store_name || 'Peixoto Semi Joias'}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
