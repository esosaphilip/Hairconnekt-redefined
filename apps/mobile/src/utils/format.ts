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
