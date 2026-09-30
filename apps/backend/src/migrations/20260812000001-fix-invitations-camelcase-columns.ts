import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixInvitationsCamelCaseColumns20260812000001 implements MigrationInterface {
  name = 'FixInvitationsCamelCaseColumns20260812000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE invitation_status_enum AS ENUM('pending','accepted','revoked','expired');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    const legacyRow = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'tokenhash' LIMIT 1;`,
    );
    const hasLegacyLowerCaseColumns = Array.isArray(legacyRow) && legacyRow.length > 0;

    if (hasLegacyLowerCaseColumns) {
      await queryRunner.query(`DROP TABLE IF EXISTS invitations CASCADE;`);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL,
        role user_role_enum NOT NULL DEFAULT 'admin',
        "tokenHash" varchar(64) NOT NULL,
        status invitation_status_enum NOT NULL DEFAULT 'pending',
        "invitedBy" uuid NOT NULL REFERENCES users(id),
        "expiresAt" timestamptz NOT NULL DEFAULT now() + interval '7 days',
        "acceptedAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations_id" PRIMARY KEY (id),
        CONSTRAINT "UQ_invitations_tokenHash" UNIQUE ("tokenHash")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invitations_status_createdAt"
      ON invitations (status, "createdAt")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invitations_email_pending"
      ON invitations (lower(email))
      WHERE status = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS invitations`);
    await queryRunner.query(`DROP TYPE IF EXISTS invitation_status_enum`);
  }
}
