import * as fs from 'fs';
import * as path from 'path';
import {
  cancellationWindowHours,
  isInsideCancellationWindow,
} from '../src/utils/cancellationWindow';

describe('T22 cancellationWindowHours valid values', () => {
  it('cancellationWindowHours maps "24h" to the number 24', () => {
    expect(cancellationWindowHours('24h')).toBe(24);
  });

  it('cancellationWindowHours maps "48h" to the number 48', () => {
    expect(cancellationWindowHours('48h')).toBe(48);
  });

  it('cancellationWindowHours maps "72h" to the number 72', () => {
    expect(cancellationWindowHours('72h')).toBe(72);
  });

  it('cancellationWindowHours falls back to 24 for undefined', () => {
    expect(cancellationWindowHours(undefined)).toBe(24);
  });

  it('cancellationWindowHours falls back to 24 for null', () => {
    expect(cancellationWindowHours(null)).toBe(24);
  });

  it('cancellationWindowHours falls back to 24 for an unknown string like "banana"', () => {
    expect(cancellationWindowHours('banana')).toBe(24);
  });
});

describe('T22 isInsideCancellationWindow window math', () => {
  const now = new Date(2025, 5, 1, 12, 0);

  const addHours = (base: Date, h: number): { scheduledDate: string; scheduledTime: string } => {
    const d = new Date(base.getTime() + h * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return { scheduledDate: `${yyyy}-${mm}-${dd}`, scheduledTime: `${hh}:${mi}` };
  };

  it('policy "24h" with appointment 30 hours ahead returns false (outside window)', () => {
    const { scheduledDate, scheduledTime } = addHours(now, 30);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime, policy: '24h', now }),
    ).toBe(false);
  });

  it('policy "24h" with appointment 23 hours ahead returns true (inside window)', () => {
    const { scheduledDate, scheduledTime } = addHours(now, 23);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime, policy: '24h', now }),
    ).toBe(true);
  });

  it('policy "48h" with appointment 30 hours ahead returns true (inside window)', () => {
    const { scheduledDate, scheduledTime } = addHours(now, 30);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime, policy: '48h', now }),
    ).toBe(true);
  });

  it('policy "48h" with appointment 49 hours ahead returns false (outside window)', () => {
    const { scheduledDate, scheduledTime } = addHours(now, 49);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime, policy: '48h', now }),
    ).toBe(false);
  });

  it('policy "72h" with appointment 71 hours ahead returns true (inside window)', () => {
    const { scheduledDate, scheduledTime } = addHours(now, 71);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime, policy: '72h', now }),
    ).toBe(true);
  });

  it('policy "72h" with appointment 73 hours ahead returns false (outside window)', () => {
    const { scheduledDate, scheduledTime } = addHours(now, 73);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime, policy: '72h', now }),
    ).toBe(false);
  });

  it('appointment in the past (negative hours) returns false', () => {
    const { scheduledDate, scheduledTime } = addHours(now, -1);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime, policy: '24h', now }),
    ).toBe(false);
  });

  it('missing scheduledDate returns false', () => {
    const { scheduledTime } = addHours(now, 5);
    expect(
      isInsideCancellationWindow({ scheduledDate: null, scheduledTime, policy: '24h', now }),
    ).toBe(false);
  });

  it('missing scheduledTime returns false', () => {
    const { scheduledDate } = addHours(now, 5);
    expect(
      isInsideCancellationWindow({ scheduledDate, scheduledTime: null, policy: '24h', now }),
    ).toBe(false);
  });
});

