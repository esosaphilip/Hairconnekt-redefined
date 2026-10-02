import fs from 'fs';
import path from 'path';
import {
  getBookingLocation,
  formatRouteAddress,
  formatDisplayLinesMobile,
  formatDisplayLinesStudio,
  BookingLocationInput,
} from '../src/utils/bookingLocation';
import {
  buildAppleMapsUrl,
  buildGoogleMapsAppUrl,
  buildAndroidGeoUrl,
  buildWebFallbackUrl,
  openDirections,
} from '../src/utils/openDirections';

const srcDir = path.join(__dirname, '..', 'src');
const bookingsProviderFile = path.join(
  srcDir,
  'app',
  '(provider)',
  'appointments',
  '[id].tsx',
);
const clientProfileFile = path.join(
  srcDir,
  'app',
  '(client)',
  'profile',
  'index.tsx',
);
const clientBookingsListFile = path.join(
  srcDir,
  'app',
  '(client)',
  'appointments',
  'index.tsx',
);

const allSourceFiles: string[] = [];
function walk(d: string) {
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const e of entries) {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) walk(fp);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) allSourceFiles.push(fp);
  }
}
walk(srcDir);

function fileContains(filePath: string, pat: RegExp): boolean {
  return pat.test(fs.readFileSync(filePath, 'utf-8'));
}

function countMatchesInFiles(patterns: RegExp[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const fp of allSourceFiles) {
    const content = fs.readFileSync(fp, 'utf-8');
    for (const p of patterns) {
      const key = p.source;
      out[key] = (out[key] ?? 0) + ((content.match(p) ?? []) as unknown as RegExpExecArray[]).length;
    }
  }
  return out;
}

