import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConsentColumnsAndBackfill20260827000000 implements MigrationInterface {
  name = 'AddConsentColumnsAndBackfill20260827000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ITEM 2: Add 4 additive consent columns
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "acceptedTerms" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "acceptedTermsAt" timestamp`);

    await queryRunner.query(`ALTER TABLE "providers" ADD COLUMN "portfolioMarketingConsent" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "providers" ADD COLUMN "portfolioMarketingConsentAt" timestamp`);

    // ITEM 3: Backfill legacy users: acceptedTerms = true, acceptedTermsAt = existing createdAt
    // Reasonable proxy: every pre-existing user passed through a ToS-gated registration flow.
    // This only affects pre-migration users (those whose acceptedTermsAt is still null / just-added default).
    const backfillResult = await queryRunner.query(
      `UPDATE "users" SET "acceptedTerms" = true, "acceptedTermsAt" = "createdAt" WHERE "acceptedTermsAt" IS NULL`,
    );
    console.log(`[Migration ${this.name}] Backfilled acceptedTerms for ${backfillResult[1] ?? backfillResult.affected ?? 'unknown'} legacy user row(s).`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN "portfolioMarketingConsentAt"`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN "portfolioMarketingConsent"`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "acceptedTermsAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "acceptedTerms"`);
  }
}
