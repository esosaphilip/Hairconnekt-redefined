import axios from 'axios';

const stringifyMessage = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => stringifyMessage(v)).filter(Boolean).join(', ');
  if (value && typeof value === 'object' && 'message' in (value as any)) {
    return stringifyMessage((value as any).message);
  }
  return '';
};

export const formatApiError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const requestId = (err.response?.headers as any)?.['x-request-id'];
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

