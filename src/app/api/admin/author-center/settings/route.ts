import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCultivationSettings,
  saveCultivationSettings,
} from '@/lib/cultivation';


import { createSafeRedirectUrl } from '@/lib/production/url';
export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  const formData = await request.formData();
  const settings = await getCultivationSettings();
  const early = Number(formData.get('earlyPhasePercent'));
  const middle = Number(formData.get('middlePhasePercent'));

  if (!Number.isFinite(early) || !Number.isFinite(middle) || early < 1 || middle <= early || middle > 99) {
    return new Response('Mốc tiểu cảnh giới không hợp lệ', { status: 400 });
  }

  const realms = settings.realms.map((realm) => {
    const requiredXp = Number(formData.get(`realmXp_${realm.id}`));
    if (!Number.isFinite(requiredXp) || requiredXp < 1) throw new Error(`Mốc ${realm.name} không hợp lệ`);
    return { ...realm, requiredXp: Math.round(requiredXp) };
  });

  await saveCultivationSettings({ ...settings, earlyPhasePercent: early, middlePhasePercent: middle, realms, updatedAt: new Date().toISOString() });
  revalidatePath('/admin/author-center');
  revalidatePath('/profile');
  revalidatePath('/authors/[slug]', 'page');

  return NextResponse.redirect(createSafeRedirectUrl('/admin/author-center', request), 303);
}
