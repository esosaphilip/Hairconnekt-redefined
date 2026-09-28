/**
 * Time and Timezone Test Utilities
 *
 * All backend tests run with TZ=UTC.
 * Clock is frozen per test using Jest modern fake timers where ONLY Date is faked,
 * allowing async, HTTP, and database timers (setTimeout, setImmediate, Promise, etc.) to function normally.
 */

export const SUMMER_NOW = '2026-09-28T07:29:00Z'; // 09:29 in Berlin, UTC+2
export const WINTER_NOW = '2026-11-03T08:29:00Z'; // 09:29 in Berlin, UTC+1
export const DST_SWITCH_DAY = '2026-10-25'; // Clocks go back at 01:00Z (03:00 CEST -> 02:00 CET)

export function freezeClock(isoInstant: string | Date): void {
  jest.useFakeTimers({
    legacyFakeTimers: false,
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
  jest.setSystemTime(new Date(isoInstant));
}

export function unfreezeClock(): void {
  jest.useRealTimers();
}
