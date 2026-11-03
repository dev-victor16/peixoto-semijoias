'use client';

import React from 'react';
import Link from 'next/link';

interface MaintenanceScreenProps {
  whatsapp?: string;
  storeName?: string;
}

export default function MaintenanceScreen({ 
  whatsapp = '5511999999999', 
  storeName = 'Use Peixoto Semi Joias' 
}: MaintenanceScreenProps) {
  const cleanPhone = whatsapp.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Olá! Gostaria de informações sobre as novas peças da Use Peixoto.')}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAF7F3] flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
      {/* Decorative gradient blur background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] md:w-[480px] h-[340px] md:h-[480px] bg-gradient-to-tr from-[#F6D3D0]/40 to-[#566b98]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg w-full bg-white/80 backdrop-blur-md border border-[#F6D3D0]/50 rounded-3xl p-8 md:p-12 shadow-xl shadow-[#566b98]/10 flex flex-col items-center">
        {/* Brand badge */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#566b98] to-[#6d82ad] text-white flex items-center justify-center shadow-md mb-6">
          <span className="material-symbols-outlined text-3xl">diamond</span>
        </div>

        <span className="text-xs uppercase tracking-[0.25em] text-[#566b98] font-semibold mb-2">
          {storeName}
        </span>

        <h1 className="text-3xl md:text-4xl font-serif text-[#1e293b] font-normal leading-tight mb-4">
          Preparando Novidades <br />
          <span className="italic text-[#566b98]">Exclusivas</span> Para Você
        </h1>

        <p className="text-sm md:text-base text-[#64748b] leading-relaxed mb-8 max-w-md">
          Nossa curadoria está adicionando peças deslumbrantes com banho premium e design único. Em instantes nosso catálogo estará completo e liberado!
        </p>

        {/* WhatsApp Contact Button */}
        {cleanPhone && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-95 mb-6"
          >
            <span className="material-symbols-outlined text-xl">chat</span>
            Falar Conosco no WhatsApp
          </a>
        )}

        <div className="pt-6 border-t border-slate-100 w-full flex items-center justify-between text-xs text-slate-400">
          <span>✨ Coleção em atualização</span>
          <Link href="/admin" className="text-slate-400 hover:text-[#566b98] transition-colors underline decoration-dotted">
            Acesso Lojista
          </Link>
        </div>
      </div>
    </div>
  );
}

