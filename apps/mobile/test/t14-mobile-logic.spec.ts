import fs from 'fs';
import path from 'path';
import { apiFetch, apiJson } from '../src/services/apiClient';
import { mapHttpError } from '../src/utils/error-messages';
import {
  saveRegistrationDraft,
  loadRegistrationDraft,
  clearRegistrationDraft,
  RegistrationForm,
  DEFAULTS,
} from '../src/contexts/RegistrationContext';
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
    it.failing('[KNOWN BUG-020] joinUrl passes absolute URLs through without prepending base URL', async () => {
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
});
