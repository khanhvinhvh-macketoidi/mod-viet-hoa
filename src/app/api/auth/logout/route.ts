import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security/request-security';


import { createSafeRedirectUrl } from '@/lib/production/url';
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  await clearSession();

  const response = NextResponse.redirect(
    createSafeRedirectUrl('/', request),
    303,
  );
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
