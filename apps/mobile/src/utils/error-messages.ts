// src/utils/error-messages.ts
// HairConnekt — German HTTP error mapping
// NEVER render error.message directly — always use this utility

export function mapHttpError(statusCode?: number, fallback?: string): string {
  const map: Record<number, string> = {
    400: 'Ungültige Eingabe. Bitte prüfe deine Daten.',
    401: 'Nicht autorisiert. Bitte melde dich erneut an.',
    403: 'Zugriff verweigert.',
    404: 'Nicht gefunden.',
    409: 'Diese E-Mail-Adresse ist bereits registriert.',
    422: 'Ungültige Daten. Bitte alle Felder prüfen.',
    500: 'Serverfehler. Bitte versuche es später erneut.',
  };
  return map[statusCode ?? 0] ?? fallback ?? 'Ein unbekannter Fehler ist aufgetreten.';
}
