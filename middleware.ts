import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Proteção de /admin/*
//
// Em DEV (mesma origem via rewrite proxy do Next), o cookie do backend
// é visível pelo middleware → checa presença e redireciona pra /admin/login
// se faltar.
//
// Em PROD (Vercel + VPS, cross-domain), o cookie fica no domínio do backend
// e o middleware do Next NÃO o enxerga. Nesse caso o middleware vira no-op
// e a checagem é feita client-side: as chamadas pro backend retornam 401
// e o admin/page.tsx redireciona pra /admin/login.
const SAME_ORIGIN_DEV = process.env.NODE_ENV !== 'production';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/admin/login') return NextResponse.next();
  if (!SAME_ORIGIN_DEV) return NextResponse.next();

  const session = req.cookies.get('admin_session')?.value;
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
