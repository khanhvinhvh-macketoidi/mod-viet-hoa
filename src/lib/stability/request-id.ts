import 'server-only';

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function logServerError(
  context: string,
  requestId: string,
  error: unknown,
): void {
  console.error(`[${requestId}] ${context}`, error);
}
