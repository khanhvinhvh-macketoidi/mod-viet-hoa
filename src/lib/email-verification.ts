import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

const DEFAULT_TTL_HOURS = 24;

export type EmailVerificationToken = {
  token: string;
  tokenHash: string;
  expiresAt: string;
};

function verificationTtlHours(): number {
  const value = Number(
    process.env.EMAIL_VERIFICATION_TTL_HOURS ?? DEFAULT_TTL_HOURS,
  );

  if (!Number.isFinite(value) || value < 1 || value > 168) {
    return DEFAULT_TTL_HOURS;
  }

  return Math.floor(value);
}

export function hashEmailVerificationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createEmailVerificationToken(): EmailVerificationToken {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Date.now() + verificationTtlHours() * 60 * 60 * 1000,
  ).toISOString();

  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt,
  };
}

export function isEmailVerificationExpired(expiresAt?: string): boolean {
  if (!expiresAt) return true;

  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= Date.now();
}
