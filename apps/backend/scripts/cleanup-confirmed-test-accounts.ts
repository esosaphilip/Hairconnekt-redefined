import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
import { Provider } from '../src/entities/provider.entity';
import { User } from '../src/entities/user.entity';
import { Booking } from '../src/entities/booking.entity';
import { Review } from '../src/entities/review.entity';
import { Favourite } from '../src/entities/favourite.entity';
import { PortfolioImage } from '../src/entities/portfolio-image.entity';
import { TimeBlock } from '../src/entities/time-block.entity';
import { Service } from '../src/entities/service.entity';
import { AvailabilitySchedule } from '../src/entities/availability-schedule.entity';
import { Notification } from '../src/entities/notification.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { Message } from '../src/entities/message.entity';
import { Address } from '../src/entities/address.entity';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { PasswordResetRequest } from '../src/auth/entities/password-reset-request.entity';
import { EmailVerification } from '../src/auth/entities/email-verification.entity';
import { AuditLog } from '../src/audit/audit-log.entity';
import { getDatabaseSslConfig } from '../src/common/database/database-ssl';

/**
 * cleanup-confirmed-test-accounts.ts
 *
 * TypeORM-backed script to HARD-DELETE the 5 confirmed fake test accounts
 * (UUID list below) plus every row that depends on them via foreign-key,
 * in correct children-before-parents order.
 *
 * Follows conventions of purge-test-data.ts:
 *   - DATABASE_URL + PRODUCTION_DB_HOST env vars required
 *   - Production-detected double-opt-in (ALLOW_PRODUCTION_PURGE)
 *   - Explicit CONFIRM_DELETE_TEST_ACCOUNTS=true confirmation flag
 *   - DRY_RUN=true preview mode (shows what WOULD be deleted, no changes)
 *
 * ALTERNATIVE: For founder running directly in Neon SQL editor, prefer
 * the sibling cleanup-confirmed-test-accounts.sql (raw SQL) — no build
 * step, no DATABASE_URL config on local machine.  This TypeScript file
 * exists for programmatic / CI use if preferred.
 */

const TARGET_USER_IDS: readonly string[] = [
  '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899', // houb@gmail.com    (provider)
  '38393b09-e989-4484-9d44-6c5e0e377d1d', // sophia@gmail.com  (provider)
  '798ede9b-29b3-4353-a0e5-e492148d8599', // myfood@gmail.com  (client)
  '076e5624-905d-4c71-877c-ae3fdc67c98c', // rebuild@test.de   (provider)
  '690562e6-0066-41cd-a2f6-5d5959020dfa', // paul@gmail.com    (provider)
] as const;

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`${key} fehlt.`);
  return v;
};

const getDbHost = (databaseUrl: string): string => {
  try {
    const u = new URL(databaseUrl);
    return u.hostname;
  } catch {
    throw new Error('DATABASE_URL ist ungültig.');
  }
};

