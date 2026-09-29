import fs from 'fs';
import path from 'path';
import { formatAmount, formatRating, AppLanguage } from '../src/utils/format';

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

  describe('Appointment Time Formatter Future Contract', () => {
    it.todo('after BUG-021 fix: test formatBookingTime');
  });

  describe('Static Source Scan for BUG-021 (scheduledDate passed to time formatters)', () => {
    // KNOWN BUG-021: In apps/mobile/src/app/(provider)/booking-request/[id].tsx, scheduledDate is parsed
    // with new Date(booking.scheduledDate) and formatted via d.toLocaleTimeString(), which displays the
    // timezone offset of midnight UTC rather than the actual scheduled appointment time.
    it.failing('[KNOWN BUG-021] static source scan: no file under apps/mobile/src passes scheduledDate into time formatters', () => {
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
});
