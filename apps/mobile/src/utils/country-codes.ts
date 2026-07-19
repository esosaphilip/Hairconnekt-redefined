export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  iso: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+49', country: 'Deutschland', flag: '🇩🇪', iso: 'DE' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', iso: 'NG' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭', iso: 'GH' },
  { code: '+237', country: 'Kamerun', flag: '🇨🇲', iso: 'CM' },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮', iso: 'CI' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳', iso: 'SN' },
  { code: '+228', country: 'Togo', flag: '🇹🇬', iso: 'TG' },
  { code: '+243', country: 'Kongo (DRC)', flag: '🇨🇩', iso: 'CD' },
  { code: '+44', country: 'Vereinigtes Kgr.', flag: '🇬🇧', iso: 'GB' },
  { code: '+33', country: 'Frankreich', flag: '🇫🇷', iso: 'FR' },
  { code: '+31', country: 'Niederlande', flag: '🇳🇱', iso: 'NL' },
  { code: '+32', country: 'Belgien', flag: '🇧🇪', iso: 'BE' },
  { code: '+43', country: 'Österreich', flag: '🇦🇹', iso: 'AT' },
  { code: '+41', country: 'Schweiz', flag: '🇨🇭', iso: 'CH' },
  { code: '+1', country: 'USA / Kanada', flag: '🇺🇸', iso: 'US' },
];

export const isValidInternationalPhone = (full: string): boolean =>
  /^\+\d{7,15}$/.test(full.replace(/[\s\-\(\)]/g, ''));

export const sanitizePhoneNumber = (dialCode: string, number: string): string => {
  const cleaned = number.replace(/[\s\-\(\)]/g, '');
  const withoutLeadingZero = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
  return `${dialCode}${withoutLeadingZero}`;
};
