import type { Lang } from '@/contexts/LanguageContext';

const ERROR_MAP: Record<number, { de: string; en: string }> = {
  0: { de: 'Keine Internetverbindung. Bitte versuche es erneut.', en: 'No internet connection. Please try again.' },
  400: { de: 'Ungültige Eingabe. Bitte prüfe deine Daten.', en: 'Invalid input. Please check your data.' },
  401: { de: 'Nicht autorisiert. Bitte melde dich erneut an.', en: 'Unauthorized. Please sign in again.' },
  403: { de: 'Zugriff verweigert.', en: 'Access denied.' },
  404: { de: 'Nicht gefunden.', en: 'Not found.' },
  409: { de: 'Diese E-Mail-Adresse ist bereits registriert.', en: 'This email address is already registered.' },
  422: { de: 'Ungültige Daten. Bitte alle Felder prüfen.', en: 'Invalid data. Please check all fields.' },
  408: { de: 'Zeitüberschreitung. Bitte versuche es erneut.', en: 'Request timed out. Please try again.' },
  500: { de: 'Serverfehler. Bitte versuche es später erneut.', en: 'Server error. Please try again later.' },
};

export function mapHttpError(statusCode?: number, fallback?: string, lang: Lang = 'de'): string {
  const entry = ERROR_MAP[statusCode ?? 0];
  if (entry) return entry[lang];
  return fallback ?? (lang === 'en' ? 'An unknown error occurred.' : 'Ein unbekannter Fehler ist aufgetreten.');
}
