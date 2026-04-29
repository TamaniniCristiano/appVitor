'use client';

import { useEffect, useRef, useState } from 'react';

const MARIO_W = 52;
const MARIO_H = 60;
const BLOCK_SIZE = 36;
const ARENA_H = 240;
const FLOOR_H = 30;
const FLOOR = 0;
const BLOCK_BOTTOM = 105;
const GRAVITY = 0.7;
const JUMP_V = 13;
const MOVE_SPEED = 5;
const NUM_BLOCKS = 10;
const COINS_PER_BLOCK = 10;
const WORLD_W = 2200; // largura total do "level"
const FIRST_BLOCK_X = 220;
const BLOCK_SPACING = 200; // distância entre blocos no eixo X

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

const MARIO_PNG =
  'https://assets.nintendo.com/image/upload/c_limit,w_320,q_auto:eco,f_auto/v1772215371/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/r8f90192da/n30s03d/mario.png';

export default function MiniGame() {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [arenaW, setArenaW] = useState(600);

  const [marioX, setMarioX] = useState(40);
  const [marioY, setMarioY] = useState(0);
  const [facing, setFacing] = useState<'right' | 'left'>('right');
  const [walking, setWalking] = useState(false);
  const movingRef = useRef<'left' | 'right' | null>(null);
  const vyRef = useRef(0);

  const [blocks, setBlocks] = useState<Block[]>(
    Array.from({ length: NUM_BLOCKS }, (_, i) => ({
      id: i + 1,
      left: FIRST_BLOCK_X + i * BLOCK_SPACING - BLOCK_SIZE / 2,
      hits: 0,
      bumping: false,
    })),
  );
  const [coins, setCoins] = useState(0);
  const [flying, setFlying] = useState<FlyingCoin[]>([]);

  // ============ Sons 8-bit (Web Audio API) ============
  const audioCtxRef = useRef<AudioContext | null>(null);
  function getCtx() {
    if (!audioCtxRef.current) {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctx = W.AudioContext || W.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }
  function playJumpSound() {
    try {
      const ctx = getCtx(); if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.14);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.2);
    } catch { /* ignore */ }
  }
  function playCoinSound() {
    try {
      const ctx = getCtx(); if (!ctx) return;
      const t = ctx.currentTime;
      [988, 1319].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const start = t + i * 0.075;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.13, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start); osc.stop(start + 0.13);
      });
    } catch { /* ignore */ }
  }
  function playBumpSound() {
    try {
      const ctx = getCtx(); if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.12);
    } catch { /* ignore */ }
  }

  // mede largura da arena
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

  // game loop
  useEffect(() => {
    let raf = 0;
    function tick() {
      if (movingRef.current === 'left') {
        setMarioX((x) => Math.max(0, x - MOVE_SPEED));
        setFacing('left');
        setWalking(true);
      } else if (movingRef.current === 'right') {
        setMarioX((x) => Math.min(WORLD_W - MARIO_W, x + MOVE_SPEED));
        setFacing('right');
        setWalking(true);
      } else {
        setWalking(false);
      }

      if (vyRef.current !== 0 || marioY > FLOOR) {
        vyRef.current -= GRAVITY;
        setMarioY((y) => {
          const ny = y + vyRef.current;
          if (ny <= FLOOR) {
            vyRef.current = 0;
            return FLOOR;
          }
          return ny;
        });
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [marioY]);

  // colisão
  useEffect(() => {
    if (vyRef.current <= 0) return;
    const marioTop = marioY + MARIO_H;
    const marioRight = marioX + MARIO_W;

    blocks.forEach((b) => {
      if (b.hits >= COINS_PER_BLOCK) return;
      const blockRight = b.left + BLOCK_SIZE;
      if (marioRight < b.left + 6 || marioX > blockRight - 6) return;
      if (marioTop >= BLOCK_BOTTOM && marioTop <= BLOCK_BOTTOM + 16) {
        vyRef.current = 0;
        playBumpSound();
        playCoinSound();
        setBlocks((prev) =>
          prev.map((x) => (x.id === b.id ? { ...x, hits: x.hits + 1, bumping: true } : x)),
        );
        setTimeout(() => {
          setBlocks((prev) =>
            prev.map((x) => (x.id === b.id ? { ...x, bumping: false } : x)),
          );
        }, 200);
        setCoins((c) => c + 1);
        const id = Date.now() + Math.random();
        setFlying((prev) => [
          ...prev,
          { id, left: b.left + BLOCK_SIZE / 2 - 12, bottom: BLOCK_BOTTOM + BLOCK_SIZE },
        ]);
        setTimeout(() => setFlying((prev) => prev.filter((c) => c.id !== id)), 800);
      }
    });
  }, [marioY, marioX, blocks]);

  // teclado
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        movingRef.current = 'left';
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        movingRef.current = 'right';
      } else if (e.key === ' ' || e.key === 'b' || e.key === 'B' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (marioY === FLOOR) {
          vyRef.current = JUMP_V;
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
  }, [marioY]);

  function press(dir: 'left' | 'right') { movingRef.current = dir; }
  function release() { movingRef.current = null; }
  function jump() {
    if (marioY === FLOOR) {
      vyRef.current = JUMP_V;
      playJumpSound();
    }
  }

  // câmera segue Mario (mantém ele aproximadamente centralizado)
  const cameraX = Math.max(
    0,
    Math.min(WORLD_W - arenaW, marioX - arenaW / 2 + MARIO_W / 2),
  );
  const totalCoins = NUM_BLOCKS * COINS_PER_BLOCK;
  const allCoinsCollected = coins >= totalCoins;
  const progress = Math.min(100, (marioX / (WORLD_W - MARIO_W)) * 100);

  return (
    <section className="minigame-section">
      <div className="minigame">
        <div className="minigame-header">
          <span className="minigame-title">🎮 Esquenta enquanto chega</span>
          <span className={`coin-counter ${allCoinsCollected ? 'all-done' : ''}`}>
            <span className="coin-icon">🪙</span>
            <span className="coin-num">{coins}/{totalCoins}</span>
          </span>
        </div>

        <div ref={arenaRef} className="arena" style={{ height: ARENA_H }}>
          {/* mundo (scrollável) */}
          <div className="world" style={{ width: WORLD_W, transform: `translateX(${-cameraX}px)` }}>
            {/* nuvenzinhas */}
            <div className="cloud-deco" style={{ left: 120, top: 18 }} />
            <div className="cloud-deco wide" style={{ left: 480, top: 40 }} />
            <div className="cloud-deco" style={{ left: 920, top: 22 }} />
            <div className="cloud-deco wide" style={{ left: 1320, top: 36 }} />
            <div className="cloud-deco" style={{ left: 1780, top: 20 }} />

            {/* blocos */}
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

            {/* moedas voando */}
            {flying.map((c) => (
              <div key={c.id} className="flying-coin" style={{ left: c.left, bottom: c.bottom }}>
                🪙
              </div>
            ))}

            {/* Mario */}
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

            {/* Bandeira do final */}
            <div className="finish-flag" style={{ left: WORLD_W - 80 }}>
              <div className="finish-pole" />
              <div className="finish-flag-cloth" />
            </div>

            {/* chão */}
            <div className="ground" style={{ height: FLOOR_H, width: WORLD_W }} />
          </div>

          {/* Barra de progresso (HUD fixo na arena) */}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* controles */}
        <div className="ctrls">
          <div className="dpad">
            <button
              className="ctrl-btn"
              onMouseDown={() => press('left')}
              onMouseUp={release}
              onMouseLeave={release}
              onTouchStart={(e) => { e.preventDefault(); press('left'); }}
              onTouchEnd={(e) => { e.preventDefault(); release(); }}
              aria-label="Esquerda"
            >
              ◀
            </button>
            <button
              className="ctrl-btn"
              onMouseDown={() => press('right')}
              onMouseUp={release}
              onMouseLeave={release}
              onTouchStart={(e) => { e.preventDefault(); press('right'); }}
              onTouchEnd={(e) => { e.preventDefault(); release(); }}
              aria-label="Direita"
            >
              ▶
            </button>
          </div>
          <button
            className="ctrl-btn jump-btn"
            onClick={jump}
            onTouchStart={(e) => { e.preventDefault(); jump(); }}
            aria-label="Pular"
          >
            B
          </button>
        </div>

        <p className="ctrl-hint">
          Use ← → e <strong>B</strong> (ou <strong>espaço</strong>) no teclado. Atravesse o level batendo nas caixinhas! 🪙
          {allCoinsCollected && <span style={{ color: 'var(--star)', marginLeft: 8 }}>★ TODAS as 100 moedas! Manda muito! ★</span>}
        </p>
      </div>
    </section>
  );
}
