import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailVerification20260510001000 implements MigrationInterface {
  name = 'AddUserEmailVerification20260510001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "emailVerificationCode" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "emailVerificationExpires" timestamp`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationExpires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationCode"`);
  }
}

