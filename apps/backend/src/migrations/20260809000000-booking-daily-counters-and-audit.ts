import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingDailyCountersAndAudit20260809000000 implements MigrationInterface {
  name = 'BookingDailyCountersAndAudit20260809000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_daily_counters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "date" date NOT NULL,
        "counter" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_daily_counters_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_booking_daily_counters_date" UNIQUE ("date")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "targetIds" character varying[] NULL
    `);

    const hasNotifPending = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name = 'notificationsPending'
    `);
    if (!hasNotifPending || hasNotifPending.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "bookings"
        ADD COLUMN "notificationsPending" boolean NOT NULL DEFAULT false
      `);
    }

    const hasNotifError = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name = 'notificationsError'
    `);
    if (!hasNotifError || hasNotifError.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "bookings"
        ADD COLUMN "notificationsError" text NULL
      `);
    }

    await queryRunner.query(`
      WITH booking_date_counts AS (
        SELECT
          SUBSTRING("bookingNumber" FROM 4 FOR 8) AS compact_date,
          COUNT(*) AS cnt
        FROM "bookings"
        WHERE "bookingNumber" LIKE 'HC-________-%'
        GROUP BY SUBSTRING("bookingNumber" FROM 4 FOR 8)
      ),
      parsed_dates AS (
        SELECT
          compact_date,
          CASE
            WHEN compact_date ~ '^\\d{8}$' THEN
              TO_DATE(
                SUBSTRING(compact_date FROM 1 FOR 4) || '-' ||
                SUBSTRING(compact_date FROM 5 FOR 2) || '-' ||
                SUBSTRING(compact_date FROM 7 FOR 2),
                'YYYY-MM-DD'
              )
            ELSE NULL
          END AS booking_date,
          cnt
        FROM booking_date_counts
      )
      INSERT INTO "booking_daily_counters" ("date", "counter")
      SELECT booking_date, cnt
      FROM parsed_dates
      WHERE booking_date IS NOT NULL
      ON CONFLICT ("date") DO UPDATE SET "counter" = EXCLUDED."counter"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_daily_counters"`);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "targetIds"
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP COLUMN IF EXISTS "notificationsError"
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP COLUMN IF EXISTS "notificationsPending"
    `);
  }
}
