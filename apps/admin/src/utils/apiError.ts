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

