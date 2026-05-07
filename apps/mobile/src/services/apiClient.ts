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
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
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

const sleep = async (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<Response> => {
  const ms = timeoutMs ?? 20000;
  if (!ms || ms <= 0) return fetch(url, init);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  const signal = init.signal;
  if (signal?.aborted) {
    clearTimeout(timeout);
    throw new ApiError('Request aborted', 0, null);
  }
  const onAbort = () => controller.abort();
  signal?.addEventListener?.('abort', onAbort, { once: true } as any);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (controller.signal.aborted) {
      throw new ApiError('Request timed out', 408, null);
    }
    throw new ApiError('Network request failed', 0, err?.message ?? null);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.('abort', onAbort as any);
  }
};

const refreshAccessToken = async (): Promise<string> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetchWithTimeout(joinUrl(API, '/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }, 20000);

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
  const {
    auth = false,
    headers = {},
    timeoutMs,
    retryCount = 0,
    retryDelayMs = 400,
    ...init
  } = options;
  const url = joinUrl(API, path);

  const run = async (accessToken?: string): Promise<Response> => {
    const mergedHeaders: Record<string, string> = { ...headers };
    if (accessToken) mergedHeaders.Authorization = `Bearer ${accessToken}`;
    return fetchWithTimeout(url, { ...init, headers: mergedHeaders }, timeoutMs);
  };

  if (!auth) return run();

  const token = await tokenStorage.getAccessToken();
  if (!token) throw new Error('No authentication token');

  const method = String(init.method ?? 'GET').toUpperCase();
  const canRetry = method === 'GET';

  let attempt = 0;
  let res: Response;
  while (true) {
    try {
      res = await run(token);
      break;
    } catch (err) {
      if (!canRetry || attempt >= retryCount) throw err;
      await sleep(retryDelayMs * Math.pow(2, attempt));
      attempt += 1;
    }
  }
  if (res.status !== 401) return res;

  try {
    const nextToken = await refreshAccessToken();
    attempt = 0;
    while (true) {
      try {
        res = await run(nextToken);
        break;
      } catch (err) {
        if (!canRetry || attempt >= retryCount) throw err;
        await sleep(retryDelayMs * Math.pow(2, attempt));
        attempt += 1;
      }
    }
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
