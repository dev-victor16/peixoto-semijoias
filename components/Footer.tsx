'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface StoreSettings {
  whatsapp_number?: string;
  email?: string;
  store_name?: string;
}

export default function Footer() {
  const [settings, setSettings] = useState<StoreSettings>({
    whatsapp_number: '(11) 99999-9999',
    email: 'contato@peixotosemijoias.com.br',
    store_name: 'Peixoto Semi Joias'
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setSettings(prev => ({
            ...prev,
            whatsapp_number: data.whatsapp_number || prev.whatsapp_number,
            email: data.email || prev.email,
            store_name: data.store_name || prev.store_name
          }));
        }
      })
      .catch(() => {});
  }, []);

  const pathname = usePathname();

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="ref-footer">
      <div className="ref-footer-container">
        {/* Coluna 1: Navegação do Catálogo */}
        <div className="ref-footer-col">
          <h4 className="ref-footer-heading">CATÁLOGO</h4>
          <ul className="ref-footer-links">
            <li><Link href="/">DESTAQUES</Link></li>
            <li><Link href="/produtos?category=brincos">BRINCOS</Link></li>
            <li><Link href="/produtos?category=colares">COLARES</Link></li>
            <li><Link href="/produtos?category=aneis">ANÉIS</Link></li>
            <li><Link href="/produtos?category=pulseiras">PULSEIRAS</Link></li>
            <li><Link href="/produtos?category=conjuntos">CONJUNTOS</Link></li>
          </ul>
        </div>

        {/* Coluna 2: Como Funciona o Catálogo */}
        <div className="ref-footer-col">
          <h4 className="ref-footer-heading">COMO COMPRAR</h4>
          <p className="ref-footer-text">
            Selecione suas semijoias favoritas no catálogo e adicione à sacola. A finalização do pedido, confirmação de disponibilidade e opções de envio são combinadas diretamente pelo WhatsApp.
          </p>
          <div className="ref-catalog-badge">
            <span>Atendimento 100% via WhatsApp</span>
          </div>
        </div>

        {/* Coluna 3: Atendimento e Contato */}
        <div className="ref-footer-col">
          <h4 className="ref-footer-heading">ATENDIMENTO</h4>
          <ul className="ref-footer-contact">
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ref-contact-svg">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{settings.whatsapp_number}</span>
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ref-contact-svg">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{settings.email}</span>
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ref-contact-svg">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Atendimento online com envio para todo o Brasil</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Barra Inferior de Direitos */}
      <div className="ref-footer-bottom">
        <div className="ref-footer-container ref-bottom-inner">
          <span>&copy; {new Date().getFullYear()} {settings.store_name}. Todos os direitos reservados.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="ref-bottom-credit">Catálogo Digital Oficial</span>
            <Link href="/admin" style={{ opacity: 0.4, fontSize: '0.65rem' }} title="Área Restrita">
              🔒 Área Administrativa
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
