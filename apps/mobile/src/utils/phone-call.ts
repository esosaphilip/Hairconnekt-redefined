import { Alert, Linking } from 'react-native';
import { TRANSLATIONS } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';
import { debugError } from './logger';

export function sanitizePhoneNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (!digitsOnly) return null;

  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

export async function openPhoneCall(
  rawNumber: string | undefined | null,
  lang: Lang = 'de',
): Promise<boolean> {
  if (!rawNumber) return false;

  const cleaned = sanitizePhoneNumber(rawNumber);
  if (!cleaned) {
    Alert.alert(
      TRANSLATIONS.error[lang],
      TRANSLATIONS.callUnavailable[lang],
    );
    return false;
  }

  try {
    await Linking.openURL(`tel:${cleaned}`);
    return true;
  } catch (err) {
    debugError('openPhoneCall failed', err);
    Alert.alert(
      TRANSLATIONS.error[lang],
      TRANSLATIONS.callUnavailable[lang],
    );
    return false;
  }
}
