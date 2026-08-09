import { MigrationInterface, QueryRunner } from 'typeorm';

export class QueryPerformanceIndexes20260809000010 implements MigrationInterface {
  name = 'QueryPerformanceIndexes20260809000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_providerId_scheduledDate_scheduledTime" ON "bookings" ("providerId", "scheduledDate", "scheduledTime")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_clientId_status_scheduledDate" ON "bookings" ("clientId", "status", "scheduledDate")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_providerId_status_scheduledDate" ON "bookings" ("providerId", "status", "scheduledDate")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_cancelledAt" ON "bookings" ("cancelledAt")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_favourites_providerId" ON "favourites" ("providerId")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reviews_providerId_createdAt" ON "reviews" ("providerId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reviews_bookingId" ON "reviews" ("bookingId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reviews_clientId_createdAt" ON "reviews" ("clientId", "createdAt")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_messages_conversationId_createdAt" ON "messages" ("conversationId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_messages_senderId_createdAt" ON "messages" ("senderId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_messages_conversationId_senderId_isRead" ON "messages" ("conversationId", "senderId", "isRead")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_conversations_participant1Id_updatedAt" ON "conversations" ("participant1Id", "updatedAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_conversations_participant2Id_updatedAt" ON "conversations" ("participant2Id", "updatedAt")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_availability_schedules_providerId_dayOfWeek" ON "availability_schedules" ("providerId", "dayOfWeek")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_time_blocks_providerId_startDate_endDate" ON "time_blocks" ("providerId", "startDate", "endDate")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_services_providerId_categoryId_isActive" ON "services" ("providerId", "categoryId", "isActive")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_addresses_userId" ON "addresses" ("userId")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_actorUserId_action_createdAt" ON "audit_logs" ("actorUserId", "action", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_targetType_targetId_createdAt" ON "audit_logs" ("targetType", "targetId", "createdAt")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_targetType_targetId_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_actorUserId_action_createdAt"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_addresses_userId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_services_providerId_categoryId_isActive"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_time_blocks_providerId_startDate_endDate"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_availability_schedules_providerId_dayOfWeek"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_userId_createdAt"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_conversations_participant2Id_updatedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_conversations_participant1Id_updatedAt"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_conversationId_senderId_isRead"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_senderId_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_conversationId_createdAt"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_clientId_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_bookingId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_providerId_createdAt"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_favourites_providerId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_cancelledAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_providerId_status_scheduledDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_clientId_status_scheduledDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_providerId_scheduledDate_scheduledTime"`);
  }
}
