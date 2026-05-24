import { LEGAL_URLS } from '@/constants';

const ALLOWED_LEGAL_URLS = new Set<string>(Object.values(LEGAL_URLS));

const NOTIFICATION_ROUTE_PATTERNS: RegExp[] = [
  /^\/\(provider\)\/$/,
  /^\/\(provider\)\/calendar$/,
  /^\/\(provider\)\/reviews$/,
  /^\/\(provider\)\/booking-request\/[0-9a-f-]+$/i,
  /^\/\(client\)\/appointments\/[0-9a-f-]+$/i,
  /^\/\(client\)\/review\/[0-9a-f-]+$/i,
  /^\/\(shared\)\/chat\/[0-9a-f-]+$/i,
];

export const getSafeLegalUrl = (
  rawUrl: string | string[] | undefined,
): string | null => {
  const value = (Array.isArray(rawUrl) ? rawUrl[0] : rawUrl)?.trim() ?? '';
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return null;
    return ALLOWED_LEGAL_URLS.has(parsed.toString()) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export const getSafeNotificationRoute = (
  rawRoute: unknown,
): string | null => {
  if (typeof rawRoute !== 'string') return null;
  const route = rawRoute.trim();
  if (!route.startsWith('/')) return null;
  return NOTIFICATION_ROUTE_PATTERNS.some((pattern) => pattern.test(route))
    ? route
    : null;
};
