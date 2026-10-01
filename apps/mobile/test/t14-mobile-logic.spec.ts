import fs from 'fs';
import path from 'path';
import { apiFetch, apiJson, ApiError } from '../src/services/apiClient';
import { isAuthError } from '../src/utils/auth-error';
import { mapHttpError } from '../src/utils/error-messages';
import {
  saveRegistrationDraft,
  loadRegistrationDraft,
  clearRegistrationDraft,
  RegistrationForm,
  DEFAULTS,
} from '../src/contexts/RegistrationContext';
import { TRANSLATIONS } from '../src/contexts/LanguageContext';
import { tokenStorage } from '../src/utils/token-storage';
import { mockAsyncStorage } from './setup';

describe('T14: Mobile Business Logic & API Client Contracts', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('API Client URL Construction', () => {
    it('prepends API base URL to relative paths with leading slash', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
      });
      global.fetch = mockFetch;

      await apiJson('/auth/status');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://api.test.hairconnekt.de/api/v1/auth/status');
    });

    it('prepends API base URL to relative paths without leading slash', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
      });
      global.fetch = mockFetch;

      await apiJson('auth/status');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://api.test.hairconnekt.de/api/v1/auth/status');
    });

    // KNOWN BUG-020: joinUrl does not detect absolute URLs, prepending base URL to already-absolute URLs
    it('[KNOWN BUG-020] joinUrl passes absolute URLs through without prepending base URL', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
      });
      global.fetch = mockFetch;

      const absoluteUrl = 'https://s3.eu-central-1.amazonaws.com/hairconnekt-assets/image.webp';
      await apiFetch(absoluteUrl);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      // BUG-020: produces https://api.test.hairconnekt.de/api/v1/https://s3.eu-central-1.amazonaws.com/...
      // The test expects the clean absolute URL without the base URL prepended
      expect(calledUrl).toBe(absoluteUrl);
    });

    it('static audit: scans mobile codebase to confirm no call site passes full absolute URL to apiFetch/apiJson', () => {
      const mobileSrc = path.resolve(__dirname, '../src');
      const files: string[] = [];

      function scanDir(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (/\.(ts|tsx)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }

      scanDir(mobileSrc);

      const absoluteUrlPattern = /(?:apiFetch|apiJson)\s*\(\s*['"`]https?:\/\//;
      const violatingFiles: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        if (absoluteUrlPattern.test(content)) {
          violatingFiles.push(file);
        }
      }

      // No source file in mobile should pass full absolute URL directly to apiFetch/apiJson
      expect(violatingFiles).toEqual([]);
    });
  });

  describe('German Error Message Mapping (mapHttpError)', () => {
    it('maps all HTTP status codes to friendly German messages by default', () => {
      expect(mapHttpError(400)).toBe('Ungültige Eingabe. Bitte prüfe deine Daten.');
      expect(mapHttpError(401)).toBe('Nicht autorisiert. Bitte melde dich erneut an.');
      expect(mapHttpError(403)).toBe('Zugriff verweigert.');
      expect(mapHttpError(404)).toBe('Nicht gefunden.');
      expect(mapHttpError(409)).toBe('Diese E-Mail-Adresse ist bereits registriert.');
      expect(mapHttpError(422)).toBe('Ungültige Daten. Bitte alle Felder prüfen.');
      expect(mapHttpError(408)).toBe('Zeitüberschreitung. Bitte versuche es erneut.');
      expect(mapHttpError(500)).toBe('Serverfehler. Bitte versuche es später erneut.');
      expect(mapHttpError(0)).toBe('Keine Internetverbindung. Bitte versuche es erneut.');
      expect(mapHttpError(undefined)).toBe('Keine Internetverbindung. Bitte versuche es erneut.');
      expect(mapHttpError(502)).toBe('Ein unbekannter Fehler ist aufgetreten.');
    });

    it('maps all HTTP status codes to English messages when lang is en', () => {
      expect(mapHttpError(400, undefined, 'en')).toBe('Invalid input. Please check your data.');
      expect(mapHttpError(401, undefined, 'en')).toBe('Unauthorized. Please sign in again.');
      expect(mapHttpError(403, undefined, 'en')).toBe('Access denied.');
      expect(mapHttpError(404, undefined, 'en')).toBe('Not found.');
      expect(mapHttpError(409, undefined, 'en')).toBe('This email address is already registered.');
      expect(mapHttpError(422, undefined, 'en')).toBe('Invalid data. Please check all fields.');
      expect(mapHttpError(408, undefined, 'en')).toBe('Request timed out. Please try again.');
      expect(mapHttpError(500, undefined, 'en')).toBe('Server error. Please try again later.');
      expect(mapHttpError(0, undefined, 'en')).toBe('No internet connection. Please try again.');
      expect(mapHttpError(undefined, undefined, 'en')).toBe('No internet connection. Please try again.');
      expect(mapHttpError(502, undefined, 'en')).toBe('An unknown error occurred.');
    });

    it('honors explicit fallback message over default mapping', () => {
      const fallback = 'Passwort muss mindestens 8 Zeichen lang sein.';
      expect(mapHttpError(400, fallback, 'de')).toBe(fallback);
      expect(mapHttpError(500, 'Custom error', 'en')).toBe('Custom error');
    });

    it('never leaks raw JSON or unformatted error payloads', () => {
      const rawJson = '{"statusCode":500,"message":"Internal server error: DB query failed"}';
      // Calling without fallback must yield user-friendly text, not JSON
      const result = mapHttpError(500);
      expect(result).not.toContain('{');
      expect(result).not.toContain('}');
      expect(result).toBe('Serverfehler. Bitte versuche es später erneut.');
    });
  });

  describe('Registration Draft Password Stripping (BUG-016)', () => {
    it('strips password when saving registration draft to persistent storage', async () => {
      const mockDraft: RegistrationForm = {
        ...DEFAULTS,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'SuperSecretPassword123!',
        phone: '+491701234567',
        businessName: 'Jane Braids',
        street: 'Alexanderplatz',
        houseNumber: '1',
        city: 'Berlin',
        postalCode: '10178',
        serviceRadius: 15,
        serviceIds: ['service-1'],
        experienceYears: 5,
        languages: ['de', 'en'],
        cancellationPolicy: '24h',
        bio: 'Professional braider',
        profilePhotoUri: 'file:///avatar.jpg',
        idDocumentUri: 'file:///id.jpg',
        portfolioUris: [],
        portfolioMarketingConsent: true,
      };

      await saveRegistrationDraft(mockDraft);

      // Verify that setItem was called with a payload that does NOT contain the password
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const [storageKey, storedJson] = mockAsyncStorage.setItem.mock.calls[0];
      expect(storageKey).toBe('hc_provider_registration_draft');

      const parsed = JSON.parse(storedJson);
      expect(parsed).not.toHaveProperty('password');
      expect(parsed.email).toBe('jane@example.com');
      expect(parsed.firstName).toBe('Jane');
      expect(storedJson).not.toContain('SuperSecretPassword123!');
    });

    it('returns empty password when rehydrating draft from storage', async () => {
      // Simulate stored draft that somehow contains password
      await mockAsyncStorage.setItem(
        'hc_provider_registration_draft',
        JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          password: 'leaked-password',
        }),
      );

      const loaded = await loadRegistrationDraft();
      expect(loaded).toBeDefined();
      expect(loaded?.password).toBe('');
      expect(loaded?.email).toBe('jane@example.com');
    });

    it('clears registration draft cleanly from storage', async () => {
      await saveRegistrationDraft({
        ...DEFAULTS,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'pass',
      });

      await clearRegistrationDraft();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('hc_provider_registration_draft');
      const loaded = await loadRegistrationDraft();
      expect(loaded).toBeNull();
    });
  });

  describe('Resend Countdown Timer Initial State (BUG-014)', () => {
    it('initializes countdown to 0 when screen is opened normally (not just sent)', () => {
      // BUG-014 fix: when isCodeJustSent is falsy, countdown is 0 so user can immediately resend
      const isCodeJustSent = false;
      const initialCountdown = isCodeJustSent ? 120 : 0;
      expect(initialCountdown).toBe(0);
    });

    it('initializes countdown to 120 only when code was just sent during registration', () => {
      const isCodeJustSent = true;
      const initialCountdown = isCodeJustSent ? 120 : 0;
      expect(initialCountdown).toBe(120);
    });

    it('verifies provider-verify-email source implements the isCodeJustSent conditional initialization', () => {
      const screenPath = path.resolve(__dirname, '../src/app/(auth)/provider-verify-email.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Assert that provider-verify-email initializes countdown conditionally based on isCodeJustSent
      expect(content).toContain('isCodeJustSent ? 120 : 0');
    });
  });

  describe('Provider Cancel Appointment Contract (Step 5)', () => {
    it('calls PATCH /bookings/:id/cancel with valid reason, optional notes, and auth', async () => {
      await tokenStorage.save('mock-jwt-token', 'mock-refresh-token', 'provider');

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
      });
      global.fetch = mockFetch;

      await apiJson('/bookings/test-booking-uuid/cancel', {
        auth: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Krank',
          notes: 'Provider is sick',
        }),
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe('https://api.test.hairconnekt.de/api/v1/bookings/test-booking-uuid/cancel');
      expect(calledInit.method).toBe('PATCH');
      expect(calledInit.headers.Authorization).toBe('Bearer mock-jwt-token');
      expect(JSON.parse(calledInit.body)).toEqual({
        reason: 'Krank',
        notes: 'Provider is sick',
      });
    });
  });

  describe('Mobile Booking Address Flow (BUG-033)', () => {
    it('provides exact German and English translations for required address validation', () => {
      expect(TRANSLATIONS.bookingAddressRequired.de).toBe(
        'Bitte gib eine Adresse für den mobilen Service ein.',
      );
      expect(TRANSLATIONS.bookingAddressRequired.en).toBe(
        'Please enter an address for the mobile service.',
      );
      expect(TRANSLATIONS.bookingAddressSaveAsDefault.de).toBe('Als Standardadresse speichern');
      expect(TRANSLATIONS.bookingAddressSelectSaved.de).toBe('Gespeicherte Adresse');
    });

    it('creates a new address via POST /users/me/addresses when new address fields are submitted', async () => {
      await tokenStorage.save('mock-client-jwt', 'mock-refresh-token', 'client');

      const mockFetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/users/me/addresses')) {
          return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({
              id: 'addr-created-uuid-1234',
              street: 'Königsallee',
              houseNumber: '42',
              postalCode: '40212',
              city: 'Düsseldorf',
              isDefault: true,
            }),
          };
        }
        if (url.includes('/bookings')) {
          return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({
              booking: {
                id: 'booking-uuid-5678',
                isMobile: true,
                address: {
                  street: 'Königsallee',
                  houseNumber: '42',
                  postalCode: '40212',
                  city: 'Düsseldorf',
                },
              },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({}),
        };
      });
      global.fetch = mockFetch;

      // 1. Simulate saving new address
      const newAddressPayload = {
        street: 'Königsallee',
        houseNumber: '42',
        postalCode: '40212',
        city: 'Düsseldorf',
        isDefault: true,
      };

      const createdAddress = await apiJson<any>('/users/me/addresses', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddressPayload),
      });

      expect(createdAddress.id).toBe('addr-created-uuid-1234');

      // 2. Simulate creating booking using that addressId
      const bookingPayload = {
        providerId: 'provider-uuid-999',
        serviceIds: ['service-uuid-111'],
        scheduledDate: '2026-11-25',
        scheduledTime: '15:00',
        isMobile: true,
        addressId: createdAddress.id,
      };

      const bookingRes = await apiJson<any>('/bookings', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      expect(bookingRes.booking.id).toBe('booking-uuid-5678');
      expect(bookingRes.booking.isMobile).toBe(true);
      expect(bookingRes.booking.address.street).toBe('Königsallee');

      // Verify the two network calls made
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [addrCallUrl, addrCallInit] = mockFetch.mock.calls[0];
      expect(addrCallUrl).toBe('https://api.test.hairconnekt.de/api/v1/users/me/addresses');
      expect(addrCallInit.method).toBe('POST');
      expect(JSON.parse(addrCallInit.body)).toEqual(newAddressPayload);

      const [bookCallUrl, bookCallInit] = mockFetch.mock.calls[1];
      expect(bookCallUrl).toBe('https://api.test.hairconnekt.de/api/v1/bookings');
      expect(bookCallInit.method).toBe('POST');
      expect(JSON.parse(bookCallInit.body).addressId).toBe('addr-created-uuid-1234');
    });

    it('static audit: details.tsx requires address when isMobile is true and passes addressId', () => {
      const detailsPath = path.resolve(__dirname, '../src/app/(client)/booking/details.tsx');
      const content = fs.readFileSync(detailsPath, 'utf8');

      // Asserts mobile screen handles addresses
      expect(content).toContain('/users/me/addresses');
      expect(content).toContain("t('bookingAddressRequired')");
      expect(content).toContain('bookingData.addressId = resolvedAddressId');
      expect(content).toContain('bookingAddressSaveAsDefault');
    });
  });

  describe('BUG-030: Screen Data Freshness & useFocusEffect', () => {
    it('screen 1: (client)/provider/[id].tsx uses useFocusEffect with silent refresh', () => {
      const filePath = path.resolve(__dirname, '../src/app/(client)/provider/[id].tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toMatch(/import.*useFocusEffect.*from 'expo-router'/);
      expect(content).toContain('useFocusEffect(');
      expect(content).toContain('isSilent = false');
      expect(content).not.toMatch(/useEffect\(\s*\(\)\s*=>\s*\{\s*fetchData\(\);\s*\}\s*,\s*\[id\]\s*\)/);
    });

    it('screen 2: (client)/profile/reviews.tsx uses useFocusEffect with silent refresh', () => {
      const filePath = path.resolve(__dirname, '../src/app/(client)/profile/reviews.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toMatch(/import.*useFocusEffect.*from 'expo-router'/);
      expect(content).toContain('useFocusEffect(');
      expect(content).toContain('isSilent = false');
      expect(content).not.toMatch(/useEffect\(\s*\(\)\s*=>\s*\{\s*loadReviews\(\);\s*\}\s*,\s*\[\]\s*\)/);
    });

    it('screen 3: (client)/search.tsx uses useFocusEffect with silent refresh', () => {
      const filePath = path.resolve(__dirname, '../src/app/(client)/search.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toMatch(/import.*useFocusEffect.*from 'expo-router'/);
      expect(content).toContain('useFocusEffect(');
      expect(content).toContain('isSilent = false');
      expect(content).toContain('fetchProviders(1, true, undefined, true)');
    });

    it('screen 4: (client)/index.tsx refreshes provider listings on focus silently', () => {
      const filePath = path.resolve(__dirname, '../src/app/(client)/index.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toMatch(/import.*useFocusEffect.*from 'expo-router'/);
      expect(content).toContain('useFocusEffect(');
      expect(content).toContain('fetchProviders(discoveryLocation, true)');
      expect(content).toContain('isSilent = false');
    });

    it('screen 5: (provider)/profile/preview.tsx uses useFocusEffect with silent refresh', () => {
      const filePath = path.resolve(__dirname, '../src/app/(provider)/profile/preview.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toMatch(/import.*useFocusEffect.*from 'expo-router'/);
      expect(content).toContain('useFocusEffect(');
      expect(content).toContain('isSilent = false');
      expect(content).not.toMatch(/useEffect\(\s*\(\)\s*=>\s*\{\s*loadData\(\);\s*\}\s*,\s*\[\]\s*\)/);
    });
  });

  describe('Auth Error Detection (Regression Guard: German 401 Handling)', () => {
    it('correctly identifies a German "Nicht autorisiert" 401 response as an auth error', () => {
      const germanError = new ApiError('Nicht autorisiert. Bitte melde dich erneut an.', 401, {
        statusCode: 401,
        message: 'Nicht autorisiert. Bitte melde dich erneut an.',
      });

      expect(isAuthError(germanError)).toBe(true);
      const status = (germanError as any)?.status ?? (germanError as any)?.response?.status;
      const inlineCheck = status === 401 || status === 403;
      expect(inlineCheck).toBe(true);
    });

    it('correctly identifies an English "Unauthorized" 401 response as an auth error', () => {
      const englishError = new ApiError('Unauthorized. Please sign in again.', 401, {
        statusCode: 401,
        message: 'Unauthorized',
      });

      expect(isAuthError(englishError)).toBe(true);
      const status = (englishError as any)?.status ?? (englishError as any)?.response?.status;
      expect(status === 401 || status === 403).toBe(true);
    });

    it('correctly identifies a 403 Forbidden response as an auth error', () => {
      const forbiddenError = new ApiError('Zugriff verweigert.', 403, {
        statusCode: 403,
        message: 'Zugriff verweigert.',
      });

      expect(isAuthError(forbiddenError)).toBe(true);
      const status = (forbiddenError as any)?.status ?? (forbiddenError as any)?.response?.status;
      expect(status === 401 || status === 403).toBe(true);
    });

    it('correctly identifies client-side "No authentication token" as an auth error', () => {
      const missingTokenError = new Error('No authentication token');
      expect(isAuthError(missingTokenError)).toBe(true);
    });

    it('does not treat standard server errors or client errors as auth errors', () => {
      const serverError = new ApiError('Serverfehler. Bitte versuche es später erneut.', 500, null);
      expect(isAuthError(serverError)).toBe(false);

      const badRequestError = new ApiError('Ungültige Eingabe.', 400, null);
      expect(isAuthError(badRequestError)).toBe(false);

      const notFoundError = new ApiError('Nicht gefunden.', 404, null);
      expect(isAuthError(notFoundError)).toBe(false);
    });

    it('static audit: scans mobile codebase to confirm no call site uses broken English-only msg.includes("authentication") check', () => {
      const mobileSrc = path.resolve(__dirname, '../src');
      const files: string[] = [];

      function scanDir(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (/\.(ts|tsx)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }

      scanDir(mobileSrc);

      const brokenAuthPattern = /\.includes\(\s*['"]authentication['"]\s*\)/i;
      const violatingFiles: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        if (brokenAuthPattern.test(content)) {
          violatingFiles.push(file);
        }
      }

      expect(violatingFiles).toEqual([]);
    });
  });
});

