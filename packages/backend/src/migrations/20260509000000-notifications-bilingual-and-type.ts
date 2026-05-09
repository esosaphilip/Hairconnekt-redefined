import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationsBilingualAndType20260509000000 implements MigrationInterface {
  name = 'NotificationsBilingualAndType20260509000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "titleDe" TYPE character varying(200)`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "bodyDe" TYPE character varying(500)`);

    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "titleEn" character varying(200)`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "bodyEn" character varying(500)`);

    await queryRunner.query(`UPDATE "notifications" SET "titleEn" = "titleDe" WHERE "titleEn" IS NULL`);
    await queryRunner.query(`UPDATE "notifications" SET "bodyEn" = "bodyDe" WHERE "bodyEn" IS NULL`);

    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "titleEn" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "bodyEn" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE character varying(100) USING "type"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);

    await queryRunner.query(`UPDATE "notifications" SET "data" = '{}'::jsonb WHERE "data" IS NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" DROP DEFAULT`);

    await queryRunner.query(`CREATE TYPE "notifications_type_enum" AS ENUM ('booking_request','booking_confirmed','booking_cancelled','booking_completed','new_message','new_review','system')`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "notifications_type_enum" USING "type"::text::"notifications_type_enum"`,
    );

    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "bodyEn"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "titleEn"`);

    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "bodyDe" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "titleDe" TYPE character varying`);
  }
}