const main = async () => {
  const databaseUrl = requireEnv('DATABASE_URL');
  const prodHost = requireEnv('PRODUCTION_DB_HOST');
  const dbHost = getDbHost(databaseUrl);
  const isProd = dbHost === prodHost;

  if (process.env.CONFIRM_DELETE_TEST_ACCOUNTS !== 'true') {
    throw new Error(
      'Abbruch: Setze CONFIRM_DELETE_TEST_ACCOUNTS=true um die unwiderrufliche Löschung zu bestätigen.',
    );
  }

  if (isProd && process.env.ALLOW_PRODUCTION_PURGE !== 'true') {
    throw new Error(
      'Abbruch: Production erkannt. Setze zusätzlich ALLOW_PRODUCTION_PURGE=true um fortzufahren.',
    );
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: getDatabaseSslConfig(),
    entities: [
      User,
      Provider,
      Booking,
      Review,
      Favourite,
      PortfolioImage,
      TimeBlock,
      Service,
      AvailabilitySchedule,
      Notification,
      Conversation,
      Message,
      Address,
      RefreshToken,
      PasswordResetRequest,
      EmailVerification,
      AuditLog,
    ],
  });

  await dataSource.initialize();
  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 1. Resolve which of the target UUIDs actually exist.
      const existingUsers = await queryRunner.manager
        .createQueryBuilder(User, 'u')
        .select(['u.id', 'u.email', 'u."firstName"', 'u."lastName"', 'u.role'])
        .where('u.id IN (:...ids)', { ids: TARGET_USER_IDS as unknown as string[] })
        .getMany();

      console.log(`DB Host: ${dbHost}${isProd ? ' (PRODUCTION — zusätzliches ALLOW_PRODUCTION_PURGE erteilt)' : ''}`);
      console.log(`Angefragte Nutzer-IDs: ${TARGET_USER_IDS.length}`);
      console.log(`Vorhandene Nutzer in DB:   ${existingUsers.length}`);
      existingUsers.forEach((u) => {
        console.log(`  - ${u.id}  ${u.role.padEnd(8)}  ${u.email}  (${u.firstName} ${u.lastName})`);
      });

      if (existingUsers.length === 0) {
        console.log('Keiner der 5 Ziel-Nutzer existiert. Abbruch ohne Änderungen.');
        return;
      }

      const existingUserIds = existingUsers.map((u) => u.id);
      const existingProviderIds = (
        await queryRunner.manager
          .createQueryBuilder(Provider, 'p')
          .select('p.id')
          .where('p."userId" IN (:...uids)', { uids: existingUserIds })
          .getRawMany<{ id: string }>()
      ).map((row) => row.id);

      // 2. Preview row counts across every dependent table.
      const counts: Array<[string, number]> = [];
      const push = async (label: string, qb: { getCount: () => Promise<number> }) => {
        counts.push([label, await qb.getCount()]);
      };

      await push('audit_logs (actorUserId)',
        queryRunner.manager.createQueryBuilder(AuditLog, 'al').where('al."actorUserId" IN (:...uids)', { uids: existingUserIds }));
      await push('notifications (userId)',
        queryRunner.manager.createQueryBuilder(Notification, 'n').where('n."userId" IN (:...uids)', { uids: existingUserIds }));
      await push('addresses (userId)',
        queryRunner.manager.createQueryBuilder(Address, 'a').where('a."userId" IN (:...uids)', { uids: existingUserIds }));
      await push('refresh_tokens (userId)',
        queryRunner.manager.createQueryBuilder(RefreshToken, 'rt').where('rt."userId" IN (:...uids)', { uids: existingUserIds }));
      await push('password_reset_requests (userId)',
        queryRunner.manager.createQueryBuilder(PasswordResetRequest, 'p').where('p."userId" IN (:...uids)', { uids: existingUserIds }));
      await push('email_verifications (userId)',
        queryRunner.manager.createQueryBuilder(EmailVerification, 'ev').where('ev."userId" IN (:...uids)', { uids: existingUserIds }));
      await push('favourites (clientId OR providerId)',
        queryRunner.manager.createQueryBuilder(Favourite, 'f')
          .where('f."clientId" IN (:...uids)', { uids: existingUserIds })
          .orWhere(existingProviderIds.length > 0 ? 'f."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds }));
      await push('messages (senderId)',
        queryRunner.manager.createQueryBuilder(Message, 'm').where('m."senderId" IN (:...uids)', { uids: existingUserIds }));
      await push('conversations (participant1Id OR participant2Id)',
        queryRunner.manager.createQueryBuilder(Conversation, 'c')
          .where('c."participant1Id" IN (:...uids)', { uids: existingUserIds })
          .orWhere('c."participant2Id" IN (:...uids)', { uids: existingUserIds }));
      const bookingIds = (
        await queryRunner.manager
          .createQueryBuilder(Booking, 'b')
          .select('b.id')
          .where('b."clientId" IN (:...uids)', { uids: existingUserIds })
          .orWhere(existingProviderIds.length > 0 ? 'b."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds })
          .getRawMany<{ id: string }>()
      ).map((row) => row.id);
      counts.push(['bookings (clientId OR providerId)', bookingIds.length] as [string, number]);
      await push('reviews (clientId OR providerId OR bookingId)',
        queryRunner.manager.createQueryBuilder(Review, 'r')
          .where('r."clientId" IN (:...uids)', { uids: existingUserIds })
          .orWhere(existingProviderIds.length > 0 ? 'r."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds })
          .orWhere(bookingIds.length > 0 ? 'r."bookingId" IN (:...bids)' : '1=0', { bids: bookingIds }));
      await push('portfolio_images (providerId)',
        queryRunner.manager.createQueryBuilder(PortfolioImage, 'pi')
          .where(existingProviderIds.length > 0 ? 'pi."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds }));
      await push('time_blocks (providerId)',
        queryRunner.manager.createQueryBuilder(TimeBlock, 'tb')
          .where(existingProviderIds.length > 0 ? 'tb."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds }));
      await push('services (providerId)',
        queryRunner.manager.createQueryBuilder(Service, 's')
          .where(existingProviderIds.length > 0 ? 's."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds }));
      await push('availability_schedules (providerId)',
        queryRunner.manager.createQueryBuilder(AvailabilitySchedule, 'as_')
          .where(existingProviderIds.length > 0 ? 'as_."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds }));
      counts.push(['providers (userId)', existingProviderIds.length] as [string, number]);
      counts.push(['users (root rows)', existingUserIds.length] as [string, number]);

      console.log('\n--- Vorschau: zu löschende Zeilen pro Tabelle ---');
      const totalRows = counts.reduce((sum, [, n]) => sum + n, 0);
      counts.forEach(([label, n]) => {
        console.log(`  ${String(n).padStart(4)}x  ${label}`);
      });
      console.log(`  ------\n  ${String(totalRows).padStart(4)}  ZEILEN GESAMT`);

      if (process.env.DRY_RUN === 'true') {
        console.log('\nDRY_RUN=true — keine Änderungen wurden durchgeführt.');
        return;
      }

      // 3. Execute deletions in strict FK children-before-parents order, inside a transaction.
      console.log('\n--- Starte Transaktions-Löschung ---');
      await queryRunner.startTransaction();
      try {
        const del = (tableLabel: string, affected: number) =>
          console.log(`  ${String(affected).padStart(4)} Zeilen gelöscht:  ${tableLabel}`);

        // 1. Audit logs (no FK constraint)
        del('audit_logs',
          (await queryRunner.manager.delete(AuditLog, { actorUserId: In(existingUserIds) })).affected ?? 0);

        // 2. Notifications / addresses / tokens (direct userId FK, leaf rows, no dependents)
        del('notifications',
          (await queryRunner.manager.delete(Notification, { userId: In(existingUserIds) })).affected ?? 0);
        del('refresh_tokens',
          (await queryRunner.manager.delete(RefreshToken, { userId: In(existingUserIds) })).affected ?? 0);
        del('password_reset_requests',
          (await queryRunner.manager.delete(PasswordResetRequest, { userId: In(existingUserIds) })).affected ?? 0);
        del('email_verifications',
          (await queryRunner.manager.delete(EmailVerification, { userId: In(existingUserIds) })).affected ?? 0);
        del('addresses',
          (await queryRunner.manager.delete(Address, { userId: In(existingUserIds) })).affected ?? 0);

        // 3. Messages → then conversations (conversation FK → messages)
        del('messages (senderId)',
          (await queryRunner.manager.delete(Message, { senderId: In(existingUserIds) })).affected ?? 0);
        {
          const convRepo = queryRunner.manager.getRepository(Conversation);
          const convToDelete = await convRepo
            .createQueryBuilder('c')
            .select('c.id')
            .where('c."participant1Id" IN (:...uids)', { uids: existingUserIds })
            .orWhere('c."participant2Id" IN (:...uids)', { uids: existingUserIds })
            .getRawMany<{ id: string }>();
          const convIds = convToDelete.map((r) => r.id);
          let n = 0;
          if (convIds.length > 0) n = (await queryRunner.manager.delete(Conversation, { id: In(convIds) })).affected ?? 0;
          del('conversations (participant1Id OR participant2Id)', n);
        }

        // 4. Reviews → bookings (review FK references booking)
        {
          const reviewRepo = queryRunner.manager.getRepository(Review);
          const reviewQb = reviewRepo
            .createQueryBuilder('r')
            .where('r."clientId" IN (:...uids)', { uids: existingUserIds })
            .orWhere(existingProviderIds.length > 0 ? 'r."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds });
          if (bookingIds.length > 0) reviewQb.orWhere('r."bookingId" IN (:...bids)', { bids: bookingIds });
          const reviewIds = (await reviewQb.select('r.id').getRawMany<{ id: string }>()).map((r) => r.id);
          let n = 0;
          if (reviewIds.length > 0) n = (await queryRunner.manager.delete(Review, { id: In(reviewIds) })).affected ?? 0;
          del('reviews', n);
        }

        // 5. Favourites (clientId + providerId FKs → users/providers)
        {
          const favRepo = queryRunner.manager.getRepository(Favourite);
          const favIds = (
            await favRepo
              .createQueryBuilder('f')
              .select('f.id')
              .where('f."clientId" IN (:...uids)', { uids: existingUserIds })
              .orWhere(existingProviderIds.length > 0 ? 'f."providerId" IN (:...pids)' : '1=0', { pids: existingProviderIds })
              .getRawMany<{ id: string }>()
          ).map((r) => r.id);
          let n = 0;
          if (favIds.length > 0) n = (await queryRunner.manager.delete(Favourite, { id: In(favIds) })).affected ?? 0;
          del('favourites', n);
        }

        // 6. Bookings
        {
          let n = 0;
          if (bookingIds.length > 0) n = (await queryRunner.manager.delete(Booking, { id: In(bookingIds) })).affected ?? 0;
          del('bookings', n);
        }

        // 7. Provider-leaf rows (no FKs point INTO these from elsewhere except via providerId)
        del('portfolio_images',
          existingProviderIds.length > 0
            ? (await queryRunner.manager.delete(PortfolioImage, { providerId: In(existingProviderIds) })).affected ?? 0
            : 0);
        del('time_blocks',
          existingProviderIds.length > 0
            ? (await queryRunner.manager.delete(TimeBlock, { providerId: In(existingProviderIds) })).affected ?? 0
            : 0);
        del('services',
          existingProviderIds.length > 0
            ? (await queryRunner.manager.delete(Service, { providerId: In(existingProviderIds) })).affected ?? 0
            : 0);
        del('availability_schedules',
          existingProviderIds.length > 0
            ? (await queryRunner.manager.delete(AvailabilitySchedule, { providerId: In(existingProviderIds) })).affected ?? 0
            : 0);

        // 8. Providers (BEFORE users, because providers.userId FK → users.id)
        del('providers',
          existingProviderIds.length > 0
            ? (await queryRunner.manager.delete(Provider, { id: In(existingProviderIds) })).affected ?? 0
            : 0);

        // 9. Users — LAST, the 5 root rows.
        del('users (root rows)',
          (await queryRunner.manager.delete(User, { id: In(existingUserIds) })).affected ?? 0);

        await queryRunner.commitTransaction();
        console.log('\n✅ Transaktion erfolgreich. Alle Zeilen gelöscht.');
      } catch (txErr) {
        await queryRunner.rollbackTransaction();
        throw txErr;
      }
    } finally {
      await queryRunner.release();
    }
  } finally {
    await dataSource.destroy();
  }
};

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
