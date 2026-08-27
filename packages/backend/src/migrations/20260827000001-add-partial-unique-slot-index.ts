import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartialUniqueSlotIndex20260827000001 implements MigrationInterface {
  name = 'AddPartialUniqueSlotIndex20260827000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_active_bookings_slot" ON "bookings" ("providerId", "scheduledDate", "scheduledTime") WHERE "status" <> 'CANCELLED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_active_bookings_slot"`);
  }
}
