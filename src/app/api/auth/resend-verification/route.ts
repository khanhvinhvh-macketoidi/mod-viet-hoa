import { NextResponse } from 'next/server';
import { createEmailVerificationToken } from '@/lib/email-verification';
import { sendVerificationEmail } from '@/lib/email/verification-email';
import { getUsers, saveUsers } from '@/lib/store';
import {
  consumeRateLimit,
  createSafeRedirectUrl,
  getClientIp,
  isSameOriginRequest,
  redirectWithRetry,
} from '@/lib/security/request-security';

const RESEND_WINDOW_MS = 30 * 60 * 1000;
const RESEND_LIMIT = 3;

function redirectToStatus(request: Request, email: string, status: string) {
  const url = createSafeRedirectUrl('/verify-email', request);
  if (email) url.searchParams.set('email', email);
  url.searchParams.set('status', status);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = consumeRateLimit({
    key: `resend-verification:${ip}`,
    limit: RESEND_LIMIT,
    windowMs: RESEND_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return redirectWithRetry(
      request,
      '/verify-email?status=rate-limit',
      rateLimit.retryAfterSeconds,
    );
  }

  const formData = await request.formData();
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254);

  if (!email) {
    return redirectToStatus(request, '', 'resent');
  }

  const users = await getUsers();
  const user = users.find(
    (item) => item.email.trim().toLowerCase() === email,
  );

  if (
    !user ||
    user.emailVerificationRequired !== true ||
    user.emailVerifiedAt
  ) {
    return redirectToStatus(request, email, 'resent');
  }

  const verification = createEmailVerificationToken();
  user.emailVerificationTokenHash = verification.tokenHash;
  user.emailVerificationExpiresAt = verification.expiresAt;
  user.updatedAt = new Date().toISOString();
  await saveUsers(users);

  const verificationUrl = createSafeRedirectUrl('/api/auth/verify-email', request);
  verificationUrl.searchParams.set('token', verification.token);

  try {
    await sendVerificationEmail({
      email: user.email,
      displayName: user.name,
      verificationUrl: verificationUrl.toString(),
    });
    return redirectToStatus(request, email, 'resent');
  } catch (error) {
    console.error('Resend verification failed:', error);
    return redirectToStatus(request, email, 'send-failed');
  }
}
