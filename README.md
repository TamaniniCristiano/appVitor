# 🎂 appVitor — Frontend Next.js

Convite digital com tema Super Mario Galaxy para a festa de 6 anos do Vitor Rafael.
Backend Express + Postgres vive em [apiVitor](https://github.com/TamaniniCristiano/apiVitor) e roda no VPS.

```
[ Vercel: Next.js ]  ─ HTTPS ─→  [ VPS: Express + Postgres ]
```

## 🧭 Rotas

| Rota | Descrição |
|---|---|
| `/` | Aviso de "convite privado" + logo |
| `/c/:token` | Convite gated por código (3 estados: code → invite/confirmed) |
| `/admin/login` | Login do admin |
| `/admin` | Painel: cadastrar convidados, ver RSVPs, gerar link WhatsApp |

## 🛠️ Dev local

Pré-requisito: backend rodando em `http://localhost:4000`.

```bash
npm install
cp .env.example .env.local
# .env.local em dev:
#   API_URL=http://localhost:4000
# (NÃO setar NEXT_PUBLIC_API_URL — deixa o Next usar rewrite proxy)
npm run dev    # http://localhost:3000
```

## 🚀 Deploy na Vercel

1. Push pra `appVitor` no GitHub
2. No painel Vercel: **New Project** → import `appVitor`
3. Framework preset: Next.js (autodetectado)
4. **Settings → Environment Variables**:

   | Nome | Valor | Onde |
   |---|---|---|
   | `API_URL` | `https://api.seudominio.com.br` | Server-side (Server Components) |
   | `NEXT_PUBLIC_API_URL` | `https://api.seudominio.com.br` | Client-side (browser) |

5. Deploy. A primeira build pega `~2min`.

### Domínio customizado (opcional)

Settings → Domains → Add. A Vercel te orienta pra apontar o CNAME.

## 🧩 Como funciona

- **Server Components** (`app/c/[token]/page.tsx`) buscam o nome do convidado no backend usando `API_URL` (server-side env, não vai pro browser)
- **Client Components** chamam o backend via `NEXT_PUBLIC_API_URL` (exposto ao browser)
- **`credentials: 'include'`** em toda fetch pra mandar o cookie de sessão cross-domain
- **Em dev** (localhost), o `next.config.mjs` faz rewrite `/api/*` → backend pra evitar CORS/cookie cross-port

## 🎨 Assets

- **Logo Vitor Rafael**: `public/img/LogoVitorRafael.svg` (Mario-style colorido)
- **Foto Vitor**: `public/img/vitor.jpg` (você adiciona — placeholder com letra "V" se faltar)
- **Personagens Mario** (Mario, Luigi, Peach, Yoshi, Toad, Rosalina, Bowser Jr.): hot-linked do CDN da Nintendo (`assets.nintendo.com`)

## 🧱 Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Geologica (Google Fonts) — mesma fonte do site da Nintendo
- CSS vanilla (sem Tailwind) com glass-morphism, gradientes, animações
