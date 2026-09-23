import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data as Record<string, unknown>, { status });
}

/** Wrap a route handler: converts thrown ApiError / ZodError into clean JSON responses. */
export function route(handler: () => Promise<NextResponse> | NextResponse): Promise<NextResponse> {
  return Promise.resolve()
    .then(handler)
    .catch((err: unknown) => {
      if (err instanceof ApiError) {
        return json({ error: err.message, code: err.code }, err.status);
      }
      if (err instanceof ZodError) {
        return json({ error: 'Validation failed', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, 400);
      }
      console.error('[api]', err);
      return json({ error: 'Internal server error' }, 500);
    });
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as unknown as T;
  } catch {
    throw new ApiError(400, 'Invalid JSON body');
  }
}

/* ── Simple in-process rate limiter (per server instance) ── */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) buckets.clear(); // safety valve
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}
