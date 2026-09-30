import {
  getBerlinToday,
  getBerlinNowMinutes,
  berlinWallClockToUtcMs,
} from '../src/common/utils/berlin-time.util';

describe('Europe/Berlin Time Utility', () => {
  describe('Normal summer instant (CEST = UTC+2)', () => {
    it('converts summer Berlin wall-clock to exact UTC timestamp', () => {
      // 10:00 CEST -> 08:00 UTC
      const ms = berlinWallClockToUtcMs('2026-06-15', '10:00');
      expect(new Date(ms).toISOString()).toBe('2026-06-15T08:00:00.000Z');
    });

    it('computes Berlin date and minutes accurately during summer', () => {
      // 2026-06-15 08:45 UTC is 10:45 CEST in Berlin
      const utcDate = new Date('2026-06-15T08:45:00.000Z');
      expect(getBerlinToday(utcDate)).toBe('2026-06-15');
      expect(getBerlinNowMinutes(utcDate)).toBe(10 * 60 + 45); // 645 minutes
    });

    it('handles late night UTC transitioning to next day in Berlin', () => {
      // 2026-06-14 23:15 UTC is 2026-06-15 01:15 CEST in Berlin
      const utcDate = new Date('2026-06-14T23:15:00.000Z');
      expect(getBerlinToday(utcDate)).toBe('2026-06-15');
      expect(getBerlinNowMinutes(utcDate)).toBe(1 * 60 + 15); // 75 minutes
    });
  });

  describe('Normal winter instant (CET = UTC+1)', () => {
    it('converts winter Berlin wall-clock to exact UTC timestamp', () => {
      // 10:00 CET -> 09:00 UTC
      const ms = berlinWallClockToUtcMs('2026-12-15', '10:00');
      expect(new Date(ms).toISOString()).toBe('2026-12-15T09:00:00.000Z');
    });

    it('computes Berlin date and minutes accurately during winter', () => {
      // 2026-12-15 09:15 UTC is 10:15 CET in Berlin
      const utcDate = new Date('2026-12-15T09:15:00.000Z');
      expect(getBerlinToday(utcDate)).toBe('2026-12-15');
      expect(getBerlinNowMinutes(utcDate)).toBe(10 * 60 + 15); // 615 minutes
    });

    it('handles late night UTC transitioning to next day in Berlin', () => {
      // 2026-12-14 23:30 UTC is 2026-12-15 00:30 CET in Berlin
      const utcDate = new Date('2026-12-14T23:30:00.000Z');
      expect(getBerlinToday(utcDate)).toBe('2026-12-15');
      expect(getBerlinNowMinutes(utcDate)).toBe(30); // 30 minutes
    });
  });

  describe('Daylight Saving Time transitions (2026)', () => {
    it('handles both sides of fall-back transition on 25 October 2026', () => {
      // Before transition: 01:00 on 2026-10-25 is CEST (UTC+2) -> 2026-10-24 23:00:00 UTC
      const beforeMs = berlinWallClockToUtcMs('2026-10-25', '01:00');
      expect(new Date(beforeMs).toISOString()).toBe('2026-10-24T23:00:00.000Z');

      // After transition: 04:00 on 2026-10-25 is CET (UTC+1) -> 2026-10-25 03:00:00 UTC
      const afterMs = berlinWallClockToUtcMs('2026-10-25', '04:00');
      expect(new Date(afterMs).toISOString()).toBe('2026-10-25T03:00:00.000Z');
    });

    it('handles both sides of spring-forward transition on 29 March 2026', () => {
      // Before transition: 01:00 on 2026-03-29 is CET (UTC+1) -> 2026-03-29 00:00:00 UTC
      const beforeMs = berlinWallClockToUtcMs('2026-03-29', '01:00');
      expect(new Date(beforeMs).toISOString()).toBe('2026-03-29T00:00:00.000Z');

      // After transition: 04:00 on 2026-03-29 is CEST (UTC+2) -> 2026-03-29 02:00:00 UTC
      const afterMs = berlinWallClockToUtcMs('2026-03-29', '04:00');
      expect(new Date(afterMs).toISOString()).toBe('2026-03-29T02:00:00.000Z');
    });
  });

  describe('Midnight boundaries', () => {
    it('handles exact midnight in summer', () => {
      // 2026-06-15 00:00 CEST -> 2026-06-14 22:00:00 UTC
      const ms = berlinWallClockToUtcMs('2026-06-15', '00:00');
      expect(new Date(ms).toISOString()).toBe('2026-06-14T22:00:00.000Z');

      const midnightUtc = new Date('2026-06-14T22:00:00.000Z');
      expect(getBerlinToday(midnightUtc)).toBe('2026-06-15');
      expect(getBerlinNowMinutes(midnightUtc)).toBe(0);

      // 1 second before midnight in Berlin
      const beforeMidnightUtc = new Date('2026-06-14T21:59:59.000Z');
      expect(getBerlinToday(beforeMidnightUtc)).toBe('2026-06-14');
      expect(getBerlinNowMinutes(beforeMidnightUtc)).toBe(23 * 60 + 59); // 1439
    });

    it('handles exact midnight in winter', () => {
      // 2026-12-15 00:00 CET -> 2026-12-14 23:00:00 UTC
      const ms = berlinWallClockToUtcMs('2026-12-15', '00:00');
      expect(new Date(ms).toISOString()).toBe('2026-12-14T23:00:00.000Z');

      const midnightUtc = new Date('2026-12-14T23:00:00.000Z');
      expect(getBerlinToday(midnightUtc)).toBe('2026-12-15');
      expect(getBerlinNowMinutes(midnightUtc)).toBe(0);

      // 1 second before midnight in Berlin
      const beforeMidnightUtc = new Date('2026-12-14T22:59:59.000Z');
      expect(getBerlinToday(beforeMidnightUtc)).toBe('2026-12-14');
      expect(getBerlinNowMinutes(beforeMidnightUtc)).toBe(23 * 60 + 59); // 1439
    });
  });
});
