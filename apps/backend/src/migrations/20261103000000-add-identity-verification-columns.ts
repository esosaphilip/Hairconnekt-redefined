import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdentityVerificationColumns20261103000000 implements MigrationInterface {
  name = 'AddIdentityVerificationColumns20261103000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // BUG-090: Additive identity-verification columns on providers.
    // All three are nullable with no backfill: every existing row stays
    // unverified (identityVerifiedAt = null) and age-unconfirmed.
    await queryRunner.query(`ALTER TABLE "providers" ADD COLUMN "identityVerifiedAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE "providers" ADD COLUMN "identityVerificationMethod" varchar(20)`);
    await queryRunner.query(`ALTER TABLE "providers" ADD COLUMN "ageConfirmedAt" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN "ageConfirmedAt"`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN "identityVerificationMethod"`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN "identityVerifiedAt"`);
  }
}
