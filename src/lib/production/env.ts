const REQUIRED_PRODUCTION_ENV = ['APP_URL', 'AUTH_SECRET'] as const;

export function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_PRODUCTION_ENV.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }

  if ((process.env.AUTH_SECRET?.length ?? 0) < 32) {
    throw new Error(
      'AUTH_SECRET must contain at least 32 characters in production.',
    );
  }

  const appUrl = process.env.APP_URL ?? '';
  if (!appUrl.startsWith('https://')) {
    throw new Error('APP_URL must use HTTPS in production.');
  }
}
