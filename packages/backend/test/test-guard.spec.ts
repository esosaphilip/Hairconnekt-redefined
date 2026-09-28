import { assertSafeDatabaseHost } from './env-guard';

describe('Production Safety Guard (R11 & Local DB Protection)', () => {
  it('allows safe local hosts when database name ends in _test', () => {
    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@localhost:5432/hairconnekt_test');
    }).not.toThrow();

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@127.0.0.1:5433/custom_test');
    }).not.toThrow();

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@postgres:5432/app_test');
    }).not.toThrow();

    expect(() => {
      assertSafeDatabaseHost(undefined, '127.0.0.1', 'hairconnekt_test');
    }).not.toThrow();
  });

  it('throws immediately if the connection string contains "neon"', () => {
    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@ep-cool-neon-db.neon.tech/neondb_test');
    }).toThrow(/neon/i);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@localhost:5432/neon_backup_test');
    }).toThrow(/neon/i);
  });

  it('throws immediately if the database host is not in the allowlist', () => {
    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@api.hairconnekt.de:5432/hairconnekt_test');
    }).toThrow(/PRODUCTION GUARD TRIGGERED/);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@db.eu-central-1.amazonaws.com:5432/prod_test');
    }).toThrow(/PRODUCTION GUARD TRIGGERED/);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@192.168.1.50:5432/remotedb_test');
    }).toThrow(/PRODUCTION GUARD TRIGGERED/);
  });

  it('throws immediately if the database name does not end in "_test"', () => {
    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@localhost:5432/hairconnekt');
    }).toThrow(/must end in "_test"/);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@localhost:5433/production');
    }).toThrow(/must end in "_test"/);

    expect(() => {
      assertSafeDatabaseHost('postgres://user:pass@127.0.0.1:5432/testdb');
    }).toThrow(/must end in "_test"/);
  });
});
