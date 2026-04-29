'use client';

import { useEffect, useRef, useState } from 'react';
import { inviteApi, type ValidateResp } from '@/lib/api';
import MiniGame from './MiniGame';

type Screen = 'code' | 'invite' | 'confirmed';

export default function InviteApp({
  token, name, nickname,
}: {
  token: string;
  name: string;
  nickname: string | null;
}) {
  // Apelido tem prioridade. Sem apelido → primeiro nome do "name".
  const firstName = nickname || name.split(' ')[0];
  const [screen, setScreen] = useState<Screen>('code');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [validating, setValidating] = useState(false);
  const [validResp, setValidResp] = useState<ValidateResp | null>(null);

  return (
    <>
      {screen === 'code' && (
        <CodeEntry
          firstName={firstName}
          code={code}
          setCode={setCode}
          error={codeError}
          loading={validating}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\d{4}$/.test(code)) { setCodeError('O código tem 4 dígitos.'); return; }
            setCodeError('');
            setValidating(true);
            try {
              const resp = await inviteApi.validate(token, code);
              setValidResp(resp);
              setScreen(resp.view);
            } catch (err) {
              const e = err as { status?: number };
              if (e.status === 403)      setCodeError('Código incorreto.');
              else if (e.status === 404) setCodeError('Convite não encontrado.');
              else if (e.status === 429) setCodeError('Muitas tentativas. Aguarde 1 minuto.');
              else                       setCodeError('Não conseguimos validar agora. Tente de novo.');
            } finally {
              setValidating(false);
            }
          }}
        />
      )}

      {screen === 'confirmed' && (
        <ConfirmedScreen
          firstName={firstName}
          rsvpStatus={validResp?.view === 'confirmed' ? validResp.rsvp_status : null}
        />
      )}

      {screen === 'invite' && (
        <FullInvite token={token} code={code} firstName={firstName} />
      )}
    </>
  );
}

/* ==========================================================
   CODE ENTRY
========================================================== */
function CodeEntry({
  firstName, code, setCode, error, loading, onSubmit,
}: {
  firstName: string;
  code: string;
  setCode: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <main className="code-screen">
      <form className="code-card" onSubmit={onSubmit} autoComplete="off">
        <svg className="code-star" viewBox="0 0 100 100">
          <defs><radialGradient id="cG" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#FFF59D" /><stop offset="100%" stopColor="#FBC02D" />
          </radialGradient></defs>
          <polygon points="50,5 62,38 96,40 68,60 80,94 50,72 20,94 32,60 4,40 38,38"
                   fill="url(#cG)" stroke="#1A1F4E" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="40" cy="48" r="3.5" fill="#1A1F4E" />
          <circle cx="60" cy="48" r="3.5" fill="#1A1F4E" />
          <path d="M40 60 Q50 67 60 60" stroke="#1A1F4E" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <div className="code-eyebrow">★ Convite privado ★</div>
        <div className="code-greeting">Olá, {firstName}!</div>
        <p className="code-help">Digite o código de 4 dígitos que você recebeu no WhatsApp pra abrir seu convite.</p>

        <input
          className="code-input"
          type="text"
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]{4}"
          autoComplete="one-time-code"
          placeholder="••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />

        <button type="submit" className="code-btn" disabled={loading}>
          {loading ? 'Validando…' : 'Abrir convite'}
        </button>

        {error && <div className="code-error">{error}</div>}
        <div className="code-foot">Não compartilhe este link nem o código — cada link só funciona pra 3 aberturas.</div>
      </form>
    </main>
  );
}

