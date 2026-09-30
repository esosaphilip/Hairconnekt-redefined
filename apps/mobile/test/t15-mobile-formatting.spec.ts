import fs from 'fs';
import path from 'path';
import { formatAmount, formatRating, formatBookingTime, calculatePayout, formatReviewLabel, formatReviewCount, formatReviewDate, AppLanguage } from '../src/utils/format';

function getAllSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function findScheduledDateFormatterViolations(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations: string[] = [];

  // Pattern 1: Variable assigned from new Date(...scheduledDate...) and then calls toLocaleTimeString or toLocaleString
  const varPattern = /(?:const|let|var)\s+(\w+)\s*=\s*new\s+Date\([^)]*scheduledDate[^)]*\)/g;
  let match: RegExpExecArray | null;
  while ((match = varPattern.exec(content)) !== null) {
    const varName = match[1];
    const timeCallRegex = new RegExp(`\\b${varName}\\s*\\.\\s*(toLocaleTimeString|toLocaleString)\\b`);
    if (timeCallRegex.test(content)) {
      violations.push(`${path.basename(filePath)}: variable '${varName}' created from scheduledDate calls toLocaleTimeString/toLocaleString`);
    }
  }

  // Pattern 2: Direct new Date(...scheduledDate...).toLocaleTimeString() or toLocaleString()
  if (/new\s+Date\([^)]*scheduledDate[^)]*\)\s*\.\s*(toLocaleTimeString|toLocaleString)/i.test(content)) {
    violations.push(`${path.basename(filePath)}: direct call new Date(...scheduledDate...).toLocaleTimeString/toLocaleString`);
  }

  // Pattern 3: Passing scheduledDate into toLocaleTimeString or toLocaleString
  if (/toLocaleTimeString\([^)]*scheduledDate/i.test(content) || /toLocaleString\([^)]*scheduledDate/i.test(content)) {
    violations.push(`${path.basename(filePath)}: scheduledDate passed directly into toLocaleTimeString/toLocaleString`);
  }

  return violations;
}

