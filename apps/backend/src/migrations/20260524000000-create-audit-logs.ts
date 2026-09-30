import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs20260524000000 implements MigrationInterface {
  name = 'CreateAuditLogs20260524000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actorUserId" uuid,
        "actorRole" character varying,
        "action" character varying NOT NULL,
        "targetType" character varying,
        "targetId" character varying,
        "outcome" character varying NOT NULL DEFAULT 'success',
        "reason" character varying,
        "requestPath" character varying,
        "requestMethod" character varying,
        "ipAddress" character varying,
        "userAgent" character varying,
        "metadata" jsonb,
        "beforeState" jsonb,
        "afterState" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actorUserId" ON "audit_logs" ("actorUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_target" ON "audit_logs" ("targetType", "targetId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_target"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_actorUserId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
