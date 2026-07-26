import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security/request-security';
import {
  getReputationSettings,
  saveReputationSettings,
} from '@/lib/reputation';

type TierInput = {
  id?: string;
  name?: string;
  minPoints?: number;
  color?: string;
};

type Body = {
  tiers?: TierInput[];
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const current = await getReputationSettings();
  const incoming = new Map(
    Array.isArray(body.tiers)
      ? body.tiers.map((tier) => [String(tier.id ?? ''), tier])
      : [],
  );

  const tiers = current.tiers.map((tier) => {
    const next = incoming.get(tier.id);
    return {
      ...tier,
      name: String(next?.name ?? tier.name).trim() || tier.name,
      minPoints: Math.max(
        0,
        Math.round(Number(next?.minPoints ?? tier.minPoints) || 0),
      ),
      color: String(next?.color ?? tier.color),
    };
  });

  await saveReputationSettings({ ...current, tiers });
  revalidatePath('/admin/reputation');
  revalidatePath('/profile');
  revalidatePath('/authors/[slug]', 'page');

  return NextResponse.json({ ok: true });
}