describe('T15: Mobile Currency Formatting & Time Static Audit', () => {
  describe('Production Currency Formatter (formatAmount from utils/format.ts)', () => {
    it('formats numbers and numeric strings in German locale with comma decimal separator (asserts comma output)', () => {
      expect(formatAmount(25, 'de')).toBe('25,00');
      expect(formatAmount(49.99, 'de')).toBe('49,99');
      expect(formatAmount('65.50', 'de')).toBe('65,50');
      expect(formatAmount('65,50', 'de')).toBe('65,50');
    });

    it('formats numbers and numeric strings in English locale with dot decimal separator (asserts dot output)', () => {
      expect(formatAmount(25, 'en')).toBe('25.00');
      expect(formatAmount(49.99, 'en')).toBe('49.99');
      expect(formatAmount('65.50', 'en')).toBe('65.50');
      expect(formatAmount('65,50', 'en')).toBe('65.50');
    });

    it('handles falsy or invalid values safely by falling back to 0.00 / 0,00', () => {
      expect(formatAmount(null, 'de')).toBe('0,00');
      expect(formatAmount(undefined, 'en')).toBe('0.00');
      expect(formatAmount('invalid', 'de')).toBe('0,00');
    });
  });

  describe('Provider Rating Formatter (formatRating - BUG-026)', () => {
    it('formats string decimal ratings like "5.00" as real numeric rating ("5.0"), not "NEW"', () => {
      expect(formatRating('5.00')).toBe('5.0');
      expect(formatRating('4.80')).toBe('4.8');
      expect(formatRating('4.5')).toBe('4.5');
    });

    it('formats number ratings properly', () => {
      expect(formatRating(5)).toBe('5.0');
      expect(formatRating(4.75)).toBe('4.8');
    });

    it('returns fallback label "NEW" for 0, empty, or unrated providers', () => {
      expect(formatRating(0)).toBe('NEW');
      expect(formatRating('0')).toBe('NEW');
      expect(formatRating('0.00')).toBe('NEW');
      expect(formatRating(null)).toBe('NEW');
      expect(formatRating(undefined)).toBe('NEW');
      expect(formatRating('invalid')).toBe('NEW');
    });

    it('supports custom fallback labels (e.g. Neu)', () => {
      expect(formatRating('0.00', 'Neu')).toBe('Neu');
      expect(formatRating(null, 'Neu')).toBe('Neu');
    });
  });

  describe('ProviderCard and Favourites Decimal String Rating (BUG-029)', () => {
    it('proves raw (avgRating || 0).toFixed(1) and avgRating.toFixed(1) throw TypeError when avgRating is string', () => {
      const stringRating: any = '5.00';
      // Raw expression from unpatched ProviderCard
      expect(() => {
        (stringRating || 0).toFixed(1);
      }).toThrow(TypeError);

      // Raw expression from unpatched favourites
      expect(() => {
        stringRating.toFixed(1);
      }).toThrow(TypeError);
    });

    it('formats string decimal ratings safely using formatRating without throwing', () => {
      const providerItem = { avgRating: '5.00', totalReviews: 4 };
      const formatted = formatRating(providerItem.avgRating, 'NEU');
      expect(formatted).toBe('5.0');

      const favouriteItem = { avgRating: '4.80', totalReviews: 12 };
      expect(formatRating(favouriteItem.avgRating, 'NEU')).toBe('4.8');
    });

    it('static check: ProviderCard.tsx and favourites.tsx do not call .toFixed directly on avgRating', () => {
      const providerCardFile = path.resolve(__dirname, '../src/components/ProviderCard.tsx');
      const favouritesFile = path.resolve(__dirname, '../src/app/(client)/favourites.tsx');

      const cardContent = fs.readFileSync(providerCardFile, 'utf-8');
      const favContent = fs.readFileSync(favouritesFile, 'utf-8');

      expect(cardContent).not.toMatch(/avgRating.*\.toFixed/);
      expect(favContent).not.toMatch(/avgRating.*\.toFixed/);
      expect(cardContent).toContain('formatRating(');
      expect(favContent).toContain('formatRating(');
    });
  });

  describe('Appointment Time Formatter Future Contract', () => {
    it('formats 24-hour time strings correctly for German (24h) and English (12h)', () => {
      expect(formatBookingTime('16:30:00', 'de')).toBe('16:30');
      expect(formatBookingTime('16:30:00', 'en')).toBe('4:30 PM');
      expect(formatBookingTime('09:05:00', 'de')).toBe('09:05');
      expect(formatBookingTime('09:05:00', 'en')).toBe('9:05 AM');
    });

    it('formats HH:MM strings without seconds', () => {
      expect(formatBookingTime('14:00', 'de')).toBe('14:00');
      expect(formatBookingTime('14:00', 'en')).toBe('2:00 PM');
    });

    it('returns empty string safely for falsy, invalid or unparseable input', () => {
      expect(formatBookingTime(null, 'de')).toBe('');
      expect(formatBookingTime(undefined, 'en')).toBe('');
      expect(formatBookingTime('', 'de')).toBe('');
      expect(formatBookingTime('invalid', 'en')).toBe('');
      expect(formatBookingTime('25:00', 'de')).toBe('');
    });
  });

  describe('Provider Payout Calculation (BUG-022)', () => {
    it('calculates payout as totalPrice - platformFeeAmount (ignores raw providerPayout 0)', () => {
      // 0 fee returns full price
      expect(calculatePayout(100, 0)).toBe(100);
      expect(calculatePayout('100.00', 0)).toBe(100);
      expect(calculatePayout(100, null)).toBe(100);
      expect(calculatePayout(100, undefined)).toBe(100);

      // Real fee subtracted correctly
      expect(calculatePayout(100, 10)).toBe(90);
      expect(calculatePayout('65.50', '5.50')).toBe(60);
    });

    it('handles falsy or invalid values safely and clamps to 0 minimum', () => {
      expect(calculatePayout(0, 0)).toBe(0);
      expect(calculatePayout(null, null)).toBe(0);
      expect(calculatePayout(50, 60)).toBe(0);
    });
  });

  describe('Static Source Scan for BUG-021 (scheduledDate passed to time formatters)', () => {
    // KNOWN BUG-021: In apps/mobile/src/app/(provider)/booking-request/[id].tsx, scheduledDate is parsed
    // with new Date(booking.scheduledDate) and formatted via d.toLocaleTimeString(), which displays the
    // timezone offset of midnight UTC rather than the actual scheduled appointment time.
    it('[KNOWN BUG-021] static source scan: no file under apps/mobile/src passes scheduledDate into time formatters', () => {
      const srcDir = path.resolve(__dirname, '../src');
      const sourceFiles = getAllSourceFiles(srcDir);
      const allViolations: string[] = [];

      for (const file of sourceFiles) {
        const violations = findScheduledDateFormatterViolations(file);
        if (violations.length > 0) {
          allViolations.push(...violations);
        }
      }

      // Asserts zero source files pass scheduledDate into time formatters
      // Fails today because booking-request/[id].tsx has this bug
      expect(allViolations).toEqual([]);
    });
  });

  describe('Review Count Pluralization & Labeling (BUG-027)', () => {
    it('returns singular "Bewertung" or "review" for 1 review', () => {
      expect(formatReviewLabel(1, 'de')).toBe('Bewertung');
      expect(formatReviewLabel(1, 'en')).toBe('review');
      expect(formatReviewCount(1, 'de')).toBe('1 Bewertung');
      expect(formatReviewCount(1, 'en')).toBe('1 review');
    });

    it('returns plural "Bewertungen" or "reviews" for 0 reviews', () => {
      expect(formatReviewLabel(0, 'de')).toBe('Bewertungen');
      expect(formatReviewLabel(0, 'en')).toBe('reviews');
      expect(formatReviewCount(0, 'de')).toBe('0 Bewertungen');
      expect(formatReviewCount(0, 'en')).toBe('0 reviews');
    });

    it('returns plural "Bewertungen" or "reviews" for multiple reviews', () => {
      expect(formatReviewLabel(2, 'de')).toBe('Bewertungen');
      expect(formatReviewLabel(2, 'en')).toBe('reviews');
      expect(formatReviewCount(5, 'de')).toBe('5 Bewertungen');
      expect(formatReviewCount(5, 'en')).toBe('5 reviews');
      expect(formatReviewCount(12, 'de')).toBe('12 Bewertungen');
      expect(formatReviewCount(12, 'en')).toBe('12 reviews');
    });

    it('handles numeric string inputs and non-numeric inputs gracefully', () => {
      expect(formatReviewCount('1', 'de')).toBe('1 Bewertung');
      expect(formatReviewCount('1', 'en')).toBe('1 review');
      expect(formatReviewCount('3', 'de')).toBe('3 Bewertungen');
      expect(formatReviewCount(null, 'de')).toBe('0 Bewertungen');
      expect(formatReviewCount(undefined, 'en')).toBe('0 reviews');
      expect(formatReviewCount(NaN, 'de')).toBe('0 Bewertungen');
      expect(formatReviewCount(-4, 'en')).toBe('0 reviews');
    });
  });

  describe('Review Date Formatting (BUG-027)', () => {
    it('formats ISO date strings in German using long-form month', () => {
      const formatted = formatReviewDate('2026-09-28T12:00:00Z', 'de');
      expect(formatted).toContain('28.');
      expect(formatted).toContain('September');
      expect(formatted).toContain('2026');
    });

    it('formats ISO date strings in English using long-form month', () => {
      const formatted = formatReviewDate('2026-09-28T12:00:00Z', 'en');
      expect(formatted).toContain('September');
      expect(formatted).toContain('28');
      expect(formatted).toContain('2026');
    });

    it('accepts Date objects and numeric timestamps', () => {
      const d = new Date('2026-09-28T12:00:00Z');
      expect(formatReviewDate(d, 'de')).toBe(formatReviewDate('2026-09-28T12:00:00Z', 'de'));
      expect(formatReviewDate(d.getTime(), 'en')).toBe(formatReviewDate('2026-09-28T12:00:00Z', 'en'));
    });

    it('returns empty string for null, undefined, empty, or invalid date values', () => {
      expect(formatReviewDate(null, 'de')).toBe('');
      expect(formatReviewDate(undefined, 'en')).toBe('');
      expect(formatReviewDate('', 'de')).toBe('');
      expect(formatReviewDate('invalid-date', 'en')).toBe('');
    });
  });

  describe('Provider Profile Book Button & Action Bar Layout (BUG-031)', () => {
    const providerProfilePath = path.resolve(__dirname, '../src/app/(client)/provider/[id].tsx');
    const content = fs.readFileSync(providerProfilePath, 'utf-8');

    it('ensures bookBtnText and messageBtnText set numberOfLines={1} to prevent multi-line wrapping', () => {
      expect(content).toMatch(/<Text\s+style=\{styles\.bookBtnText\}\s+numberOfLines=\{1\}>/);
      expect(content).toMatch(/<Text\s+style=\{styles\.messageBtnText\}\s+numberOfLines=\{1\}>/);
    });

    it('allocates adequate flex proportion to bookBtn (flex: 1.8)', () => {
      expect(content).toMatch(/bookBtn:\s*\{[^}]*flex:\s*1\.8/);
    });

    it('reduces stickyFooter and price block margins to preserve horizontal width on compact devices', () => {
      expect(content).toMatch(/stickyFooter:\s*\{[^}]*paddingHorizontal:\s*spacing\.md/);
      expect(content).toMatch(/footerPriceBlock:\s*\{[^}]*marginRight:\s*spacing\.sm/);
    });
  });

  describe('Search Filter Chip Pill Border Radius (BUG-032)', () => {
    const searchPath = path.resolve(__dirname, '../src/app/(client)/search.tsx');
    const content = fs.readFileSync(searchPath, 'utf-8');

    it('uses explicit height: 36 and borderRadius: 18 (radius <= height/2) to prevent pinching on narrow chips', () => {
      expect(content).toMatch(/chip:\s*\{[^}]*height:\s*36/);
      expect(content).toMatch(/chip:\s*\{[^}]*borderRadius:\s*18/);
      expect(content).not.toMatch(/chip:\s*\{[^}]*borderRadius:\s*borderRadius\.full/);
    });
  });

  describe('Provider Booking Request Screen Avatar Rendering (BUG-034)', () => {
    const screenPath = path.resolve(__dirname, '../src/app/(provider)/booking-request/[id].tsx');
    const content = fs.readFileSync(screenPath, 'utf-8');

    it('renders customer avatar image when avatarUrl is present and falls back to initials', () => {
      expect(content).toMatch(/import\s*\{[^}]*Image[^}]*\}\s*from\s*['"]react-native['"]/);
      expect(content).toMatch(/booking\.client\?\.avatarUrl\s*\?\s*\(\s*<Image/);
      expect(content).toMatch(/<Text\s+style=\{styles\.clientAvatarText\}>/);
    });

    it('includes avatarUrl in BookingParticipant type definition', () => {
      expect(content).toMatch(/type\s+BookingParticipant\s*=\s*\{[^}]*avatarUrl\?:/);
    });
  });

  describe('Block Time Translation Keys (BUG-035)', () => {
    const langContextPath = path.resolve(__dirname, '../src/contexts/LanguageContext.tsx');
    const langContent = fs.readFileSync(langContextPath, 'utf-8');
    const blockTimePath = path.resolve(__dirname, '../src/app/(provider)/block-time.tsx');
    const blockTimeContent = fs.readFileSync(blockTimePath, 'utf-8');

    it('defines blockTimeExistingHeader and blockTimeExistingEmpty in LanguageContext with German and English translations', () => {
      expect(langContent).toMatch(/blockTimeExistingHeader:\s*\{\s*de:\s*'Vorhandene Blockaden',\s*en:\s*'Existing Blocked Times'\s*\}/);
      expect(langContent).toMatch(/blockTimeExistingEmpty:\s*\{\s*de:\s*'Keine geplanten Blockaden vorhanden\.',\s*en:\s*'No scheduled blocked times\.'\s*\}/);
    });

    it('uses translation keys in block-time screen so raw keys do not appear', () => {
      expect(blockTimeContent).toContain("t('blockTimeExistingHeader')");
      expect(blockTimeContent).toContain("t('blockTimeExistingEmpty')");
    });
  });
});


