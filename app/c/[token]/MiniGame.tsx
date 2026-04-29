'use client';

import { useEffect, useRef, useState } from 'react';

const MARIO_W = 52;
const MARIO_H = 60;
const BLOCK_SIZE = 36;
const ARENA_H = 290;
const FLOOR_H = 30;
const FLOOR = 0;
const BLOCK_BOTTOM = 105;
const GRAVITY = 0.7;
const JUMP_V = 13;
const MOVE_SPEED = 5;
const NUM_BLOCKS = 10;
const COINS_PER_BLOCK = 10;
const TOTAL_COINS = NUM_BLOCKS * COINS_PER_BLOCK;
const WORLD_W = 2200;
const FIRST_BLOCK_X = 220;
const BLOCK_SPACING = 200;
const ROUND_TIME_MS = 40000;
const MAX_ATTEMPTS = 3;

interface Block {
  id: number;
  left: number;
  hits: number;
  bumping: boolean;
}
interface FlyingCoin {
  id: number;
  left: number;
  bottom: number;
}
export interface BestScore {
  coins: number;
  timeMs: number;
}
type GameState = 'instructions' | 'countdown' | 'playing' | 'finished' | 'noattempts';

const MARIO_PNG =
  'https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/v1772215371/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/mario.png';

function isBetter(a: BestScore, b: BestScore) {
  if (a.coins !== b.coins) return a.coins > b.coins;
  return a.timeMs < b.timeMs;
}

function freshBlocks(): Block[] {
  return Array.from({ length: NUM_BLOCKS }, (_, i) => ({
    id: i + 1,
    left: FIRST_BLOCK_X + i * BLOCK_SPACING - BLOCK_SIZE / 2,
    hits: 0,
    bumping: false,
  }));
}

interface Props {
  token: string;
  bestScore: BestScore;
  onRoundEnd: (score: BestScore) => void;
}

