import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20000101000000 implements MigrationInterface {
  name = 'InitialSchema20000101000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Enums (Postgres 16+ supports CREATE TYPE IF NOT EXISTS for enums)
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "user_role_enum" AS ENUM ('client','provider','admin');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "gender_enum" AS ENUM ('male','female','diverse','unspecified');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "provider_type_enum" AS ENUM ('freelancer','salon','mobile','barber');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "cancellation_policy_enum" AS ENUM ('24h','48h','72h');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "provider_status_enum" AS ENUM ('pending','approved','rejected','suspended');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "service_price_type_enum" AS ENUM ('fixed','from');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "booking_status_enum" AS ENUM ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "payment_status_enum" AS ENUM ('pending','paid');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "cancelled_by_enum" AS ENUM ('client','provider','system');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "notifications_type_enum" AS ENUM ('booking_request','booking_confirmed','booking_cancelled','booking_completed','new_message','new_review','system');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    // ========== Base tables (no FKs) ==========

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "iconName" character varying,
        "description" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_service_categories_name" UNIQUE ("name")
      )
    `);

    // ========== users ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying,
        "passwordHash" character varying,
        "role" "user_role_enum" NOT NULL,
        "avatarUrl" character varying,
        "birthDate" date,
        "gender" "gender_enum" NOT NULL DEFAULT 'unspecified',
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "isPhoneVerified" boolean NOT NULL DEFAULT false,
        "googleId" character varying,
        "expoPushToken" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_isActive" ON "users" ("isActive")`);

    // ========== providers (FK→users) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "providerType" "provider_type_enum" NOT NULL,
        "businessName" character varying NOT NULL,
        "bio" text,
        "street" character varying NOT NULL,
        "houseNumber" character varying NOT NULL,
        "city" character varying NOT NULL,
        "postalCode" character varying NOT NULL,
        "lat" numeric(10,7),
        "lng" numeric(10,7),
        "serviceRadius" integer NOT NULL DEFAULT 25,
        "languages" character varying array,
        "cancellationPolicy" "cancellation_policy_enum" NOT NULL DEFAULT '24h',
        "status" "provider_status_enum" NOT NULL DEFAULT 'pending',
        "avgRating" numeric(3,2) NOT NULL DEFAULT 0,
        "totalReviews" integer NOT NULL DEFAULT 0,
        "isOnline" boolean NOT NULL DEFAULT false,
        "bufferMinutes" integer NOT NULL DEFAULT 0,
        "experienceYears" integer,
        "idDocumentUrl" character varying,
        "avatarUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_providers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_providers_userId" FOREIGN KEY ("userId") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_providers_userId" ON "providers" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_providers_status" ON "providers" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_providers_city_postalCode" ON "providers" ("city", "postalCode")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_providers_isOnline" ON "providers" ("isOnline")`);

    // ========== addresses (FK→users) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "addresses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "label" character varying,
        "street" character varying NOT NULL,
        "houseNumber" character varying NOT NULL,
        "city" character varying NOT NULL,
        "postalCode" character varying NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_addresses_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_addresses_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_addresses_userId" ON "addresses" ("userId")`);

    // ========== services (FK→providers, FK→service_categories) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "providerId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" character varying(500),
        "durationMin" integer NOT NULL,
        "priceType" "service_price_type_enum" NOT NULL DEFAULT 'fixed',
        "price" numeric(10,2) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_services_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_services_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_services_categoryId" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_services_providerId_categoryId_isActive" ON "services" ("providerId", "categoryId", "isActive")`);

    // ========== portfolio_images (FK→providers) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "portfolio_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "providerId" uuid NOT NULL,
        "imageUrl" character varying NOT NULL,
        "caption" character varying(200),
        "styleTags" character varying array,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_portfolio_images_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_portfolio_images_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_portfolio_images_providerId" ON "portfolio_images" ("providerId")`);

    // ========== availability_schedules (FK→providers) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "availability_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "providerId" uuid NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "isOpen" boolean NOT NULL DEFAULT false,
        "openTime" TIME,
        "closeTime" TIME,
        CONSTRAINT "PK_availability_schedules_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_availability_schedules_providerId_dayOfWeek" UNIQUE ("providerId", "dayOfWeek"),
        CONSTRAINT "FK_availability_schedules_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_availability_schedules_providerId_dayOfWeek" ON "availability_schedules" ("providerId", "dayOfWeek")`);

    // ========== time_blocks (FK→providers) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "time_blocks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "providerId" uuid NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "startTime" TIME,
        "endTime" TIME,
        "isAllDay" boolean NOT NULL DEFAULT false,
        "reason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_time_blocks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_time_blocks_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_time_blocks_providerId_startDate_endDate" ON "time_blocks" ("providerId", "startDate", "endDate")`);

    // ========== conversations (FK→users x2) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "participant1Id" uuid NOT NULL,
        "participant2Id" uuid NOT NULL,
        "lastMessageAt" TIMESTAMP,
        "lastMessagePreview" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_participant1Id" FOREIGN KEY ("participant1Id") REFERENCES "users"("id"),
        CONSTRAINT "FK_conversations_participant2Id" FOREIGN KEY ("participant2Id") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_conversations_participant1Id_updatedAt" ON "conversations" ("participant1Id", "updatedAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_conversations_participant2Id_updatedAt" ON "conversations" ("participant2Id", "updatedAt")`);

    // ========== messages (FK→conversations, FK→users) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        "content" text NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversationId" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_senderId" FOREIGN KEY ("senderId") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_messages_conversationId_createdAt" ON "messages" ("conversationId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_messages_senderId_createdAt" ON "messages" ("senderId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_messages_conversationId_senderId_isRead" ON "messages" ("conversationId", "senderId", "isRead")`);

    // ========== bookings (FK→users, FK→providers) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "bookingNumber" character varying NOT NULL,
        "clientId" uuid NOT NULL,
        "providerId" uuid NOT NULL,
        "status" "booking_status_enum" NOT NULL DEFAULT 'PENDING',
        "scheduledDate" date NOT NULL,
        "scheduledTime" TIME NOT NULL,
        "isMobile" boolean NOT NULL DEFAULT false,
        "clientNotes" character varying(500),
        "totalPrice" numeric(10,2) NOT NULL,
        "paymentMethod" character varying NOT NULL DEFAULT 'CASH',
        "paymentStatus" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "platformFeePercent" numeric(5,2) NOT NULL DEFAULT 0,
        "platformFeeAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "providerPayout" numeric(10,2) NOT NULL DEFAULT 0,
        "addressStreet" character varying,
        "addressHouseNumber" character varying,
        "addressCity" character varying,
        "addressPostalCode" character varying,
        "cancelledBy" "cancelled_by_enum",
        "cancellationReason" character varying,
        "cancelledAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_bookings_bookingNumber" UNIQUE ("bookingNumber"),
        CONSTRAINT "FK_bookings_clientId" FOREIGN KEY ("clientId") REFERENCES "users"("id"),
        CONSTRAINT "FK_bookings_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_providerId_scheduledDate_scheduledTime" ON "bookings" ("providerId", "scheduledDate", "scheduledTime")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_clientId_status_scheduledDate" ON "bookings" ("clientId", "status", "scheduledDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_providerId_status_scheduledDate" ON "bookings" ("providerId", "status", "scheduledDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_cancelledAt" ON "bookings" ("cancelledAt")`);

    // ========== booking_services join table (M2M bookings <-> services) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_services" (
        "bookingsId" uuid NOT NULL,
        "servicesId" uuid NOT NULL,
        CONSTRAINT "PK_booking_services" PRIMARY KEY ("bookingsId", "servicesId"),
        CONSTRAINT "FK_booking_services_bookingsId" FOREIGN KEY ("bookingsId") REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_booking_services_servicesId" FOREIGN KEY ("servicesId") REFERENCES "services"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_services_bookingsId" ON "booking_services" ("bookingsId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_services_servicesId" ON "booking_services" ("servicesId")`);

    // ========== favourites (FK→users, FK→providers) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favourites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "clientId" uuid NOT NULL,
        "providerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favourites_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_favourites_clientId_providerId" UNIQUE ("clientId", "providerId"),
        CONSTRAINT "FK_favourites_clientId" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_favourites_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_favourites_providerId" ON "favourites" ("providerId")`);

    // ========== reviews (FK→users, FK→providers, FK→bookings) ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "bookingId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "providerId" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" character varying(500) NOT NULL,
        "providerResponse" text,
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reviews_bookingId" UNIQUE ("bookingId"),
        CONSTRAINT "FK_reviews_bookingId" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id"),
        CONSTRAINT "FK_reviews_clientId" FOREIGN KEY ("clientId") REFERENCES "users"("id"),
        CONSTRAINT "FK_reviews_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_bookingId" ON "reviews" ("bookingId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_providerId_createdAt" ON "reviews" ("providerId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_clientId_createdAt" ON "reviews" ("clientId", "createdAt")`);

    // ========== notifications (FK→users) ==========
    // Note: this is the PRE-migration 20260509 state:
    // - No titleEn/bodyEn (added later)
    // - titleDe/bodyDe are plain varchar (migration narrows to 200/500)
    // - type is a Postgres ENUM (migration casts to varchar + drops the type)
    // - data is nullable jsonb with no default (migration backfills, adds NOT NULL + DEFAULT)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" "notifications_type_enum" NOT NULL,
        "titleDe" character varying NOT NULL,
        "bodyDe" character varying NOT NULL,
        "data" jsonb,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt")`);

    // ========== Auth: email_verifications ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_verifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "otpHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_verifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_verifications_userId" ON "email_verifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_verifications_expiresAt" ON "email_verifications" ("expiresAt")`);

    // ========== Auth: password_reset_requests ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "otpHash" character varying(255) NOT NULL,
        "resetTokenHash" character varying(64),
        "expiresAt" TIMESTAMP NOT NULL,
        "otpVerifiedAt" TIMESTAMP,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_requests_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_password_reset_requests_userId" ON "password_reset_requests" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_password_reset_requests_resetTokenHash" ON "password_reset_requests" ("resetTokenHash")`);

    // ========== Auth: refresh_tokens ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying(500) NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token" ON "refresh_tokens" ("token")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback in reverse dependency order. IF NOT EXISTS / IF EXISTS everywhere.
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verifications"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_notifications_userId_createdAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_reviews_clientId_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_reviews_providerId_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_reviews_bookingId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_favourites_providerId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "favourites"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_booking_services_servicesId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_booking_services_bookingsId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_services"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_cancelledAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_providerId_status_scheduledDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_clientId_status_scheduledDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_providerId_scheduledDate_scheduledTime"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_messages_conversationId_senderId_isRead"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_messages_senderId_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_messages_conversationId_createdAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_conversations_participant2Id_updatedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_conversations_participant1Id_updatedAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_time_blocks_providerId_startDate_endDate"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "time_blocks"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_availability_schedules_providerId_dayOfWeek"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availability_schedules"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_portfolio_images_providerId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "portfolio_images"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_services_providerId_categoryId_isActive"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_addresses_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "addresses"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_providers_isOnline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_providers_city_postalCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_providers_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_providers_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "providers"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_isActive"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_role"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_categories"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cancelled_by_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "booking_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "service_price_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cancellation_policy_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "gender_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
