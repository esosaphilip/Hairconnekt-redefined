import { API } from '../utils/api';
import { tokenStorage } from '../utils/token-storage';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  auth?: boolean;
  headers?: Record<string, string>;
};

let refreshInFlight: Promise<string> | null = null;

const joinUrl = (base: string, path: string): string => {
  const b = base.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
};

const parseJsonOrText = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const refreshAccessToken = async (): Promise<string> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch(joinUrl(API, '/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const body = await parseJsonOrText(res);
    if (!res.ok || typeof body !== 'object' || body === null) {
      throw new ApiError('Token refresh failed', res.status, body);
    }

    const data = body as any;
    const accessToken = String(data.accessToken ?? '');
    const nextRefreshToken = String(data.refreshToken ?? '');
    const role = (data.user?.role as 'client' | 'provider' | undefined) ?? null;

    if (!accessToken || !nextRefreshToken || (role !== 'client' && role !== 'provider')) {
      throw new ApiError('Token refresh response invalid', res.status, body);
    }

    await tokenStorage.save(accessToken, nextRefreshToken, role);
    return accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
};

export const apiFetch = async (path: string, options: ApiRequestOptions = {}): Promise<Response> => {
  const { auth = false, headers = {}, ...init } = options;
  const url = joinUrl(API, path);

  const run = async (accessToken?: string): Promise<Response> => {
    const mergedHeaders: Record<string, string> = { ...headers };
    if (accessToken) mergedHeaders.Authorization = `Bearer ${accessToken}`;
    return fetch(url, { ...init, headers: mergedHeaders });
  };

  if (!auth) return run();

  const token = await tokenStorage.getAccessToken();
  if (!token) throw new Error('No authentication token');

  let res = await run(token);
  if (res.status !== 401) return res;

  try {
    const nextToken = await refreshAccessToken();
    res = await run(nextToken);
    return res;
  } catch {
    await tokenStorage.clear();
    return res;
  }
};

export const apiJson = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const res = await apiFetch(path, options);
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in (body as any)
      ? String((body as any).message)
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
};