export default function MiniGame({ token, bestScore, onRoundEnd }: Props) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [arenaW, setArenaW] = useState(600);

  const [marioX, setMarioX] = useState(40);
  const [marioY, setMarioY] = useState(0);
  const [facing, setFacing] = useState<'right' | 'left'>('right');
  const [walking, setWalking] = useState(false);
  const movingRef = useRef<'left' | 'right' | null>(null);
  const vyRef = useRef(0);
  const groundedRef = useRef(true);

  const [blocks, setBlocks] = useState<Block[]>(freshBlocks);
  const [coins, setCoins] = useState(0);
  const coinsRef = useRef(0);
  const [flying, setFlying] = useState<FlyingCoin[]>([]);

  // Estado do jogo
  const [gameState, setGameState] = useState<GameState>('instructions');
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_MS);
  const [countdownLabel, setCountdownLabel] = useState<string>('3');
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [lastResult, setLastResult] = useState<BestScore | null>(null);

  const startTimeRef = useRef<number>(0);
  const lastCoinTimeRef = useRef<number>(0);
  const finishingRef = useRef<boolean>(false);

  // ============ Sons 8-bit ============
  const audioCtxRef = useRef<AudioContext | null>(null);
  function getCtx() {
    if (!audioCtxRef.current) {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctx = W.AudioContext || W.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }
  function tone(freqStart: number, freqEnd: number, dur: number, vol = 0.16, type: OscillatorType = 'square') {
    try {
      const ctx = getCtx(); if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, t);
      if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur * 0.9);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }
  function playJumpSound()  { tone(440, 880, 0.16); }
  function playBumpSound()  { tone(180, 60, 0.10, 0.14); }
  function playCoinSound()  {
    try {
      const ctx = getCtx(); if (!ctx) return;
      const t = ctx.currentTime;
      [988, 1319].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = f;
        const start = t + i * 0.07;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.13, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start); osc.stop(start + 0.13);
      });
    } catch { /* ignore */ }
  }
  function playCountdownTick() { tone(660, 660, 0.08, 0.18, 'square'); }
  function playCountdownGo()   { tone(880, 1760, 0.4, 0.22, 'square'); }
  function playFinishSound()   {
    try {
      const ctx = getCtx(); if (!ctx) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = f;
        const start = t + i * 0.09;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start); osc.stop(start + 0.18);
      });
    } catch { /* ignore */ }
  }

  // ============ Persistência das tentativas ============
  useEffect(() => {
    if (!token) return;
    try {
      const a = localStorage.getItem(`vitor_mg_att_${token}`);
      if (a !== null) {
        const n = parseInt(a, 10);
        if (!isNaN(n)) setAttempts(Math.max(0, Math.min(MAX_ATTEMPTS, n)));
        if (n <= 0) setGameState('noattempts');
      }
    } catch { /* ignore */ }
  }, [token]);

  function saveAttempts(n: number) {
    try { localStorage.setItem(`vitor_mg_att_${token}`, String(n)); } catch { /* ignore */ }
  }

  // ============ Layout ============
  useEffect(() => {
    function layout() {
      const arena = arenaRef.current;
      if (!arena) return;
      setArenaW(arena.clientWidth);
    }
    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, []);

  // ============ Game loop ============
  useEffect(() => {
    let raf = 0;
    function tick() {
      const playing = gameState === 'playing';

      if (playing) {
        if (movingRef.current === 'left') {
          setMarioX((x) => Math.max(0, x - MOVE_SPEED));
          setFacing('left'); setWalking(true);
        } else if (movingRef.current === 'right') {
          setMarioX((x) => Math.min(WORLD_W - MARIO_W, x + MOVE_SPEED));
          setFacing('right'); setWalking(true);
        } else {
          setWalking(false);
        }
      } else {
        if (walking) setWalking(false);
      }

      if (vyRef.current !== 0 || marioY > FLOOR) {
        vyRef.current -= GRAVITY;
        setMarioY((y) => {
          const ny = y + vyRef.current;
          if (ny <= FLOOR) {
            vyRef.current = 0;
            groundedRef.current = true;
            return FLOOR;
          }
          return ny;
        });
      }

      // Tempo
      if (playing) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, ROUND_TIME_MS - elapsed);
        setTimeLeft(remaining);
        if (remaining === 0 && !finishingRef.current) {
          finishingRef.current = true;
          finishRound(false);
        }
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, marioY]);

  // ============ Colisão ============
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (vyRef.current <= 0) return;
    const marioTop = marioY + MARIO_H;
    const marioRight = marioX + MARIO_W;

    blocks.forEach((b) => {
      if (b.hits >= COINS_PER_BLOCK) return;
      const blockRight = b.left + BLOCK_SIZE;
      if (marioRight < b.left + 6 || marioX > blockRight - 6) return;
      if (marioTop >= BLOCK_BOTTOM && marioTop <= BLOCK_BOTTOM + 16) {
        vyRef.current = 0;
        playBumpSound(); playCoinSound();
        setBlocks((prev) =>
          prev.map((x) => (x.id === b.id ? { ...x, hits: x.hits + 1, bumping: true } : x)),
        );
        setTimeout(() => {
          setBlocks((prev) =>
            prev.map((x) => (x.id === b.id ? { ...x, bumping: false } : x)),
          );
        }, 200);
        const newCoins = coinsRef.current + 1;
        coinsRef.current = newCoins;
        setCoins(newCoins);
        lastCoinTimeRef.current = Date.now() - startTimeRef.current;
        const id = Date.now() + Math.random();
        setFlying((prev) => [
          ...prev,
          { id, left: b.left + BLOCK_SIZE / 2 - 12, bottom: BLOCK_BOTTOM + BLOCK_SIZE },
        ]);
        setTimeout(() => setFlying((prev) => prev.filter((c) => c.id !== id)), 800);

        // Pegou tudo? Termina antes do tempo
        if (newCoins >= TOTAL_COINS && !finishingRef.current) {
          finishingRef.current = true;
          setTimeout(() => finishRound(true), 100);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marioY, marioX, blocks]);

  // ============ Teclado ============
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat) return;
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault(); movingRef.current = 'left';
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault(); movingRef.current = 'right';
      } else if (e.key === ' ' || e.key === 'b' || e.key === 'B' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (groundedRef.current) {
          vyRef.current = JUMP_V;
          groundedRef.current = false;
          playJumpSound();
        }
      }
    }
    function up(e: KeyboardEvent) {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
        movingRef.current = null;
      }
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [gameState, marioY]);

  // ============ Controles dos botões ============
  function press(dir: 'left' | 'right') {
    if (gameState !== 'playing') return;
    movingRef.current = dir;
  }
  function release() { movingRef.current = null; }
  function jump() {
    if (gameState !== 'playing') return;
    if (groundedRef.current) {
      vyRef.current = JUMP_V;
      groundedRef.current = false;
      playJumpSound();
    }
  }

  // ============ Início e fim de round ============
  function startCountdown() {
    if (attempts <= 0) { setGameState('noattempts'); return; }
    // reset estado do jogo
    setBlocks(freshBlocks());
    setCoins(0);
    coinsRef.current = 0;
    setMarioX(40); setMarioY(0); setFacing('right'); setWalking(false);
    movingRef.current = null; vyRef.current = 0;
    groundedRef.current = true;
    finishingRef.current = false;
    lastCoinTimeRef.current = 0;
    setTimeLeft(ROUND_TIME_MS);

    // 3-2-1 GO
    setGameState('countdown');
    const labels = ['3', '2', '1', 'VAI!'];
    setCountdownLabel(labels[0]);
    playCountdownTick();
    let idx = 0;
    const id = setInterval(() => {
      idx += 1;
      if (idx < labels.length) {
        setCountdownLabel(labels[idx]);
        if (idx === labels.length - 1) playCountdownGo();
        else playCountdownTick();
      } else {
        clearInterval(id);
        startTimeRef.current = Date.now();
        setGameState('playing');
      }
    }, 1000);
  }

  function finishRound(allCoins: boolean) {
    movingRef.current = null;
    setWalking(false);
    const finalCoins = coinsRef.current;
    const timeMs = allCoins ? lastCoinTimeRef.current : ROUND_TIME_MS;
    const result: BestScore = { coins: finalCoins, timeMs };
    setLastResult(result);
    onRoundEnd(result);
    playFinishSound();
    const newAttempts = attempts - 1;
    setAttempts(newAttempts);
    saveAttempts(newAttempts);
    setGameState('finished');
  }

  // câmera
  const cameraX = Math.max(
    0,
    Math.min(Math.max(0, WORLD_W - arenaW), marioX - arenaW / 2 + MARIO_W / 2),
  );
  const seconds = (timeLeft / 1000).toFixed(1);
  const allCoinsCollected = coins >= TOTAL_COINS;

  return (
    <section className="minigame-section">
      <div className="minigame">
        <div className="minigame-header">
          <span className="minigame-title">🎮 Desafio Mario</span>
          <span className={`coin-counter ${allCoinsCollected ? 'all-done' : ''}`}>
            <span className="coin-icon">🪙</span>
            <span className="coin-num">{coins}/{TOTAL_COINS}</span>
          </span>
        </div>

        <div ref={arenaRef} className="arena" style={{ height: ARENA_H }}>
          {/* mundo (scrollável) */}
          <div className="world" style={{ width: WORLD_W, transform: `translateX(${-cameraX}px)` }}>
            <div className="cloud-deco" style={{ left: 120, top: 18 }} />
            <div className="cloud-deco wide" style={{ left: 480, top: 40 }} />
            <div className="cloud-deco" style={{ left: 920, top: 22 }} />
            <div className="cloud-deco wide" style={{ left: 1320, top: 36 }} />
            <div className="cloud-deco" style={{ left: 1780, top: 20 }} />

            {blocks.map((b) => (
              <div
                key={b.id}
                className={
                  'q-block ' +
                  (b.hits >= COINS_PER_BLOCK ? 'empty ' : '') +
                  (b.bumping ? 'bumping ' : '')
                }
                style={{ left: b.left, bottom: BLOCK_BOTTOM, width: BLOCK_SIZE, height: BLOCK_SIZE }}
              >
                {b.hits >= COINS_PER_BLOCK ? '·' : '?'}
                <span className="block-counter">{COINS_PER_BLOCK - b.hits}</span>
              </div>
            ))}

            {flying.map((c) => (
              <div key={c.id} className="flying-coin" style={{ left: c.left, bottom: c.bottom }}>
                🪙
              </div>
            ))}

            <div
              className={'mario ' + (walking ? 'walking ' : '') + (marioY > 0 ? 'jumping ' : '')}
              style={{
                left: marioX,
                bottom: marioY,
                width: MARIO_W,
                height: MARIO_H,
                transform: facing === 'right' ? 'scaleX(-1)' : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Mario" src={MARIO_PNG} />
            </div>

            <div className="finish-flag" style={{ left: WORLD_W - 80 }}>
              <div className="finish-pole" />
              <div className="finish-flag-cloth" />
            </div>

            <div className="ground" style={{ height: FLOOR_H, width: WORLD_W }} />
          </div>

          {/* HUD: timer + progresso */}
          {gameState === 'playing' && (
            <>
              <div className="game-timer">
                <span className="timer-label">⏱</span>
                <span className="timer-num">{seconds}s</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(timeLeft / ROUND_TIME_MS) * 100}%` }} />
              </div>
            </>
          )}

          {/* Overlay: instruções */}
          {gameState === 'instructions' && (
            <div className="game-overlay">
              <div className="overlay-card">
                <div className="overlay-eyebrow">🎮 Desafio</div>
                <h3>Pegue o máximo de moedas em <strong>40 segundos</strong></h3>
                <ul className="overlay-rules">
                  <li><strong>10 caixinhas</strong> × <strong>10 moedas</strong> = 100 no total</li>
                  <li>Bata embaixo das caixinhas pulando</li>
                  <li>Você tem <strong>{attempts} tentativa{attempts === 1 ? '' : 's'}</strong></li>
                  <li>🎁 Mais moedas em menos tempo ganha um presente — entregue <strong>na festa</strong> pra uma criança (não o Vitor 😜)</li>
                </ul>
                <button className="overlay-btn" onClick={startCountdown}>
                  ▶ Jogar
                </button>
              </div>
            </div>
          )}

          {/* Overlay: countdown */}
          {gameState === 'countdown' && (
            <div className="game-overlay countdown-overlay">
              <div className="countdown-num" key={countdownLabel}>{countdownLabel}</div>
            </div>
          )}

          {/* Overlay: finished */}
          {gameState === 'finished' && lastResult && (
            <div className="game-overlay">
              <div className="overlay-card">
                <div className="overlay-eyebrow">⏱ Acabou o tempo</div>
                <h3>
                  Você fez <strong style={{ color: 'var(--star)' }}>{lastResult.coins}</strong> moedas
                  {lastResult.coins >= TOTAL_COINS && ` em ${(lastResult.timeMs / 1000).toFixed(1)}s`}
                </h3>
                <p className="overlay-hint">
                  Melhor resultado: <strong>{bestScore.coins}/{TOTAL_COINS}</strong>
                  {bestScore.coins >= TOTAL_COINS && ` em ${(bestScore.timeMs / 1000).toFixed(1)}s`}
                </p>
                {attempts > 0 ? (
                  <>
                    <p className="overlay-hint" style={{ marginTop: 4 }}>
                      Você ainda tem <strong>{attempts} tentativa{attempts === 1 ? '' : 's'}</strong>.
                    </p>
                    <button className="overlay-btn" onClick={startCountdown}>
                      🔁 Tentar de novo
                    </button>
                  </>
                ) : (
                  <>
                    <p className="overlay-hint" style={{ marginTop: 4 }}>
                      Acabaram suas tentativas. Confirme presença abaixo!
                    </p>
                    <button className="overlay-btn ghost" onClick={() => setGameState('noattempts')}>
                      Ver convite
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Overlay: sem tentativas */}
          {gameState === 'noattempts' && (
            <div className="game-overlay">
              <div className="overlay-card">
                <div className="overlay-eyebrow">🏁 Fim de jogo</div>
                <h3>Suas {MAX_ATTEMPTS} tentativas acabaram</h3>
                <p className="overlay-hint">
                  Melhor resultado: <strong style={{ color: 'var(--star)' }}>{bestScore.coins}/{TOTAL_COINS}</strong>
                  {bestScore.coins >= TOTAL_COINS && ` em ${(bestScore.timeMs / 1000).toFixed(1)}s`}
                </p>
                <p className="overlay-hint" style={{ marginTop: 4 }}>
                  Esse score vai junto quando você confirmar presença ⬇️
                </p>
              </div>
            </div>
          )}
        </div>

        {/* controles */}
        <div className="ctrls">
          <div className="dpad">
            <button
              className="ctrl-btn"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); press('left'); }}
              onMouseUp={release}
              onMouseLeave={release}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); press('left'); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); release(); }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={gameState !== 'playing'}
              aria-label="Esquerda"
            >
              ◀
            </button>
            <button
              className="ctrl-btn"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); press('right'); }}
              onMouseUp={release}
              onMouseLeave={release}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); press('right'); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); release(); }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={gameState !== 'playing'}
              aria-label="Direita"
            >
              ▶
            </button>
          </div>
          <button
            className="ctrl-btn jump-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); jump(); }}
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); jump(); }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={gameState !== 'playing'}
            aria-label="Pular"
          >
            B
          </button>
        </div>

        <p className="ctrl-hint">
          Use ← → e <strong>B</strong> (ou <strong>espaço</strong>). 🎁 Quem mais pegar moedas ganha um presente — pra uma criança na festa (não o Vitor 😄)
        </p>
      </div>
    </section>
  );
}
