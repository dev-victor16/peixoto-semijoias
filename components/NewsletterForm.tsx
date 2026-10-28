'use client';
import React, { useState } from 'react';

export default function NewsletterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setStatus('error');
      setFeedback('Preencha seu nome e e-mail para se cadastrar.');
      return;
    }

    setStatus('loading');
    setFeedback('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setFeedback(data.message || 'Inscrição confirmada com sucesso.');
        setName('');
        setEmail('');
      } else {
        setStatus('error');
        setFeedback(data.error || 'Erro ao processar inscrição. Tente novamente.');
      }
    } catch {
      setStatus('error');
      setFeedback('Erro de conexão. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="ref-newsletter-box">
      <h3 className="ref-newsletter-title">RECEBA NOSSAS NOVIDADES</h3>
      <p className="ref-newsletter-sub">
        Cadastre-se para receber avisos sobre novos lançamentos e reposições.
      </p>

      {status === 'success' ? (
        <div className="ref-newsletter-success">
          <p>{feedback}</p>
          <button
            type="button"
            className="ref-newsletter-btn"
            style={{ marginTop: '0.8rem' }}
            onClick={() => setStatus('idle')}
          >
            Cadastrar outro e-mail
          </button>
        </div>
      ) : (
        <form className="ref-newsletter-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nome Completo"
            className="ref-input"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={status === 'loading'}
            required
          />
          <input
            type="email"
            placeholder="Seu E-mail"
            className="ref-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'loading'}
            required
          />
          {status === 'error' && (
            <p className="ref-newsletter-error-msg">{feedback}</p>
          )}
          <button
            type="submit"
            className="ref-newsletter-btn"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'INSCREVENDO...' : 'INSCREVER-SE'}
          </button>
        </form>
      )}
    </div>
  );
}
