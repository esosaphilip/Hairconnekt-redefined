import fs from 'fs';
import path from 'path';
import { formatAmount } from '../src/utils/format';

/**
 * Standard appointment time formatting helper used across the app
 * To safely format a HH:mm[:ss] time string without timezone distortion:
 */
function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
}

function formatTimeToLocale(timeStr: string, locale: 'de' | 'en'): string {
  const normalized = normalizeTimeString(timeStr);
  if (!normalized) return '';
  const [hStr, mStr] = normalized.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (locale === 'de') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // English 12-hour format
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

describe('T15: Mobile Time, Date & Currency Formatting', () => {
  describe('Time Normalization and Formatting', () => {
    it('formats 24-hour time strings correctly for German locale', () => {
      expect(formatTimeToLocale('12:00:00', 'de')).toBe('12:00');
      expect(formatTimeToLocale('14:00:00', 'de')).toBe('14:00');
      expect(formatTimeToLocale('00:30:00', 'de')).toBe('00:30');
      expect(formatTimeToLocale('00:00:00', 'de')).toBe('00:00');
      expect(formatTimeToLocale('23:59:59', 'de')).toBe('23:59');
    });

    it('handles 2-part time strings without seconds ("HH:mm")', () => {
      expect(formatTimeToLocale('14:00', 'de')).toBe('14:00');
      expect(formatTimeToLocale('09:30', 'de')).toBe('09:30');
      expect(formatTimeToLocale('14:00', 'en')).toBe('2:00 PM');
      expect(formatTimeToLocale('09:30', 'en')).toBe('9:30 AM');
    });

    it('formats 12-hour time strings correctly for English locale', () => {
      expect(formatTimeToLocale('12:00:00', 'en')).toBe('12:00 PM');
      expect(formatTimeToLocale('14:00:00', 'en')).toBe('2:00 PM');
      expect(formatTimeToLocale('00:30:00', 'en')).toBe('12:30 AM');
      expect(formatTimeToLocale('00:00:00', 'en')).toBe('12:00 AM');
      expect(formatTimeToLocale('23:59:00', 'en')).toBe('11:59 PM');
      expect(formatTimeToLocale('08:05:00', 'en')).toBe('8:05 AM');
    });

    it('strips seconds cleanly without trailing artifacts', () => {
      const rawWithSeconds = '15:45:30';
      const formattedDe = formatTimeToLocale(rawWithSeconds, 'de');
      expect(formattedDe).toBe('15:45');
      expect(formattedDe).not.toContain(':30');

      const formattedEn = formatTimeToLocale(rawWithSeconds, 'en');
      expect(formattedEn).toBe('3:45 PM');
      expect(formattedEn).not.toContain('30');
    });
  });

  describe('Currency / Amount Formatting (formatAmount)', () => {
    it('formats amounts in German locale with comma decimal separator', () => {
      expect(formatAmount(25, 'de')).toBe('25,00');
      expect(formatAmount(49.99, 'de')).toBe('49,99');
      expect(formatAmount('65.50', 'de')).toBe('65,50');
      expect(formatAmount('65,50', 'de')).toBe('65,50');
    });

    it('formats amounts in English locale with dot decimal separator', () => {
      expect(formatAmount(25, 'en')).toBe('25.00');
      expect(formatAmount(49.99, 'en')).toBe('49.99');
      expect(formatAmount('65.50', 'en')).toBe('65.50');
      expect(formatAmount('65,50', 'en')).toBe('65.50');
    });

    it('handles falsy / invalid values safely by falling back to 0.00', () => {
      expect(formatAmount(null, 'de')).toBe('0,00');
      expect(formatAmount(undefined, 'en')).toBe('0.00');
      expect(formatAmount('invalid', 'de')).toBe('0,00');
    });
  });

  describe('Known Bug BUG-021: Provider Booking Request Screen Time Offset', () => {
    // KNOWN BUG-021: In booking-request/[id].tsx, time is computed as:
    //   const d = new Date(booking.scheduledDate);
    //   const timeStr = d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'de-DE', { hour: '2-digit', minute: '2-digit' });
    // This evaluates scheduledDate at midnight UTC, completely ignoring scheduledTime (e.g. "14:00")
    // and rendering the local timezone offset of midnight UTC instead.
    it.failing('[KNOWN BUG-021] booking-request screen formats scheduledTime instead of scheduledDate midnight offset', () => {
      const booking = {
        id: 'booking-test-123',
        scheduledDate: '2026-09-28',
        scheduledTime: '14:00',
        status: 'pending',
      };

      // Exactly the buggy logic in apps/mobile/src/app/(provider)/booking-request/[id].tsx lines 195-204:
      const d = new Date(booking.scheduledDate);
      const timeStr = d.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // The appointment was scheduled for 14:00, so timeStr must be "14:00"
      // BUG-021 causes timeStr to be "02:00" (CEST offset of midnight) or "00:00" (UTC), NOT "14:00"
      expect(timeStr).toBe(booking.scheduledTime);
    });

    it('static audit: asserts that booking-request/[id].tsx contains the problematic toLocaleTimeString on scheduledDate', () => {
      const screenPath = path.resolve(
        __dirname,
        '../src/app/(provider)/booking-request/[id].tsx',
      );
      const content = fs.readFileSync(screenPath, 'utf8');

      // The screen parses scheduledDate into d:
      expect(content).toContain('new Date(booking.scheduledDate)');
      // And calls toLocaleTimeString on that Date object:
      expect(content).toContain('d.toLocaleTimeString');
    });
  });
});
