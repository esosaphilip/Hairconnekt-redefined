import { assertSafeDatabaseHost } from './env-guard';

describe('Production Safety Guard (R11)', () => {
  it('allows safe local hosts: localhost, 127.0.0.1, postgres', () => {
    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@localhost:5432/testdb');
    }).not.toThrow();

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@127.0.0.1:5432/testdb');
    }).not.toThrow();

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@postgres:5432/testdb');
    }).not.toThrow();

    expect(() => {
      assertSafeDatabaseHost(undefined, '127.0.0.1');
    }).not.toThrow();
  });

  it('throws immediately if the connection string contains "neon"', () => {
    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@ep-cool-neon-db.neon.tech/neondb');
    }).toThrow(/neon/i);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@localhost:5432/neon_backup');
    }).toThrow(/neon/i);
  });

  it('throws immediately if the database host is not in the allowlist', () => {
    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@api.hairconnekt.de:5432/hairconnekt');
    }).toThrow(/PRODUCTION GUARD TRIGGERED/);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@db.eu-central-1.amazonaws.com:5432/prod');
    }).toThrow(/PRODUCTION GUARD TRIGGERED/);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@192.168.1.50:5432/remotedb');
    }).toThrow(/PRODUCTION GUARD TRIGGERED/);
  });
});
