import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, hashPassword } from '@/lib/auth';
import { getUsers, saveUsers } from '@/lib/store';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
  redirectWithRetry,
} from '@/lib/security/request-security';


import { createSafeRedirectUrl } from '@/lib/production/url';
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_ATTEMPT_LIMIT = 4;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value),
      'Tên không hợp lệ.',
    ),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

function registerRedirect(request: Request, error: string) {
  const url = createSafeRedirectUrl('/register', request);
  url.searchParams.set('error', error);

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
    key: `register:${ip}`,
    limit: REGISTER_ATTEMPT_LIMIT,
    windowMs: REGISTER_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return redirectWithRetry(
      request,
      '/register?error=rate-limit',
      rateLimit.retryAfterSeconds,
    );
  }

  try {
    const formData = await request.formData();

    // Honeypot tương thích về sau; form hiện tại không cần thay đổi.
    if (String(formData.get('website') ?? '').trim()) {
      return registerRedirect(request, '1');
    }

    const parsed = schema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!parsed.success) {
      return registerRedirect(request, '1');
    }

    const users = await getUsers();
    const emailExists = users.some(
      (user) =>
        user.email.trim().toLowerCase() === parsed.data.email,
    );

    if (emailExists) {
      // Không tiết lộ rõ email đã tồn tại.
      return registerRedirect(request, '1');
    }

    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: 'MEMBER' as const,
      isVip: false,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    users.push(user);
    await saveUsers(users);
    await createSession(user);

    const response = NextResponse.redirect(
      createSafeRedirectUrl('/mods', request),
      303,
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Registration failed:', error);
    return registerRedirect(request, '1');
  }
}