/* ==========================================================
   CONFIRMED
========================================================== */
function ConfirmedScreen({
  firstName, rsvpStatus,
}: {
  firstName: string;
  rsvpStatus: 'sim' | 'nao' | 'talvez' | null;
}) {
  const [imgError, setImgError] = useState(false);

  let msg = (
    <>A galáxia já registrou sua presença. Te esperamos no dia <strong>07/06</strong>!</>
  );
  if (rsvpStatus === 'sim')   msg = <>A galáxia te espera no dia <strong>07/06</strong>!</>;
  if (rsvpStatus === 'nao')   msg = <>Vamos sentir sua falta! 💛</>;
  if (rsvpStatus === 'talvez')msg = <>Ainda dá tempo de confirmar — fala com a gente!</>;

  return (
    <main className="confirmed-screen">
      {/* eslint-disable @next/next/no-img-element */}
      <img className="float-img cf-1" alt=""
           src="https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/v1772215371/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/mario.png" />
      <img className="float-img cf-2" alt=""
           src="https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/v1772215371/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/luigi.png" />
      <img className="float-img cf-3" alt=""
           src="https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/v1772215371/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/peach.png" />
      <img className="float-img cf-4" alt=""
           src="https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/v1772215371/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/yoshibowser.png" />
      <img className="float-img cf-5" alt=""
           src="https://assets.nintendo.com/image/upload/c_limit,w_300,q_auto:eco,f_auto/v1772219955/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/star-yellow-1.png" />
      <img className="float-img cf-6" alt=""
           src="https://assets.nintendo.com/image/upload/c_limit,w_300,q_auto:eco,f_auto/v1772219955/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/star-yellow-1.png" />
      {/* eslint-enable @next/next/no-img-element */}

      <div className="confirmed-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="confirmed-logo" alt="Vitor Rafael" src="/img/LogoVitorRafael.svg" />
        <div className="vitor-photo">
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/img/vitor.jpg" alt="Vitor Rafael" onError={() => setImgError(true)} />
          ) : (
            <div className="placeholder">V</div>
          )}
        </div>
        <div className="confirmed-badge">★ Convite confirmado</div>
        <h1 className="confirmed-title">
          {firstName ? `${firstName}, sua presença já está confirmada` : 'Seu convite já foi confirmado'}
        </h1>
        <p className="confirmed-msg">{msg}</p>
      </div>
    </main>
  );
}