describe('T22 static checks for fee wording removal', () => {
  const readSrc = (relative: string) =>
    fs.readFileSync(path.join(__dirname, '..', 'src', relative), 'utf8');

  const lang = readSrc('contexts/LanguageContext.tsx');

  it('LanguageContext.tsx does not contain the English phrase "Free cancellation"', () => {
    expect(lang.includes('Free cancellation')).toBe(false);
  });

  it('LanguageContext.tsx does not contain the German phrase "Kostenlose Stornierung"', () => {
    expect(lang.includes('Kostenlose Stornierung')).toBe(false);
  });

  it('LanguageContext.tsx does not contain the string "50% fee"', () => {
    expect(lang.includes('50% fee')).toBe(false);
  });

  it('LanguageContext.tsx does not contain the string "fee of 50"', () => {
    expect(lang.includes('fee of 50')).toBe(false);
  });

  it('LanguageContext.tsx does not contain the string "Gebühr von 50"', () => {
    expect(lang.includes('Gebühr von 50')).toBe(false);
  });

  const providerAppt = readSrc('app/(provider)/appointments/[id].tsx');

  it('(provider)/appointments/[id].tsx does not reference translation key "cancelPolicyUrgent"', () => {
    expect(providerAppt.includes("'cancelPolicyUrgent'") || providerAppt.includes('"cancelPolicyUrgent"')).toBe(false);
  });

  it('(provider)/appointments/[id].tsx does not reference translation key "cancelPolicyText"', () => {
    expect(providerAppt.includes("'cancelPolicyText'") || providerAppt.includes('"cancelPolicyText"')).toBe(false);
  });

  it('(provider)/appointments/[id].tsx references the new translation key "cancelProviderNote"', () => {
    expect(providerAppt.includes("'cancelProviderNote'") || providerAppt.includes('"cancelProviderNote"')).toBe(true);
  });

  it('(provider)/appointments/[id].tsx references the new translation key "cancelProviderNoteUrgent"', () => {
    expect(providerAppt.includes("'cancelProviderNoteUrgent'") || providerAppt.includes('"cancelProviderNoteUrgent"')).toBe(true);
  });

  const translationsBlock = lang.slice(
    lang.indexOf('export const TRANSLATIONS = {'),
    lang.lastIndexOf('} as const;'),
  );

  const extractKeyValue = (key: string): { de: string; en: string } => {
    const rx = new RegExp(
      `${key}:\\s*\\{[\\s\\S]*?de:\\s*['"]([^'"]*)['"],[\\s\\S]*?en:\\s*['"]([^'"]*)['"][\\s\\S]*?\\}`,
    );
    const m = translationsBlock.match(rx);
    if (!m) throw new Error(`Key ${key} not found in TRANSLATIONS`);
    return { de: m[1], en: m[2] };
  };

  it('translation key "cancelProviderNote" has both a de and an en value', () => {
    const v = extractKeyValue('cancelProviderNote');
    expect(typeof v.de).toBe('string');
    expect(v.de.length).toBeGreaterThan(5);
    expect(typeof v.en).toBe('string');
    expect(v.en.length).toBeGreaterThan(5);
  });

  it('translation key "cancelProviderNoteUrgent" contains the "{hours}" placeholder in its de value', () => {
    expect(extractKeyValue('cancelProviderNoteUrgent').de.includes('{hours}')).toBe(true);
  });

  it('translation key "cancelProviderNoteUrgent" contains the "{hours}" placeholder in its en value', () => {
    expect(extractKeyValue('cancelProviderNoteUrgent').en.includes('{hours}')).toBe(true);
  });

  it('translation key "cancelPolicyText" contains the "{hours}" placeholder in its de value', () => {
    expect(extractKeyValue('cancelPolicyText').de.includes('{hours}')).toBe(true);
  });

  it('translation key "cancelPolicyText" contains the "{hours}" placeholder in its en value', () => {
    expect(extractKeyValue('cancelPolicyText').en.includes('{hours}')).toBe(true);
  });

  it('translation key "cancelPolicyUrgent" contains the "{hours}" placeholder in its de value', () => {
    expect(extractKeyValue('cancelPolicyUrgent').de.includes('{hours}')).toBe(true);
  });

  it('translation key "cancelPolicyUrgent" contains the "{hours}" placeholder in its en value', () => {
    expect(extractKeyValue('cancelPolicyUrgent').en.includes('{hours}')).toBe(true);
  });

  it('translation key "freeCancellationUntil" contains the "{hours}" placeholder in its de value', () => {
    expect(extractKeyValue('freeCancellationUntil').de.includes('{hours}')).toBe(true);
  });

  it('translation key "freeCancellationUntil" contains the "{hours}" placeholder in its en value', () => {
    expect(extractKeyValue('freeCancellationUntil').en.includes('{hours}')).toBe(true);
  });

  const clientProvider = readSrc('app/(client)/provider/[id].tsx');
  it('(client)/provider/[id].tsx does not reference the deleted translation key "cancellationDefault"', () => {
    expect(
      clientProvider.includes("'cancellationDefault'") || clientProvider.includes('"cancellationDefault"'),
    ).toBe(false);
  });

  const providerPreview = readSrc('app/(provider)/profile/preview.tsx');
  it('(provider)/profile/preview.tsx does not reference the deleted translation key "cancellationDefault"', () => {
    expect(
      providerPreview.includes("'cancellationDefault'") || providerPreview.includes('"cancellationDefault"'),
    ).toBe(false);
  });
});
