'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.login(user.trim(), password);
      router.push('/admin');
      router.refresh();
    } catch (err) {
      const e = err as { status?: number };
      if (e.status === 401) setError('Usuário ou senha incorretos.');
      else if (e.status === 429) setError('Muitas tentativas. Aguarde 1 minuto.');
      else setError('Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit} autoComplete="on">
        <div className="login-eyebrow">★ Festa Vitor • <span>Admin</span></div>
        <h1>Acesso administrativo</h1>

        <div className="form-row">
          <label htmlFor="user">Usuário</label>
          <input
            id="user"
            name="user"
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        {error && <div className="form-status error" style={{ display: 'block' }}>{error}</div>}
      </form>
    </main>
  );
}
