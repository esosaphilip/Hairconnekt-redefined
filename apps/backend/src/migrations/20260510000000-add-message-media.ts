import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageMedia20260510000000 implements MigrationInterface {
  name = 'AddMessageMedia20260510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "mediaUrl" text`);
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "mediaType" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "mediaFilename" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "mediaKey" character varying(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "mediaKey"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "mediaFilename"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "mediaType"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "mediaUrl"`);
  }
}

