import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  WEBSITE_URL,
  detectPlatform,
  resolveAppStoreTarget,
  sanitizeSrc,
} from '../src/app-redirect/app-store-target';

describe('app-store-target helper', () => {
  const IPHONE_SAFARI_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const IPAD_UA =
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const INSTAGRAM_IPHONE_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0.0 (iPhone; iOS 17_0; ...)';
  const ANDROID_CHROME_UA =
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  const TIKTOK_ANDROID_UA =
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 TikTok/30.0.0';
  const MACOS_SAFARI_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  const WINDOWS_CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const WHATSAPP_UA = 'WhatsApp/2.23.12.77 A';

  describe('detectPlatform', () => {
    it('returns ios for a real iPhone Safari User-Agent', () => {
      expect(detectPlatform(IPHONE_SAFARI_UA)).toBe('ios');
    });

    it('returns ios for a User-Agent containing iPad', () => {
      expect(detectPlatform(IPAD_UA)).toBe('ios');
    });

    it('returns ios for an Instagram in-app browser User-Agent on iPhone', () => {
      expect(detectPlatform(INSTAGRAM_IPHONE_UA)).toBe('ios');
    });

    it('returns android for a real Android Chrome User-Agent', () => {
      expect(detectPlatform(ANDROID_CHROME_UA)).toBe('android');
    });

    it('returns android for a TikTok in-app browser User-Agent on Android', () => {
      expect(detectPlatform(TIKTOK_ANDROID_UA)).toBe('android');
    });

    it('returns other for a macOS Safari User-Agent', () => {
      expect(detectPlatform(MACOS_SAFARI_UA)).toBe('other');
    });

    it('returns other for a Windows Chrome User-Agent', () => {
      expect(detectPlatform(WINDOWS_CHROME_UA)).toBe('other');
    });

    it('returns other for a WhatsApp link-preview bot User-Agent', () => {
      expect(detectPlatform(WHATSAPP_UA)).toBe('other');
    });

    it('returns other for an empty string User-Agent', () => {
      expect(detectPlatform('')).toBe('other');
    });

    it('returns other for an undefined User-Agent', () => {
      expect(detectPlatform(undefined)).toBe('other');
    });

    it('returns other for a null User-Agent', () => {
      expect(detectPlatform(null)).toBe('other');
    });
  });

  describe('resolveAppStoreTarget', () => {
    it('returns the App Store URL for an iPhone User-Agent', () => {
      expect(resolveAppStoreTarget(IPHONE_SAFARI_UA)).toBe(APP_STORE_URL);
    });

    it('returns the Google Play URL for an Android User-Agent', () => {
      expect(resolveAppStoreTarget(ANDROID_CHROME_UA)).toBe(PLAY_STORE_URL);
    });

    it('returns the website URL for a desktop User-Agent', () => {
      expect(resolveAppStoreTarget(MACOS_SAFARI_UA)).toBe(WEBSITE_URL);
    });

    it('returns the website URL when User-Agent is undefined', () => {
      expect(resolveAppStoreTarget(undefined)).toBe(WEBSITE_URL);
    });
  });

  describe('sanitizeSrc', () => {
    it('returns the lowercase tag for a valid src', () => {
      expect(sanitizeSrc('flyer-wuppertal')).toBe('flyer-wuppertal');
    });

    it('lowercases a valid src with uppercase letters', () => {
      expect(sanitizeSrc('Poster')).toBe('poster');
    });

    it('returns null for a src containing a space', () => {
      expect(sanitizeSrc('a b')).toBeNull();
    });

    it('returns null for a src containing HTML special characters', () => {
      expect(sanitizeSrc('<script>')).toBeNull();
    });

    it('returns null for a src longer than 40 characters', () => {
      expect(sanitizeSrc('a'.repeat(41))).toBeNull();
    });

    it('returns null for an array src', () => {
      expect(sanitizeSrc(['x'])).toBeNull();
    });

    it('returns null for an object src', () => {
      expect(sanitizeSrc({})).toBeNull();
    });

    it('returns null for an undefined src', () => {
      expect(sanitizeSrc(undefined)).toBeNull();
    });
  });
});
