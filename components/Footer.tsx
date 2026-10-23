'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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

  return (
    <footer className="ref-footer">
      <div className="ref-footer-container">
        {/* Column 1: Navegação */}
        <div className="ref-footer-col">
          <h4 className="ref-footer-heading">NAVEGAÇÃO</h4>
          <ul className="ref-footer-links">
            <li><Link href="/">ÚLTIMOS LANÇAMENTOS</Link></li>
            <li><Link href="/produtos?category=brincos">BRINCOS</Link></li>
            <li><Link href="/produtos?category=colares">COLARES</Link></li>
            <li><Link href="/produtos?category=aneis">ANÉIS</Link></li>
            <li><Link href="/produtos?category=pulseiras">PULSEIRAS</Link></li>
            <li><Link href="/produtos?category=conjuntos">CONJUNTOS</Link></li>
          </ul>
        </div>

        {/* Column 2: Meios de Pagamento e Envio */}
        <div className="ref-footer-col">
          <h4 className="ref-footer-heading">MEIOS DE PAGAMENTO</h4>
          <div className="ref-payment-badges">
            <span className="ref-pay-badge visa">VISA</span>
            <span className="ref-pay-badge master">Mastercard</span>
            <span className="ref-pay-badge elo">ELO</span>
            <span className="ref-pay-badge hiper">Hipercard</span>
            <span className="ref-pay-badge pix">PIX</span>
            <span className="ref-pay-badge boleto">Boleto</span>
          </div>

          <h4 className="ref-footer-heading" style={{ marginTop: '1.25rem' }}>FORMAS DE ENVIO</h4>
          <div className="ref-shipping-badges">
            <span className="ref-ship-badge">📦 CORREIOS / PAC & SEDEX</span>
          </div>
        </div>

        {/* Column 3: Contato */}
        <div className="ref-footer-col">
          <h4 className="ref-footer-heading">CONTATO</h4>
          <ul className="ref-footer-contact">
            <li>
              <span className="ref-contact-icon">📞</span>
              <span>{settings.whatsapp_number}</span>
            </li>
            <li>
              <span className="ref-contact-icon">✉️</span>
              <span>{settings.email}</span>
            </li>
            <li>
              <span className="ref-contact-icon">📍</span>
              <span>Atendimento online com envio para todo o Brasil</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="ref-footer-bottom">
        <div className="ref-footer-container ref-bottom-inner">
          <span>Copyright {settings.store_name} - {new Date().getFullYear()}. Todos os direitos reservados.</span>
          <span className="ref-bottom-credit">Catálogo Digital Oficial</span>
        </div>
      </div>
    </footer>
  );
}
