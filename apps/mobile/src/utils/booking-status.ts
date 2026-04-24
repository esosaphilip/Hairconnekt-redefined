export const bookingStatus = (s?: string): string =>
  s?.toLowerCase() ?? '';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
};

export const bookingStatusLabel = (s?: string): string =>
  STATUS_LABELS[bookingStatus(s)] ?? 'Unbekannt';
