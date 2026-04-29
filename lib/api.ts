// Wrapper de chamadas pra API Express.
//
// Server-side (Server Components): usa API_URL (env privada, server-only)
// Client-side (browser):
//   - Se NEXT_PUBLIC_API_URL setado → chama backend direto (cross-origin, prod com Vercel)
//   - Senão → usa caminho relativo (proxy do Next em dev, mesmo origem)

const SERVER_API = process.env.API_URL || 'http://localhost:4000';
const CLIENT_API = process.env.NEXT_PUBLIC_API_URL || '';

function url(path: string) {
  if (typeof window === 'undefined') return `${SERVER_API}${path}`;
  return `${CLIENT_API}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: Error & { status?: number; body?: unknown } = new Error(
      body.error || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

// ============== Tipos ==============
export type Guest = {
  id: string;
  name: string;
  nickname: string | null;
  phone: string;
  invite_token: string;
  invite_code: string;
  access_count: number;
  max_access: number;
  rsvp_status: 'sim' | 'nao' | 'talvez' | null;
  rsvp_count: number | null;
  rsvp_note: string | null;
  rsvp_at: string | null;
  created_at: string;
};

export type ValidateResp =
  | { view: 'invite';    name: string; nickname: string | null; access_count: number; max_access: number; rsvp_status: Guest['rsvp_status'] }
  | { view: 'confirmed'; name: string; nickname: string | null; rsvp_status: Guest['rsvp_status'] };

// ============== Públicas ==============
export const inviteApi = {
  info: (token: string) =>
    request<{ name: string; nickname: string | null }>(`/api/invite/info/${encodeURIComponent(token)}`),
  validate: (token: string, code: string) =>
    request<ValidateResp>(`/api/invite/validate`, {
      method: 'POST',
      body: JSON.stringify({ token, code }),
    }),
  rsvp: (data: {
    token: string;
    code: string;
    presenca: 'sim' | 'nao' | 'talvez';
    quantidade: number;
    observacao?: string;
  }) =>
    request<{ ok: true }>(`/api/invite/rsvp`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============== Auth ==============
export const authApi = {
  login: (user: string, password: string) =>
    request<{ ok: true }>(`/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ user, password }),
    }),
  logout: () => request<{ ok: true }>(`/api/auth/logout`, { method: 'POST' }),
  me: () => request<{ authenticated: boolean }>(`/api/auth/me`),
};

// ============== Admin ==============
export const adminApi = {
  list: () => request<{ guests: Guest[] }>(`/api/admin/guests`),
  create: (name: string, phone: string, nickname?: string) =>
    request<{ guest: Guest }>(`/api/admin/guests`, {
      method: 'POST',
      body: JSON.stringify({ name, phone, nickname: nickname || undefined }),
    }),
  reset: (id: string) =>
    request<{ guest: Guest }>(`/api/admin/guests/${id}/reset`, { method: 'POST' }),
  remove: (id: string) =>
    request<{ ok: true }>(`/api/admin/guests/${id}`, { method: 'DELETE' }),
};
