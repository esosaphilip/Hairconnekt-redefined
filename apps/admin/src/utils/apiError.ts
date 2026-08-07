import axios from 'axios';

type MessageHolder = {
  message: unknown;
};

const isMessageHolder = (value: object): value is MessageHolder =>
  'message' in value;

const stringifyMessage = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => stringifyMessage(v)).filter(Boolean).join(', ');
  if (value && typeof value === 'object' && isMessageHolder(value)) {
    return stringifyMessage(value.message);
  }
  return '';
};

export const formatApiError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const headers = err.response?.headers as Record<string, string | undefined> | undefined;
    const requestId = headers?.['x-request-id'];
    const backendMessage = stringifyMessage(err.response?.data);

    const parts: string[] = [];
    if (typeof status === 'number') parts.push(`Status: ${status}`);
    if (backendMessage) parts.push(backendMessage);
    if (requestId) parts.push(`requestId: ${requestId}`);
    if (parts.length > 0) return parts.join(' • ');
  }

  if (err instanceof Error && err.message) return err.message;
  return 'Unbekannter Fehler.';
};

const NAME_KEYWORDS = [
  'existiert bereits',
  'already exists',
  'duplicate key',
  'unique constraint',
  'Name ist erforderlich',
];

export function tryExtractNameFieldError(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const status = err.response?.status;
  if (status !== 400 && status !== 409 && status !== 422) return null;
  const backendMessage = stringifyMessage(err.response?.data);
  if (!backendMessage) return null;
  const haystack = backendMessage.toLowerCase();
  const hit = NAME_KEYWORDS.some((kw) => haystack.includes(kw.toLowerCase()));
  if (!hit) return null;
  // Strip leading/trailing "Status: 409 • " prefix possibly embedded by other callers
  return backendMessage.replace(/^Status:\s*\d+\s*[•\u2022-]\s*/i, '').trim() || backendMessage;
}

