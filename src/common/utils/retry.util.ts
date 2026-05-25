import { Logger } from '@nestjs/common';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const TRANSIENT_ERROR_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  '57P01',
  '57P02',
  '57P03',
  '53300',
  '40P01',
];

function isTransient(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes('connection') || message.includes('timeout'))
    return true;
  if (message.includes('deadlock') || message.includes('serialization'))
    return true;
  const code = (error as unknown as Record<string, unknown>).code as
    | string
    | undefined;
  if (code && TRANSIENT_ERROR_CODES.includes(code)) return true;
  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  logger?: Logger,
  label?: string,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransient(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      if (logger) {
        logger.warn(
          `${label ?? 'Operation'} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
