import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { ADMIN_SESSION_COOKIE } from './admin-session';

export const ADMIN_CSRF_COOKIE = 'hc_admin_csrf';
export const ADMIN_CSRF_HEADER = 'x-csrf-token';

const isProduction = (): boolean =>
  (process.env.NODE_ENV ?? 'development') === 'production';

const DEFAULT_ADMIN_ORIGINS = [
  'https://admin.hairconnekt.de',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getRequestPath = (req: Request): string => {
  const raw = (req.originalUrl ?? req.url ?? '').toString();
  return raw.split('?')[0] ?? raw;
};

const safeTokenEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const buildAdminCsrfCookieOptions = () => ({
  httpOnly: false,
  secure: isProduction(),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60 * 1000,
});

export const issueAdminCsrfToken = (res: Response): string => {
  const token = randomBytes(32).toString('hex');
  res.cookie(ADMIN_CSRF_COOKIE, token, buildAdminCsrfCookieOptions());
  return token;
};

export const clearAdminCsrfCookie = (res: Response): void => {
  res.clearCookie(ADMIN_CSRF_COOKIE, {
    ...buildAdminCsrfCookieOptions(),
    maxAge: undefined,
  });
};

export const getAllowedAdminOrigins = (): Set<string> => {
  const configured = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));

  return new Set([
    ...DEFAULT_ADMIN_ORIGINS,
    ...configured,
  ]);
};

const extractRequestOrigin = (req: Request): string | null => {
  const originHeader = req.header('origin');
  if (originHeader) {
    return normalizeOrigin(originHeader);
  }

  const refererHeader = req.header('referer');
  if (!refererHeader) {
    return null;
  }

  return normalizeOrigin(refererHeader);
};

export const isAdminCsrfProtectedRequest = (req: Request): boolean => {
  if (!UNSAFE_METHODS.has(req.method.toUpperCase())) {
    return false;
  }

  const path = getRequestPath(req);
  if (path === '/api/v1/auth/admin-login') {
    return true;
  }

  const hasAdminSessionCookie = Boolean(req.cookies?.[ADMIN_SESSION_COOKIE]);
  if (!hasAdminSessionCookie) {
    return false;
  }

  return (
    path === '/api/v1/auth/admin-logout' ||
    path.startsWith('/api/v1/admin/')
  );
};

export const validateAdminCsrfRequest = (req: Request): boolean => {
  const cookieToken = req.cookies?.[ADMIN_CSRF_COOKIE];
  const headerToken =
    req.header(ADMIN_CSRF_HEADER) ?? req.header('x-xsrf-token');

  if (
    typeof cookieToken !== 'string' ||
    cookieToken.trim() === '' ||
    typeof headerToken !== 'string' ||
    headerToken.trim() === '' ||
    !safeTokenEquals(cookieToken, headerToken)
  ) {
    return false;
  }

  const origin = extractRequestOrigin(req);
  if (!origin) {
    return !isProduction();
  }

  return getAllowedAdminOrigins().has(origin);
};
