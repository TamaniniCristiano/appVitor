'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, authApi, type Guest } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { guests } = await adminApi.list();
      setGuests(guests);
    } catch (err) {
      const e = err as { status?: number };
      if (e.status === 401) {
        router.push('/admin/login');
        return;
      }
      showToast('Erro ao carregar.', 'err');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await adminApi.create(name.trim(), phone.trim(), nickname.trim() || undefined);
      setName('');
      setNickname('');
      setPhone('');
      showToast('Convidado adicionado!');
      load();
    } catch (err) {
      const e = err as { body?: { error?: string } };
      showToast('Erro: ' + (e.body?.error ?? 'desconhecido'), 'err');
    } finally {
      setAdding(false);
    }
  }

  async function reset(id: string) {
    if (!confirm('Resetar contador de acessos pra 0?')) return;
    try {
      await adminApi.reset(id);
      showToast('Contador zerado.');
      load();
    } catch {
      showToast('Erro ao resetar.', 'err');
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Excluir ${name}? Essa ação não pode ser desfeita.`)) return;
    try {
      await adminApi.remove(id);
      showToast('Convidado removido.');
      load();
    } catch {
      showToast('Erro ao excluir.', 'err');
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {}
    router.push('/admin/login');
    router.refresh();
  }

  function buildWhatsAppMsg(g: Guest) {
    const url = `${window.location.origin}/c/${g.invite_token}`;
    const greet = g.nickname || g.name.split(' ')[0];
    return [
      `Oi ${greet}! 🎉`,
      ``,
      `Você está convidado(a) pra festa de 6 anos do Vitor Rafael — tema Super Mario Galaxy!`,
      `📅 Domingo, 07/06/2026 a partir das 15h`,
      `📍 Rua Pernambuco, 100`,
      ``,
      `🔗 Seu convite: ${url}`,
      `🔢 Seu código: *${g.invite_code}*`,
      ``,
      `(O link funciona pra 3 aberturas, então não compartilhe 🚀)`,
    ].join('\n');
  }

  function whatsappUrl(g: Guest) {
    const phone = g.phone.replace(/\D/g, '');
    const full = phone.length === 10 || phone.length === 11 ? `55${phone}` : phone;
    return `https://wa.me/${full}?text=${encodeURIComponent(buildWhatsAppMsg(g))}`;
  }

  async function copyMsg(g: Guest) {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMsg(g));
      showToast('Mensagem copiada!');
    } catch {
      showToast('Falha ao copiar', 'err');
    }
  }

  function pill(status: Guest['rsvp_status']) {
    if (status === 'sim')   return <span className="pill pill-sim">Vai</span>;
    if (status === 'nao')   return <span className="pill pill-nao">Não vai</span>;
    if (status === 'talvez')return <span className="pill pill-talvez">Talvez</span>;
    return <span className="pill pill-pend">Pendente</span>;
  }

  const statTotal  = guests.length;
  const statSim    = guests.filter(g => g.rsvp_status === 'sim').length;
  const statBurned = guests.filter(g => g.access_count >= g.max_access).length;

  return (
    <main className="admin-wrap">
      {toast && <div className={`toast ${toast.type} show`}>{toast.msg}</div>}

      <header className="admin-top">
        <div className="admin-brand">★ Festa Vitor • <span>Admin</span></div>
        <div className="admin-stats">
          <div><b>{statTotal}</b>convidados</div>
          <div><b>{statSim}</b>confirmados</div>
          <div><b>{statBurned}</b>com link queimado</div>
          <button className="btn-mini ghost" onClick={logout}>Sair</button>
        </div>
      </header>

      <section className="panel">
        <h2>Adicionar convidado</h2>
        <form className="add-form" onSubmit={add} autoComplete="off">
          <div>
            <label htmlFor="name">Nome completo</label>
            <input id="name" type="text" required placeholder="Ex: Deize Colaço"
                   value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="nickname">Apelido <span style={{ opacity: 0.6 }}>(opcional)</span></label>
            <input id="nickname" type="text" placeholder="Ex: tia Nenny"
                   value={nickname} onChange={e => setNickname(e.target.value)} />
          </div>
          <div>
            <label htmlFor="phone">WhatsApp (com DDD)</label>
            <input id="phone" type="tel" required placeholder="11999998888" inputMode="tel"
                   value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <button className="submit-btn" type="submit" disabled={adding}
                  style={{ width: 'auto', padding: '14px 22px', marginTop: 0 }}>
            {adding ? 'Adicionando…' : 'Adicionar'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Convidados</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Apelido</th>
                <th>Telefone</th>
                <th>Código</th>
                <th>Acessos</th>
                <th>RSVP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="empty">Carregando…</td></tr>
              )}
              {!loading && guests.length === 0 && (
                <tr><td colSpan={7} className="empty">Nenhum convidado ainda.</td></tr>
              )}
              {!loading && guests.map(g => {
                const burned = g.access_count >= g.max_access;
                return (
                  <tr key={g.id}>
                    <td><strong>{g.name}</strong></td>
                    <td>{g.nickname ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td>{g.phone}</td>
                    <td className="code">{g.invite_code}</td>
                    <td>
                      <span className={`access-cell ${burned ? 'full' : ''}`}>
                        {g.access_count}/{g.max_access}
                      </span>
                    </td>
                    <td>{pill(g.rsvp_status)}</td>
                    <td className="actions">
                      <a className="btn-mini" target="_blank" rel="noopener" href={whatsappUrl(g)}>WhatsApp</a>
                      <button className="btn-mini ghost" onClick={() => copyMsg(g)}>Copiar msg</button>
                      <button className="btn-mini ghost" onClick={() => reset(g.id)}>Resetar</button>
                      <button className="btn-mini ghost" onClick={() => remove(g.id, g.name)}>Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
