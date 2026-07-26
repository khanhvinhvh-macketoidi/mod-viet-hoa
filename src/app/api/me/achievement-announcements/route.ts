import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPendingAchievementAnnouncements } from '@/lib/achievement-announcement-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: true, announcements: [] });
  }

  const announcements = await getPendingAchievementAnnouncements(user.id);

  return NextResponse.json({
    ok: true,
    announcements,
  });
}
