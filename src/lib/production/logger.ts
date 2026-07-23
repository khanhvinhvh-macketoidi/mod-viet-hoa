import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type LogLevel = 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(input)) {
    if (/password|secret|token|cookie|authorization/i.test(key)) output[key] = '[REDACTED]';
    else output[key] = item;
  }
  return output;
}

export async function writeProductionLog(
  level: LogLevel,
  message: string,
  context: LogContext = {},
): Promise<void> {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    context: sanitize(context),
  });

  if (level === 'error') console.error(record);
  else if (level === 'warn') console.warn(record);
  else console.info(record);

  if (process.env.LOG_TO_FILE !== 'true') return;

  try {
    const directory = path.join(process.cwd(), 'logs');
    await mkdir(directory, { recursive: true });
    await appendFile(path.join(directory, 'application.log'), `${record}\n`, 'utf8');
  } catch (error) {
    console.error('Unable to write application log', error);
  }
}

export function errorToContext(error: unknown): LogContext {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { error: String(error) };
}
