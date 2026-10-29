'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
      }

      router.push('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha na conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zom-login-overlay">
      <div className="zom-login-card">
        {/* Badge / Logo */}
        <div className="zom-login-badge">
          <img src="/logo.png" alt="Use Peixoto" />
        </div>

        <h1 className="zom-login-title">Painel de Gestão</h1>
        <p className="zom-login-sub">Use Peixoto Semi Joias • Acesso Restrito</p>

        {error && (
          <div className="admin-alert-error" style={{ borderRadius: '16px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="zom-input-group">
            <label className="zom-input-label">Usuário ou E-mail</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: admin"
              className="zom-input"
            />
          </div>

          <div className="zom-input-group">
            <label className="zom-input-label">Senha Master</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="zom-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="zom-btn-submit"
          >
            {loading ? 'Entrando no Sistema...' : 'Entrar no Painel Master'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <a
            href="/"
            style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textDecoration: 'none' }}
          >
            ← Voltar para a Loja Virtual
          </a>
        </div>
      </div>
    </div>
  );
}