/* ==========================================================
   FULL INVITE
========================================================== */
function FullInvite({ token, code, firstName }: { token: string; code: string; firstName: string }) {
  const [cd, setCd] = useState({ d: '--', h: '--', m: '--', s: '--' });
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);

  // Tenta dar play mutado quando o convite é exibido (autoplay permitido enquanto sem som)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.muted = true;
    audio.play().catch(() => {});
  }, []);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    // Se ainda não estava tocando (autoplay bloqueado), força agora — vale como user gesture
    if (!next && audio.paused) {
      audio.play().catch(() => {});
    }
  }

  // Troca pra música final dependendo da resposta:
  // 'sim' → tema de vitória (fase concluída)
  // 'nao' → tema de morte (game over) 🤣
  function playEndMusic(type: 'victory' | 'death') {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = type === 'victory' ? '/audio/mario-victory.mp3' : '/audio/mario-death.mp3';
    audio.loop = false;
    audio.muted = false;
    audio.volume = 0.5;
    audio.play().catch(() => {});
    setMuted(false);
  }

  useEffect(() => {
    function tick() {
      const target = new Date(2026, 5, 7, 15, 0, 0);
      let diff = Math.max(0, target.getTime() - Date.now());
      const days  = Math.floor(diff / 86400000); diff -= days * 86400000;
      const hours = Math.floor(diff / 3600000);  diff -= hours * 3600000;
      const mins  = Math.floor(diff / 60000);    diff -= mins * 60000;
      const secs  = Math.floor(diff / 1000);
      const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
      setCd({ d: pad(days), h: pad(hours), m: pad(mins), s: pad(secs) });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <audio ref={audioRef} src="/audio/mario-theme.mp3" loop preload="auto" />
      {muted && (
        <div className="audio-hint" aria-hidden="true">
          🔊 Toca no autofalante e aumenta o volume, {firstName}!!
        </div>
      )}
      {muted && (
        <button
          type="button"
          className="audio-toggle-center"
          onClick={toggleAudio}
          aria-label="Tocar música"
          title="Tocar música"
        >
          🔇
        </button>
      )}
      <button
        type="button"
        className="audio-toggle"
        onClick={toggleAudio}
        aria-label={muted ? 'Tocar música' : 'Silenciar'}
        title={muted ? 'Tocar música' : 'Silenciar'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <nav className="topnav" aria-label="Atalhos">
        <div className="topnav-brand">VITOR <span>★</span> 6 ANOS</div>
        <a href="#rsvp" className="topnav-cta">Confirmar presença</a>
      </nav>

      <header className="hero">
        <div className="hero-bg" aria-hidden="true" />
        {/* eslint-disable @next/next/no-img-element */}
        <img className="float-img fi-mario" alt=""
             src="https://assets.nintendo.com/image/upload/c_limit,w_500,q_auto:eco,f_auto/v1772219812/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/mario-2.png" />
        <img className="float-img fi-star" alt=""
             src="https://assets.nintendo.com/image/upload/c_limit,w_300,q_auto:eco,f_auto/v1772219955/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/star-yellow-1.png" />
        <img className="float-img fi-cloud" alt=""
             src="https://assets.nintendo.com/image/upload/c_limit,w_400,q_auto:eco,f_auto/v1772560597/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/cloud.png" />
        <img className="float-img fi-star-2" alt=""
             src="https://assets.nintendo.com/image/upload/c_limit,w_300,q_auto:eco,f_auto/v1772219955/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/star-yellow-1.png" />
        {/* eslint-enable @next/next/no-img-element */}

        <div className="hero-inner">
          <div className="hero-marquee">★ Em órbita: 7 de junho de 2026 ★</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-logo" alt="Vitor Rafael" src="/img/LogoVitorRafael.svg" />
          <p className="hero-sub">
            A festa de aniversário de <strong>6 anos</strong> do Vitor está prestes a desencadear uma{' '}
            <strong>aventura galáctica</strong>. {firstName && `Te esperamos, ${firstName}!`}
          </p>
          <div className="hero-cta-row">
            <a href="#rsvp" className="btn btn-primary">▶ Confirmar presença</a>
            <a href="#detalhes" className="btn btn-ghost">Ver detalhes</a>
          </div>
        </div>
      </header>

      <section className="story">
        <div className="story-grid">
          <div className="story-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" alt="Mario e Yoshi"
                 src="https://assets.nintendo.com/image/upload/c_limit,w_900,q_auto:eco,f_auto/v1772235572/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/marioyoshi.png" />
          </div>
          <div className="story-text">
            <span className="eyebrow">A história</span>
            <h2>Numa galáxia distante…</h2>
            <p>
              O <em>Vitor Rafael</em> está fazendo <em>6 anos</em> e Mario, Luigi, Yoshi, Peach e a Rosalina já estão a caminho.
              Embarque com a gente nessa missão pra fazer do dia <em>07 de junho</em> o melhor domingo da galáxia.
              Power-ups, cogumelos, estrelas e bolo de aniversário garantidos.
            </p>
          </div>
        </div>
      </section>

      <CastSection />

      <section className="details" id="detalhes">
        <div className="container">
          <div className="details-head">
            <span className="eyebrow">Detalhes da missão</span>
            <h2>Onde e quando<br />a aventura começa</h2>
          </div>
          <div className="details-grid">
            <article className="card">
              <div className="card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFE066"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M8 3v4M16 3v4" />
                </svg>
              </div>
              <h3>Data</h3>
              <p><strong>Domingo, 07 de junho de 2026</strong><br />Decolagem a partir das <strong>15:00</strong></p>
            </article>
            <article className="card">
              <div className="card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFE066"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <h3>Plataforma de embarque</h3>
              <p><strong>Rua Pernambuco, 100</strong></p>
              <a className="map-link" href="https://www.google.com/maps/search/?api=1&query=Rua+Pernambuco+100"
                 target="_blank" rel="noopener noreferrer">Abrir no mapa</a>
            </article>
            <article className="card">
              <div className="card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFE066"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8" />
                </svg>
              </div>
              <h3>Código de fantasia</h3>
              <p>
                Capriche nas cores da turma do Mario: <strong>vermelho, verde, azul</strong> — ou venha caracterizado
                de Mario, Luigi, Peach, Yoshi, Toad…
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="cd-section">
        <div className="container">
          <span className="eyebrow">Contagem regressiva</span>
          <h2>Falta pouco pro lançamento</h2>
          <div className="cd-grid">
            <div className="cd-item"><div className="cd-num">{cd.d}</div><div className="cd-lbl">Dias</div></div>
            <div className="cd-item"><div className="cd-num">{cd.h}</div><div className="cd-lbl">Horas</div></div>
            <div className="cd-item"><div className="cd-num">{cd.m}</div><div className="cd-lbl">Min</div></div>
            <div className="cd-item"><div className="cd-num">{cd.s}</div><div className="cd-lbl">Seg</div></div>
          </div>
        </div>
      </section>

      <MiniGame />

      <RsvpSection
        token={token}
        code={code}
        firstName={firstName}
        audioMuted={muted}
        onSuccess={(p) => playEndMusic(p === 'sim' ? 'victory' : 'death')}
      />

      <footer className="footer">
        <p>Feito com <span style={{ color: 'var(--red)' }}>♥</span> para o <strong>Vitor Rafael</strong> • 6 anos</p>
        <p style={{ marginTop: 4, opacity: 0.7 }}>A galáxia espera por você.</p>
        <p style={{ marginTop: 16, opacity: 0.5, fontSize: 12, letterSpacing: 1 }}>
          Desenvolvido por <strong>Cristiano Tamanini</strong>
        </p>
      </footer>
    </>
  );
}

/* ==========================================================
   CAST
========================================================== */
function CastSection() {
  const cast = [
    { name: 'Mario',          role: 'O herói',              file: 'mario.png',       v: 'v1772215371' },
    { name: 'Luigi',          role: 'O irmão',              file: 'luigi.png',       v: 'v1772215371' },
    { name: 'Peach',          role: 'A princesa',           file: 'peach.png',       v: 'v1772215371' },
    { name: 'Yoshi & Bowser', role: 'A dupla',              file: 'yoshibowser.png', v: 'v1772215371' },
    { name: 'Toad',           role: 'O fiel escudeiro',     file: 'toad.png',        v: 'v1772215371' },
    { name: 'Rosalina',       role: 'Guardiã das estrelas', file: 'rosalina.png',    v: 'v1772216579' },
    { name: 'Bowser Jr.',     role: 'O encrenqueiro',       file: 'bowserjr.png',    v: 'v1772215371' },
  ];
  return (
    <section className="cast">
      <div className="cast-head">
        <span className="eyebrow">Convidados especiais</span>
        <h2>Conheça sua turma</h2>
      </div>
      <div className="cast-grid">
        {cast.map((c) => (
          <article key={c.name} className="cast-card">
            <div className="portrait">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" alt={c.name}
                   src={`https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/${c.v}/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/${c.file}`} />
            </div>
            <div className="name">{c.name}</div>
            <div className="role">{c.role}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ==========================================================
   RSVP
========================================================== */
function RsvpSection({
  token, code, firstName, audioMuted, onSuccess,
}: {
  token: string;
  code: string;
  firstName: string;
  audioMuted: boolean;
  onSuccess: (presenca: 'sim' | 'nao' | 'talvez') => void;
}) {
  const [presenca, setPresenca] = useState<'sim' | 'nao' | 'talvez'>('sim');
  const [mensagem, setMensagem] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [celebrating, setCelebrating] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (audioMuted) return; // gate: precisa ter ativado o som
    setStatus('sending');
    try {
      await inviteApi.rsvp({
        token, code, presenca, quantidade: 1,
        observacao: mensagem.trim() || undefined,
      });
      setStatus('success');
      onSuccess(presenca);
      if (presenca === 'sim')      setCelebrating(true);
      else if (presenca === 'nao') setGameOver(true);
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {celebrating && (
        <CelebrationFlag firstName={firstName} onClose={() => setCelebrating(false)} />
      )}
      {gameOver && (
        <GameOverScreen firstName={firstName} onClose={() => setGameOver(false)} />
      )}
    <section className="rsvp" id="rsvp">
      <div className="container">
        <form className="rsvp-card" onSubmit={submit}>
          <div className="rsvp-head">
            <span className="eyebrow">Sua tripulação</span>
            <h2>Confirme sua presença</h2>
            <p style={{ color: 'var(--indigo-lt)', marginTop: 4 }}>Pra gente reservar seu assento na nave 🚀</p>
          </div>

          <div className="form-row">
            <label htmlFor="presenca">Você vai? <span className="req">*</span></label>
            <select id="presenca" value={presenca}
                    onChange={(e) => setPresenca(e.target.value as 'sim' | 'nao' | 'talvez')} required>
              <option value="sim">Vou sim!</option>
              <option value="nao">Infelizmente não vou conseguir</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="mensagem">Mensagem pro Vitor</label>
            <textarea id="mensagem" placeholder="Deixe um recadinho de aniversário pro Vitor 🎂"
                      value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
          <button
            type="submit"
            className="submit-btn"
            disabled={status === 'sending' || audioMuted}
            title={audioMuted ? 'Toca no autofalante e ativa o som primeiro' : ''}
          >
            {audioMuted
              ? '🔊 Ativa o som primeiro pra confirmar'
              : status === 'sending'
                ? 'Enviando…'
                : 'Enviar confirmação'}
          </button>
          {audioMuted && (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--star)', textAlign: 'center' }}>
              🎵 Toca no botão vermelho no canto pra liberar a confirmação!
            </p>
          )}
          {status === 'success' && (
            <div className="form-status success" style={{ display: 'block' }}>
              ★ Confirmação recebida. Até dia 07/06 na galáxia!
            </div>
          )}
          {status === 'error' && (
            <div className="form-status error" style={{ display: 'block' }}>
              Não conseguimos enviar agora. Tente novamente.
            </div>
          )}
        </form>
      </div>
    </section>
    </>
  );
}

/* ==========================================================
   CELEBRATION FLAG (Mario level-clear)
========================================================== */
function CelebrationFlag({ firstName, onClose }: { firstName: string; onClose: () => void }) {
  return (
    <div className="celebration" role="dialog" aria-label="Presença confirmada">
      {/* Confete */}
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} style={{ ['--i' as string]: i }} />
        ))}
      </div>

      {/* Mastro + bandeira */}
      <div className="flagpole-wrap" aria-hidden="true">
        <div className="flagpole" />
        <div className="flagpole-tip" />
        <div className="flag">
          <svg viewBox="0 0 60 40">
            {/* Verde */}
            <rect width="60" height="40" fill="#009C3B" stroke="#1A1F4E" strokeWidth="2" />
            {/* Losango amarelo */}
            <polygon points="30,5 55,20 30,35 5,20" fill="#FFDF00" />
            {/* Círculo azul */}
            <circle cx="30" cy="20" r="9" fill="#002776" />
            {/* Faixa branca "Ordem e Progresso" */}
            <path d="M 22 17.5 Q 30 22.5 38 17.5" stroke="white" strokeWidth="1.6" fill="none" />
            {/* Estrelas (constelações) */}
            <circle cx="25" cy="19" r="0.6" fill="white" />
            <circle cx="28" cy="21.5" r="0.5" fill="white" />
            <circle cx="31" cy="18" r="0.55" fill="white" />
            <circle cx="33" cy="22" r="0.4" fill="white" />
            <circle cx="35" cy="19.5" r="0.5" fill="white" />
            <circle cx="29" cy="24" r="0.4" fill="white" />
          </svg>
        </div>
        <div className="castle">
          <svg viewBox="0 0 100 80">
            <rect x="10" y="30" width="80" height="50" fill="#7B4B26" stroke="#1A1F4E" strokeWidth="2" />
            <rect x="20" y="20" width="15" height="15" fill="#7B4B26" stroke="#1A1F4E" strokeWidth="2" />
            <rect x="42" y="10" width="15" height="25" fill="#7B4B26" stroke="#1A1F4E" strokeWidth="2" />
            <rect x="65" y="20" width="15" height="15" fill="#7B4B26" stroke="#1A1F4E" strokeWidth="2" />
            <rect x="42" y="50" width="15" height="30" fill="#1A1F4E" />
            <polygon points="20,20 27.5,10 35,20" fill="#E60012" />
            <polygon points="42,10 49.5,0 57,10" fill="#E60012" />
            <polygon points="65,20 72.5,10 80,20" fill="#E60012" />
          </svg>
        </div>
      </div>

      <div className="celebration-text">
        <div className="celebration-eyebrow">★ STAGE CLEAR ★</div>
        <h1>Presença confirmada!</h1>
        <p>{firstName}, te esperamos no dia <strong>07/06</strong>! 🎂</p>
        <button className="celebration-close" onClick={onClose}>Continuar</button>
      </div>
    </div>
  );
}

/* ==========================================================
   GAME OVER (resposta "Não vou conseguir")
========================================================== */
function GameOverScreen({ firstName, onClose }: { firstName: string; onClose: () => void }) {
  return (
    <div className="gameover" role="dialog" aria-label="Não vai conseguir">
      <div className="gameover-mario" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt=""
             src="https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/v1772215371/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/mario.png" />
      </div>
      <div className="gameover-text">
        <div className="gameover-eyebrow">⚠ GAME OVER ⚠</div>
        <h1>Que pena, {firstName}!</h1>
        <p>Vamos sentir sua falta no dia <strong>07/06</strong>. 💔<br />Se mudar de ideia, fala com a gente!</p>
        <button className="gameover-close" onClick={onClose}>Continuar</button>
      </div>
    </div>
  );
}
