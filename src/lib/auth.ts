import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { User } from './types';
import { getUserById } from './users';
import { syncAutomaticCreatorRole } from './creator-role-sync';

const SESSION_COOKIE_NAME = 'mod_library_session';
const LEGACY_SESSION_COOKIE_NAMES = [
  SESSION_COOKIE_NAME,
  'session',
  'mod-library-session',
  'userId',
] as const;

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEVELOPMENT_SECRET =
  'mod-library-development-secret-change-me';

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

function getSessionSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    '';

  if (secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Thiếu AUTH_SECRET an toàn trong môi trường production.',
    );
  }

  return DEVELOPMENT_SECRET;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parseSignedSessionToken(token: string): SessionPayload | null {
  const tokenParts = token.split('.');

  if (tokenParts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = tokenParts;

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as Partial<SessionPayload>;

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

function extractUserIdFromCookie(value: string): string | null {
  const signedPayload = parseSignedSessionToken(value);

  if (signedPayload) {
    return signedPayload.userId;
  }

  // Cookie cũ không có chữ ký chỉ được hỗ trợ khi phát triển.
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const trimmedValue = value.trim();

  if (
    trimmedValue &&
    trimmedValue.length <= 200 &&
    !trimmedValue.includes('.') &&
    !trimmedValue.includes('/') &&
    !trimmedValue.includes('\\')
  ) {
    return trimmedValue;
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8 || password.length > 128) {
    throw new Error('Mật khẩu phải có từ 8 đến 128 ký tự.');
  }

  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!password || !passwordHash || password.length > 128) {
    return false;
  }

  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

export async function createSession(
  userOrUserId: User | string,
): Promise<void> {
  const userId =
    typeof userOrUserId === 'string'
      ? userOrUserId
      : userOrUserId.id;

  if (!userId.trim()) {
    throw new Error('Không thể tạo session khi thiếu userId.');
  }

  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE_NAME,
    createSessionToken(userId),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
      priority: 'high',
    },
  );
}

export const setSession = createSession;

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();

  for (const cookieName of LEGACY_SESSION_COOKIE_NAMES) {
    cookieStore.set(cookieName, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      priority: 'high',
    });
  }
}

export const clearSession = deleteSession;

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  let userId: string | null = null;

  for (const cookieName of LEGACY_SESSION_COOKIE_NAMES) {
    const cookieValue = cookieStore.get(cookieName)?.value;

    if (!cookieValue) continue;

    userId = extractUserIdFromCookie(cookieValue);

    if (userId) break;
  }

  if (!userId) {
    return null;
  }

  const user = await getUserById(userId);

  if (!user || user.isActive === false) {
    return null;
  }

  return syncAutomaticCreatorRole(user);
}

export async function requireRole(
  allowedRoles: User['role'] | User['role'][],
): Promise<User | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  const roles = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  return roles.includes(user.role) ? user : null;
}

export async function requireCreator(): Promise<User | null> {
  return requireRole(['MODDER', 'ADMIN']);
}

export async function requireAdmin(): Promise<User | null> {
  return requireRole('ADMIN');
}

export { SESSION_COOKIE_NAME };
