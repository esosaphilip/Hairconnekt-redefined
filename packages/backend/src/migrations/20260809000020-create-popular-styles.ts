import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePopularStyles20260809000020 implements MigrationInterface {
  name = 'CreatePopularStyles20260809000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "popular_styles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "imageUrl" character varying,
        "emoji" character varying NOT NULL DEFAULT '✨',
        "colorHex" character varying NOT NULL DEFAULT '#C8860A',
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "imageKey" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_popular_styles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_popular_styles_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_popular_styles_isActive" ON "popular_styles" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_popular_styles_sortOrder" ON "popular_styles" ("sortOrder")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_popular_styles_sortOrder"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_popular_styles_isActive"`);
    await queryRunner.query(`DROP TABLE "popular_styles"`);
  }
}
