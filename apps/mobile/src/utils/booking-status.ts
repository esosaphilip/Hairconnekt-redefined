export const bookingStatus = (s?: string): string =>
  s?.toLowerCase() ?? '';

const STATUS_LABELS: Record<'de' | 'en', Record<string, string>> = {
  de: {
    pending: 'Ausstehend',
    confirmed: 'Bestätigt',
    in_progress: 'In Bearbeitung',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
    no_show: 'Nicht erschienen',
  },
  en: {
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  },
};

export const bookingStatusLabel = (s?: string, lang: 'de' | 'en' = 'de'): string =>
  STATUS_LABELS[lang]?.[bookingStatus(s)] ?? (lang === 'en' ? 'Unknown' : 'Unbekannt');
