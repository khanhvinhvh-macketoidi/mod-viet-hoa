import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import { getUsers } from '@/lib/store';
import {
  consumeRateLimit,
  createSafeRedirectUrl,
  getClientIp,
  isSameOriginRequest,
  redirectWithRetry,
} from '@/lib/security/request-security';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 8;

function loginRedirect(request: Request, error?: string) {
  const url = createSafeRedirectUrl('/login', request);

  if (error) url.searchParams.set('error', error);

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
    key: `login:${ip}`,
    limit: LOGIN_ATTEMPT_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return redirectWithRetry(
      request,
      '/login?error=rate-limit',
      rateLimit.retryAfterSeconds,
    );
  }

  try {
    const formData = await request.formData();
    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase()
      .slice(0, 254);
    const password = String(formData.get('password') ?? '');

    if (!email || !password || password.length > 128) {
      return loginRedirect(request, 'invalid');
    }

    const user = (await getUsers()).find(
      (item) => item.email.trim().toLowerCase() === email,
    );

    if (
      user?.emailVerificationRequired === true &&
      !user.emailVerifiedAt
    ) {
      const url = createSafeRedirectUrl('/verify-email', request);
      url.searchParams.set('email', email);
      url.searchParams.set('status', 'required');
      return NextResponse.redirect(url, 303);
    }

    const validPassword =
      user?.isActive !== false &&
      user?.passwordHash &&
      (await verifyPassword(password, user.passwordHash));

    if (!user || !validPassword) {
      return loginRedirect(request, 'invalid');
    }

    await createSession(user);

    const response = NextResponse.redirect(
      createSafeRedirectUrl('/', request),
      303,
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return loginRedirect(request, 'invalid');
  }
}
