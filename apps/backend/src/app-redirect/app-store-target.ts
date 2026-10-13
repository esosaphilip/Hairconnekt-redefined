export const APP_STORE_URL =
  'https://apps.apple.com/de/app/hairconnekt/id6767045706';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=de.hairconnekt.app';
export const WEBSITE_URL = 'https://hairconnekt.de';

export type AppStorePlatform = 'ios' | 'android' | 'other';

const IOS_UA_REGEX = /iPhone|iPod|iPad/i;
const ANDROID_UA_REGEX = /Android/i;
const SRC_REGEX = /^[a-z0-9-]{1,40}$/i;

export function detectPlatform(
  userAgent: string | undefined | null,
): AppStorePlatform {
  if (typeof userAgent !== 'string') {
    return 'other';
  }
  if (IOS_UA_REGEX.test(userAgent)) {
    return 'ios';
  }
  if (ANDROID_UA_REGEX.test(userAgent)) {
    return 'android';
  }
  return 'other';
}

export function resolveAppStoreTarget(
  userAgent: string | undefined | null,
): string {
  const platform = detectPlatform(userAgent);
  if (platform === 'ios') {
    return APP_STORE_URL;
  }
  if (platform === 'android') {
    return PLAY_STORE_URL;
  }
  return WEBSITE_URL;
}

export function sanitizeSrc(src: unknown): string | null {
  if (typeof src !== 'string') {
    return null;
  }
  const trimmed = src.trim();
  if (!SRC_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed.toLowerCase();
}
