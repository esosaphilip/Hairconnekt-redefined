import { Alert, Linking } from 'react-native';
import { debugError } from './logger';

export const SUPPORT_EMAIL = 'support@hairconnekt.de';

export function buildMailtoUrl(to: string, subject?: string, body?: string): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `mailto:${to}${query}`;
}

export function buildReportProfileMail(provider: {
  id: string;
  businessName?: string | null;
}): { subject: string; body: string } {
  return {
    subject: `Profil melden: ${provider.businessName || provider.id}`,
    body: `Provider-ID: ${provider.id}\n\nGrund:`,
  };
}

export async function openMailto(
  url: string,
  fallbackAddress: string,
  t: (key: string) => string,
): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (err) {
    debugError('openMailto failed', err);
    Alert.alert(t('error'), `${t('mailUnavailable')} ${fallbackAddress}`);
    return false;
  }
}
