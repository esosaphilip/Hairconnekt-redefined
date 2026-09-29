export type AppLanguage = 'de' | 'en';

export function formatAmount(value: unknown, language: AppLanguage): string {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(',', '.'))
        : Number(value);

  const safe = Number.isFinite(n) ? n : 0;
  const locale = language === 'en' ? 'en-US' : 'de-DE';

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    const fixed = safe.toFixed(2);
    return language === 'en' ? fixed : fixed.replace('.', ',');
  }
}

export function formatRating(value: unknown, fallback: string = 'NEW'): string {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : fallback;
}

export function formatBookingTime(
  time: string | null | undefined,
  language: AppLanguage,
): string {
  if (!time || typeof time !== 'string') return '';
  const parts = time.trim().split(':');
  if (parts.length < 2) return '';
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '';
  }

  const locale = language === 'en' ? 'en-US' : 'de-DE';
  const d = new Date(2000, 0, 1, hours, minutes);

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: language === 'en' ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12: language === 'en',
    })
      .format(d)
      .replace(/\u202f/g, ' ');
  } catch {
    if (language === 'en') {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}

export function calculatePayout(
  totalPrice: number | string | null | undefined,
  platformFeeAmount?: number | string | null | undefined,
): number {
  const total = Number(totalPrice) || 0;
  const fee = Number(platformFeeAmount) || 0;
  return Math.max(0, total - fee);
}

export function formatReviewLabel(count: unknown, language: AppLanguage): string {
  const n = typeof count === 'number' ? count : Number(count);
  const safe = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  if (language === 'en') {
    return safe === 1 ? 'review' : 'reviews';
  }
  return safe === 1 ? 'Bewertung' : 'Bewertungen';
}

export function formatReviewCount(count: unknown, language: AppLanguage): string {
  const n = typeof count === 'number' ? count : Number(count);
  const safe = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  return `${safe} ${formatReviewLabel(safe, language)}`;
}

export function formatReviewDate(
  dateValue: string | number | Date | null | undefined,
  language: AppLanguage,
): string {
  if (dateValue === null || dateValue === undefined || dateValue === '') return '';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  const locale = language === 'en' ? 'en-US' : 'de-DE';
  try {
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}
