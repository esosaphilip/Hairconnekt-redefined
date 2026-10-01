export function isAuthError(error: unknown): boolean {
  if (!error) return false;
  const status =
    (error as any)?.status ??
    (error as any)?.response?.status;
  if (status === 401 || status === 403) {
    return true;
  }
  const msg = (error as any)?.message ?? String(error);
  if (typeof msg === 'string' && msg.includes('No authentication token')) {
    return true;
  }
  return false;
}
