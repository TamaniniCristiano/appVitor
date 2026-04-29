import { notFound } from 'next/navigation';
import InviteApp from './InviteApp';

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function getGuest(token: string): Promise<{ name: string; nickname: string | null } | null> {
  try {
    const res = await fetch(`${API_URL}/api/invite/info/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; nickname?: string | null };
    if (!data.name) return null;
    return { name: data.name, nickname: data.nickname ?? null };
  } catch {
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await getGuest(token);
  if (!guest) notFound();
  return <InviteApp token={token} name={guest.name} nickname={guest.nickname} />;
}
