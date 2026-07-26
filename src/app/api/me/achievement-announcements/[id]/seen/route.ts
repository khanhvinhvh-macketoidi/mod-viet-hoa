import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security/request-security';
import { markAchievementAnnouncementSeen } from '@/lib/achievement-announcement-repository';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await context.params;
  const seen = await markAchievementAnnouncementSeen(user.id, id);

  if (!seen) {
    return NextResponse.json(
      { ok: false, message: 'Không tìm thấy thông báo.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