describe('T20: Booking Location Helpers + Maps Chooser Static Audit', () => {
  describe('1. formatRouteAddress output format', () => {
    it('returns null when street is missing', () => {
      expect(
        formatRouteAddress({ city: 'Berlin', postalCode: '12345' }),
      ).toBeNull();
    });
    it('returns null when city is missing', () => {
      expect(
        formatRouteAddress({ street: 'Hauptstraße', postalCode: '12345' }),
      ).toBeNull();
    });
    it('includes houseNumber in first segment when present', () => {
      expect(
        formatRouteAddress({
          street: 'Am Fußberg',
          houseNumber: '12',
          postalCode: '12347',
          city: 'Berlin',
        }),
      ).toBe('Am Fußberg 12, 12347 Berlin, Deutschland');
    });
    it('omits space padding when houseNumber absent', () => {
      expect(
        formatRouteAddress({
          street: 'Am Fußberg',
          postalCode: '12347',
          city: 'Berlin',
        }),
      ).toBe('Am Fußberg, 12347 Berlin, Deutschland');
    });
  });

  describe('2. getBookingLocation matrix (provider confirmed mobile)', () => {
    const fullAddress = {
      street: 'Hauptstraße',
      houseNumber: '8a',
      postalCode: '10115',
      city: 'Berlin',
    };

    it('provider confirmed mobile → routeAddress non-null, kind mobile, traveller provider', () => {
      const booking: BookingLocationInput = {
        isMobile: true,
        status: 'CONFIRMED',
        address: fullAddress,
      };
      const r = getBookingLocation(booking, 'provider');
      expect(r.kind).toBe('mobile');
      expect(r.traveller).toBe('provider');
      expect(r.routeAddress).toBeTruthy();
      expect(r.routeAddress?.endsWith(', Deutschland')).toBe(true);
    });

    it('provider PENDING mobile → routeAddress null, displayLines do NOT contain "null" or "undefined"', () => {
      const booking: BookingLocationInput = {
        isMobile: true,
        status: 'PENDING',
        address: fullAddress,
      };
      const r = getBookingLocation(booking, 'provider', {
        tNote: 'Exact address shown after accepting',
      });
      expect(r.routeAddress).toBeNull();
      for (const line of r.displayLines) {
        expect(line).not.toMatch(/\bnull\b/);
        expect(line).not.toMatch(/\bundefined\b/);
      }
      expect(r.displayLines.join(' ')).toContain('Exact address shown after accepting');
    });

    it('client viewing mobile PENDING always sees their own full address, while routeAddress stays null because viewer is not the traveller on mobile bookings', () => {
      const booking: BookingLocationInput = {
        isMobile: true,
        status: 'PENDING',
        address: fullAddress,
      };
      const r = getBookingLocation(booking, 'client', {
        tAtYourAddress: 'Mobile service at your address',
      });
      expect(r.kind).toBe('mobile');
      expect(r.traveller).toBe('provider');
      expect(r.routeAddress).toBeNull();
      expect(r.displayLines.some((l) => l.includes('Mobile service at your address'))).toBe(true);
      // Client always sees full lines even in pending (own address)
      expect(
        r.displayLines.some(
          (l) => l.includes('Hauptstraße 8a') && l.includes('10115 Berlin'),
        ),
      ).toBe(true);
    });

    it('client CONFIRMED studio (non-mobile) → routeAddress non-null with provider addr', () => {
      const booking: BookingLocationInput = {
        isMobile: false,
        status: 'CONFIRMED',
        provider: {
          street: 'Studioallee',
          houseNumber: '3',
          postalCode: '60311',
          city: 'Frankfurt am Main',
        },
      };
      const r = getBookingLocation(booking, 'client', {
        tNote: 'Exact address shown after accepting',
      });
      expect(r.kind).toBe('studio');
      expect(r.traveller).toBe('client');
      expect(r.routeAddress).toBe(
        'Studioallee 3, 60311 Frankfurt am Main, Deutschland',
      );
    });

    it('studio PENDING client → routeAddress null; shows tNote + city only', () => {
      const booking: BookingLocationInput = {
        isMobile: false,
        status: 'PENDING',
        provider: {
          postalCode: '60311',
          city: 'Frankfurt am Main',
        },
      };
      const r = getBookingLocation(booking, 'client', {
        tNote: 'Exact address shown after accepting',
      });
      expect(r.routeAddress).toBeNull();
      expect(r.displayLines.join(' ')).toContain('Exact address shown after accepting');
      expect(r.displayLines.join(' ')).toContain('60311 Frankfurt am Main');
    });

    it('null address on provider + mobile CONFIRMED → gracefully uses tNotProvided, routeAddress null, never shows "null" string', () => {
      const booking: BookingLocationInput = {
        isMobile: true,
        status: 'CONFIRMED',
        address: null as unknown as undefined,
      };
      const r = getBookingLocation(booking, 'provider', {
        tNotProvided: 'Mobile service — address not provided',
      });
      for (const line of r.displayLines) {
        expect(line).not.toMatch(/\bnull\b/);
        expect(line).not.toMatch(/\bundefined\b/);
      }
      expect(r.displayLines.join(' ')).toContain('Mobile service — address not provided');
      expect(r.routeAddress).toBeNull();
    });

    it('missing postalCode + houseNumber in provider confirmed mobile → still builds routeAddress with street+city only', () => {
      const booking: BookingLocationInput = {
        isMobile: true,
        status: 'CONFIRMED',
        address: { street: 'Hauptstraße', city: 'München' },
      };
      const r = getBookingLocation(booking, 'provider');
      expect(r.routeAddress).toBe('Hauptstraße, München, Deutschland');
      for (const line of r.displayLines) {
        expect(line).not.toMatch(/\bnull\b/);
        expect(line).not.toMatch(/\bundefined\b/);
      }
    });

    const fullMobileAddr = {
      street: 'Hauptstraße',
      houseNumber: '8a',
      postalCode: '10115',
      city: 'Berlin',
    };
    const fullStudioProviderAddr = {
      street: 'Studioallee',
      houseNumber: '3',
      postalCode: '60311',
      city: 'Frankfurt am Main',
    };
    const exactMobileRoute = 'Hauptstraße 8a, 10115 Berlin, Deutschland';
    const exactStudioRoute = 'Studioallee 3, 60311 Frankfurt am Main, Deutschland';

    it('traveller rule 1: client viewing mobile CONFIRMED with full address has routeAddress null', () => {
      expect(
        getBookingLocation(
          { isMobile: true, status: 'CONFIRMED', address: fullMobileAddr },
          'client',
        ).routeAddress,
      ).toBeNull();
    });

    it('traveller rule 2: client viewing mobile IN_PROGRESS with full address has routeAddress null', () => {
      expect(
        getBookingLocation(
          { isMobile: true, status: 'IN_PROGRESS', address: fullMobileAddr },
          'client',
        ).routeAddress,
      ).toBeNull();
    });

    it('traveller rule 3: provider viewing studio CONFIRMED with full provider address has routeAddress null', () => {
      expect(
        getBookingLocation(
          { isMobile: false, status: 'CONFIRMED', provider: fullStudioProviderAddr },
          'provider',
        ).routeAddress,
      ).toBeNull();
    });

    it('traveller rule 4: provider viewing mobile COMPLETED with full address has routeAddress null and display still contains street', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'COMPLETED', address: fullMobileAddr },
        'provider',
      );
      expect(r.routeAddress).toBeNull();
      expect(r.displayLines.join(' ')).toContain(fullMobileAddr.street);
    });

    it('traveller rule 5: client viewing studio COMPLETED with full provider address has routeAddress null and display still contains street', () => {
      const r = getBookingLocation(
        { isMobile: false, status: 'COMPLETED', provider: fullStudioProviderAddr },
        'client',
      );
      expect(r.routeAddress).toBeNull();
      expect(r.displayLines.join(' ')).toContain(fullStudioProviderAddr.street);
    });

    it('traveller rule 6: provider viewing mobile IN_PROGRESS with full address returns exact route string', () => {
      expect(
        getBookingLocation(
          { isMobile: true, status: 'IN_PROGRESS', address: fullMobileAddr },
          'provider',
        ).routeAddress,
      ).toBe(exactMobileRoute);
    });

    it('traveller rule 7: client viewing studio IN_PROGRESS with full provider address returns exact route string', () => {
      expect(
        getBookingLocation(
          { isMobile: false, status: 'IN_PROGRESS', provider: fullStudioProviderAddr },
          'client',
        ).routeAddress,
      ).toBe(exactStudioRoute);
    });

    const noHouseMobileAddr = {
      street: 'Hauptstraße',
      postalCode: '10115',
      city: 'Berlin',
    };

    it('defect A1: client viewing mobile CONFIRMED with street+postal+city but no houseNumber still shows street, postal+city, no "address not provided"', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'CONFIRMED', address: noHouseMobileAddr },
        'client',
      );
      expect(r.displayLines.join(' ')).toContain('Hauptstraße');
      expect(r.displayLines.join(' ')).toContain('10115 Berlin');
      expect(r.displayLines.join(' ')).not.toContain('address not provided');
      expect(r.displayLines.join(' ')).not.toContain('nicht hinterlegt');
    });

    it('defect A1: provider viewing mobile CONFIRMED street/no-house shows street, no "address not provided"; routeAddress exact Hauptstraße, 10115 Berlin, Deutschland', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'CONFIRMED', address: noHouseMobileAddr },
        'provider',
      );
      expect(r.displayLines.join(' ')).toContain('Hauptstraße');
      expect(r.displayLines.join(' ')).not.toContain('address not provided');
      expect(r.displayLines.join(' ')).not.toContain('nicht hinterlegt');
      expect(r.routeAddress).toBe('Hauptstraße, 10115 Berlin, Deutschland');
    });

    it('defect A2: provider PENDING mobile full address → displayLines[0] is postal+city; displayLines[1] is the note; no street', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'PENDING', address: fullMobileAddr },
        'provider',
        { tNote: 'Exact address shown after accepting' },
      );
      expect(r.displayLines[0]).toBe('10115 Berlin');
      expect(r.displayLines[1]).toBe('Exact address shown after accepting');
      expect(r.displayLines.join(' ')).not.toContain(fullMobileAddr.street);
      expect(r.displayLines.join(' ')).not.toContain(fullMobileAddr.houseNumber);
    });

    it('defect A2: provider CANCELLED mobile full address → displayLines exactly [postal+city], no note, no street; routeAddress null', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'CANCELLED', address: fullMobileAddr },
        'provider',
        { tNote: 'Exact address shown after accepting' },
      );
      expect(r.displayLines).toEqual(['10115 Berlin']);
      expect(r.routeAddress).toBeNull();
    });

    it('polish: provider mobile PENDING address null → exact tNotProvided display, routeAddress null', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'PENDING', address: null },
        'provider',
        { tNote: 'Exact address shown after accepting', tNotProvided: 'Mobile service — address not provided' },
      );
      expect(r.displayLines).toEqual(['Mobile service — address not provided']);
      expect(r.routeAddress).toBeNull();
    });

    it('polish: provider mobile PENDING address { postalCode 10115 + city Berlin } → place first, note second', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'PENDING', address: { postalCode: '10115', city: 'Berlin' } },
        'provider',
        { tNote: 'Exact address shown after accepting', tNotProvided: 'Mobile service — address not provided' },
      );
      expect(r.displayLines).toEqual(['10115 Berlin', 'Exact address shown after accepting']);
    });

    it('defect A2: client PENDING studio provider with only city Köln → displayLines[0] is Köln; displayLines[1] is the note', () => {
      const r = getBookingLocation(
        { isMobile: false, status: 'PENDING', provider: { city: 'Köln' } },
        'client',
        { tNote: 'Exact address shown after accepting' },
      );
      expect(r.displayLines[0]).toBe('Köln');
      expect(r.displayLines[1]).toBe('Exact address shown after accepting');
    });

    it('defect A2: client CANCELLED studio provider with only city Köln → displayLines exactly [Köln], no note', () => {
      const r = getBookingLocation(
        { isMobile: false, status: 'CANCELLED', provider: { city: 'Köln' } },
        'client',
        { tNote: 'Exact address shown after accepting' },
      );
      expect(r.displayLines).toEqual(['Köln']);
    });

    it('defect A3: provider mobile status lowercase confirmed returns full display with street + exact routeAddress', () => {
      const r = getBookingLocation(
        { isMobile: true, status: 'confirmed', address: fullMobileAddr },
        'provider',
      );
      expect(r.routeAddress).toBe(exactMobileRoute);
      expect(r.displayLines.join(' ')).toContain(fullMobileAddr.street);
    });

    it('defect A3: client studio status snake_case lower-case in_progress returns exact routeAddress with full provider addr', () => {
      const r = getBookingLocation(
        { isMobile: false, status: 'in_progress', provider: fullStudioProviderAddr },
        'client',
      );
      expect(r.routeAddress).toBe(exactStudioRoute);
    });

    it('defect A3: status hyphen+space variants normalise so client studio "in progress" + provider "CONFIRMED" equal their canonical counterparts; provider mobile address null PENDING shows only "address not provided" once and never null/undefined', () => {
      const rA = getBookingLocation(
        { isMobile: false, status: 'in progress', provider: fullStudioProviderAddr },
        'client',
      );
      expect(rA.routeAddress).toBe(exactStudioRoute);

      const rB = getBookingLocation(
        { isMobile: false, status: 'in-progress', provider: fullStudioProviderAddr },
        'client',
      );
      expect(rB.routeAddress).toBe(exactStudioRoute);

      const rC = getBookingLocation(
        { isMobile: true, status: undefined, address: null },
        'provider',
        {
          tNotProvided: 'Mobile service — address not provided',
        },
      );
      expect(rC.displayLines).toEqual(['Mobile service — address not provided']);
      for (const line of rC.displayLines) {
        expect(line).not.toMatch(/\bnull\b/);
        expect(line).not.toMatch(/\bundefined\b/);
      }
    });
  });

  describe('3. URL builders encode spaces, commas, ß, umlauts', () => {
    const addrWithSpecialChars =
      'Straße 12, 12347 Berlin-Mitte, Deutschland';
    const addrWithUmlaut = 'Österreichischer Allee 3, 1010 Wien';

    it('buildAppleMapsUrl encodes', () => {
      expect(buildAppleMapsUrl(addrWithSpecialChars)).toBe(
        'https://maps.apple.com/?daddr=' +
          encodeURIComponent(addrWithSpecialChars) +
          '&dirflg=d',
      );
      expect(buildAppleMapsUrl(addrWithUmlaut)).toBe(
        'https://maps.apple.com/?daddr=' +
          encodeURIComponent(addrWithUmlaut) +
          '&dirflg=d',
      );
    });

    it('buildGoogleMapsAppUrl uses comgooglemaps scheme + driving mode', () => {
      expect(buildGoogleMapsAppUrl(addrWithSpecialChars)).toBe(
        'comgooglemaps://?daddr=' +
          encodeURIComponent(addrWithSpecialChars) +
          '&directionsmode=driving',
      );
      expect(buildGoogleMapsAppUrl(addrWithUmlaut)).toBe(
        'comgooglemaps://?daddr=' +
          encodeURIComponent(addrWithUmlaut) +
          '&directionsmode=driving',
      );
    });

    it('buildAndroidGeoUrl uses geo:0,0?q=', () => {
      expect(buildAndroidGeoUrl(addrWithSpecialChars)).toBe(
        'geo:0,0?q=' + encodeURIComponent(addrWithSpecialChars),
      );
    });

    it('buildWebFallbackUrl uses Google Maps dir API destination param', () => {
      expect(buildWebFallbackUrl(addrWithSpecialChars)).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=' +
          encodeURIComponent(addrWithSpecialChars),
      );
    });
  });

  describe('4. openDirections platform behaviour (never rejects, assert expected calls)', () => {
    const strings = {
      appleMaps: 'Apple Maps',
      googleMaps: 'Google Maps',
      cancel: 'Cancel',
      errorTitle: 'Could not open directions',
      errorMessage: 'Please try again',
    };

    it('iOS with Google Maps installed → shows action sheet; user picks Apple Maps → opens maps.apple.com URL', async () => {
      const canOpenURL = jest.fn().mockResolvedValue(true);
      const openURL = jest.fn().mockResolvedValue(true);
      const showActionSheet = jest.fn().mockResolvedValue(0);
      const alert = jest.fn();
      const addr = 'Hauptstraße 1, Berlin';

      await openDirections(addr, {
        platform: 'ios',
        canOpenURL,
        openURL,
        showActionSheet,
        alert,
        strings,
      });

      expect(canOpenURL).toHaveBeenCalledWith('comgooglemaps://');
      expect(showActionSheet).toHaveBeenCalledWith({
        options: ['Apple Maps', 'Google Maps', 'Cancel'],
        cancelButtonIndex: 2,
      });
      expect(openURL).toHaveBeenCalledWith(buildAppleMapsUrl(addr));
      expect(alert).not.toHaveBeenCalled();
    });

    it('iOS + GM installed; user picks Google Maps (index 1) → comgooglemaps:// scheme called', async () => {
      const openURL = jest.fn().mockResolvedValue(true);
      const addr = 'Hauptstraße 1, Berlin';
      await openDirections(addr, {
        platform: 'ios',
        canOpenURL: jest.fn().mockResolvedValue(true),
        openURL,
        showActionSheet: jest.fn().mockResolvedValue(1),
        alert: jest.fn(),
        strings,
      });
      expect(openURL).toHaveBeenCalledWith(buildGoogleMapsAppUrl(addr));
    });

    it('iOS + GM installed; user taps Cancel (index 2) → no URL opened, no alert, resolves void', async () => {
      const openURL = jest.fn();
      const alert = jest.fn();
      await expect(
        openDirections('A, B', {
          platform: 'ios',
          canOpenURL: jest.fn().mockResolvedValue(true),
          openURL,
          showActionSheet: jest.fn().mockResolvedValue(2),
          alert,
          strings,
        }),
      ).resolves.toBeUndefined();
      expect(openURL).not.toHaveBeenCalled();
      expect(alert).not.toHaveBeenCalled();
    });

    it('iOS without Google Maps → opens Apple Maps directly; never calls showActionSheet', async () => {
      const canOpenURL = jest.fn().mockResolvedValue(false);
      const showActionSheet = jest.fn();
      const openURL = jest.fn().mockResolvedValue(true);
      await openDirections('X, Y', {
        platform: 'ios',
        canOpenURL,
        openURL,
        showActionSheet,
        alert: jest.fn(),
        strings,
      });
      expect(canOpenURL).toHaveBeenCalledWith('comgooglemaps://');
      expect(showActionSheet).not.toHaveBeenCalled();
      expect(openURL).toHaveBeenCalledWith(buildAppleMapsUrl('X, Y'));
    });

    it('Android → geo:0,0?q= intent called directly; no action sheet', async () => {
      const showActionSheet = jest.fn();
      const openURL = jest.fn().mockResolvedValue(true);
      await openDirections('A, B', {
        platform: 'android',
        canOpenURL: jest.fn(),
        openURL,
        showActionSheet,
        alert: jest.fn(),
        strings,
      });
      expect(openURL).toHaveBeenCalledWith(buildAndroidGeoUrl('A, B'));
      expect(showActionSheet).not.toHaveBeenCalled();
    });

    it('all platforms: if primary URL fails (throws), opens buildWebFallbackUrl; if fallback fails → alert() called with title+message (never rejects)', async () => {
      const openURL = jest
        .fn()
        .mockRejectedValueOnce(new Error('primary fail'))
        .mockRejectedValueOnce(new Error('fallback fail'));
      const alert = jest.fn();

      await expect(
        openDirections('addr', {
          platform: 'android',
          canOpenURL: jest.fn(),
          openURL,
          showActionSheet: jest.fn(),
          alert,
          strings,
        }),
      ).resolves.toBeUndefined();

      expect(openURL).toHaveBeenCalledWith(buildAndroidGeoUrl('addr'));
      expect(openURL).toHaveBeenLastCalledWith(buildWebFallbackUrl('addr'));
      expect(alert).toHaveBeenCalledWith(
        'Could not open directions',
        'Please try again',
      );
    });

    it('openDirections never rejects unhandled: even if alert() throws, outer wrapper still resolves void', async () => {
      const openURL = jest
        .fn()
        .mockRejectedValue(new Error('boom'));
      const alert = jest.fn(() => {
        throw new Error('alert also fails');
      });
      await expect(
        openDirections('x', {
          platform: 'ios',
          canOpenURL: jest.fn().mockResolvedValue(false),
          openURL,
          showActionSheet: jest.fn(),
          alert,
          strings,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('5. Banned-string static audit (filesystem grep)', () => {
    it('maps.google.com literal has 0 occurrences across mobile src', () => {
      const c = countMatchesInFiles([/maps\.google\.com/g]);
      expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('providerUnknownCity has 0 occurrences (key deleted + no usage)', () => {
      const c = countMatchesInFiles([/providerUnknownCity/g]);
      expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('"City unknown" has 0 literal occurrences (relied on providerUnknownCity before)', () => {
      const c = countMatchesInFiles([/City unknown/g, /Stadt unbekannt/g]);
      expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('deprecated addressStreet / addressHouseNumber / addressCity / addressPostalCode (old flat fields) have 0 occurrences', () => {
      const c = countMatchesInFiles([
        /\baddressStreet\b/g,
        /\baddressHouseNumber\b/g,
        /\baddressCity\b/g,
        /\baddressPostalCode\b/g,
      ]);
      expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('booking.client?.city pattern has 0 occurrences (removed from provider appointments screen)', () => {
      const c = countMatchesInFiles([
        /booking\.client\?\.city/g,
        /client\?\.city/g,
        /booking\.client\.address\?\.city/g,
      ]);
      expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('hard-coded "> 2 saved " / "2 Saved" in profile screen replaced with live count', () => {
      const profileContent = fs.readFileSync(clientProfileFile, 'utf-8');
      // old pattern: `<Text>2 {t('clientProfileSaved')}</Text>` → gone
      expect(profileContent).not.toMatch(/>\s*2\s*\{?t\(['"]clientProfileSaved['"]\)\}?\s*<\/Text>/);
      expect(profileContent).not.toMatch(/[^\dA-Za-z]\s*2\s*saved/i);
    });
  });
});
