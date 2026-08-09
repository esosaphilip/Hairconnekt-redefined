# HairConnekt Query Performance & Paging Contract v1

## 1. Hard Page-Size Cap

All public list endpoints accept `page` (default 1) and `limit` (default 20).
`limit > 50` returns **HTTP 400 BadRequest** with the message:
`\`limit\` darf maximal 50 betragen.`

The enforcement lives in:
- `packages/backend/src/common/pagination.ts` — shared `parsePagination(pageStr, limitStr)` helper for HTTP-layer controllers.
- `applyServicePageSize(rawLimit, explicit?)` — for internal service callers that pass a numeric limit directly.

The `MAX_PAGE_SIZE = 50` constant is the single source of truth.

### Endpoint coverage
| Endpoint | Controller/Service | Enforced via |
|----------|--------------------|--------------|
| `GET /bookings` | bookings.controller.ts | `parsePagination` |
| `GET /admin/users` | admin-users.controller.ts | explicit cap + BadRequest (uses offset, not page) |
| `GET /notifications` | notifications.controller.ts | `parsePagination` |
| `GET /providers` | providers.service.ts `findAll` | explicit cap in service layer |
| `GET /providers/:id/reviews` | providers.controller.ts → service | `parsePagination` at controller |

Clients MUST page in chunks of ≤ 50. Silent clipping is intentionally **not** performed for explicit oversize values — throwing a 400 surfaces paging bugs instead of silently truncating result sets.

---

## 2. Index Inventory

All indices were added to entity definitions via TypeORM `@Index()` decorators and are applied (idempotently) by migration
`src/migrations/20260809000010-query-performance-indexes.ts` using `CREATE INDEX IF NOT EXISTS`.

Naming convention: `idx_<table>_<col1>_<col2>[_…]`.

| Entity / Table | Index Columns | Name | Purpose / Top Query Coverage |
|----------------|---------------|------|-------------------------------|
| **bookings** | `providerId, scheduledDate, scheduledTime` | `idx_bookings_providerId_scheduledDate_scheduledTime` | Booking-slot conflict check in `validateBookingSlot`. |
| **bookings** | `clientId, status, scheduledDate` | `idx_bookings_clientId_status_scheduledDate` | Client-side filtered booking list (`GET /bookings` with status filter + order). |
| **bookings** | `providerId, status, scheduledDate` | `idx_bookings_providerId_status_scheduledDate` | Provider dashboard bookings list and status range filters. |
| **bookings** | `cancelledAt` | `idx_bookings_cancelledAt` | "Recent cancellations" lookup and audit queries. |
| **favourites** | `providerId` | `idx_favourites_providerId` | `COUNT(*)` favourites per provider on provider-card listings. |
| **reviews** | `providerId, createdAt` | `idx_reviews_providerId_createdAt` | `GET /providers/:id/reviews` public reviews listing ordered DESC. |
| **reviews** | `bookingId` | `idx_reviews_bookingId` | One-review-per-booking duplicate check (plus covers the UNIQUE helper). |
| **reviews** | `clientId, createdAt` | `idx_reviews_clientId_createdAt` | Client review history list endpoints. |
| **messages** | `conversationId, createdAt` | `idx_messages_conversationId_createdAt` | Chat scroll: fetch messages for one conversation ordered DESC. |
| **messages** | `senderId, createdAt` | `idx_messages_senderId_createdAt` | "Sent messages" history. |
| **messages** | `conversationId, senderId, isRead` | `idx_messages_conversationId_senderId_isRead` | Exact unread-count-per-conversation queries used in `listConversationsForUser`. |
| **conversations** | `participant1Id, updatedAt` | `idx_conversations_participant1Id_updatedAt` | Half of the OR-query in `listConversationsForUser` (DESC order on updatedAt). |
| **conversations** | `participant2Id, updatedAt` | `idx_conversations_participant2Id_updatedAt` | The other half of the same OR-query. |
| **notifications** | `userId, createdAt` | `idx_notifications_userId_createdAt` | `GET /notifications` user list ordered DESC. |
| **availability_schedules** | `providerId, dayOfWeek` | `idx_availability_schedules_providerId_dayOfWeek` | Slot-check lookup used every time we generate available slots or validate a new booking. |
| **time_blocks** | `providerId, startDate, endDate` | `idx_time_blocks_providerId_startDate_endDate` | Booking conflict + blocked-day checks (range scan). |
| **services** | `providerId, categoryId, isActive` | `idx_services_providerId_categoryId_isActive` | Provider search category filter + service list (categoryId) + active-only scopes. |
| **addresses** | `userId` | `idx_addresses_userId` | `GET /users/me/addresses` per-user address list. |
| **audit_logs** | `actorUserId, action, createdAt` | `idx_audit_logs_actorUserId_action_createdAt` | Admin audit: who-did-what filter + time ordering. |
| **audit_logs** | `targetType, targetId, createdAt` | `idx_audit_logs_targetType_targetId_createdAt` | Per-resource audit trail (e.g., audit of a single booking/provider). |

---

## 3. Top-5 Hot Path Queries — EXPLAIN Exercise Script

Run these against a staging/prod copy with `psql` to confirm the new indices are used and to baseline cost / rows.

```bash
# Supply a DATABASE_URL with a role that has EXPLAIN privileges.
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

### 1. Provider-slot conflict (bookings by provider + date + time, non-cancelled)
```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM bookings
WHERE \"providerId\" = 'PROVIDER_UUID_PLACEHOLDER'
  AND \"scheduledDate\" = '2026-08-09'
  AND \"scheduledTime\" = '10:00'
  AND status != 'CANCELLED'
LIMIT 1;"
```
Expected index: `idx_bookings_providerId_scheduledDate_scheduledTime`.

### 2. Client bookings list (clientId + status filter + scheduledDate DESC)
```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM bookings
WHERE \"clientId\" = 'CLIENT_UUID_PLACEHOLDER'
  AND status = 'CONFIRMED'
ORDER BY \"scheduledDate\" DESC, \"scheduledTime\" DESC
LIMIT 20 OFFSET 0;"
```
Expected index: `idx_bookings_clientId_status_scheduledDate`.

### 3. Provider bookings dashboard (providerId + status + date range)
```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM bookings
WHERE \"providerId\" = 'PROVIDER_UUID_PLACEHOLDER'
  AND status IN ('PENDING','CONFIRMED','IN_PROGRESS')
  AND \"scheduledDate\" >= '2026-08-01'
  AND \"scheduledDate\" <  '2026-09-01'
ORDER BY \"scheduledDate\" DESC, \"scheduledTime\" DESC
LIMIT 50;"
```
Expected index: `idx_bookings_providerId_status_scheduledDate`.

### 4. Chat messages scroll (messages by conversationId, createdAt DESC LIMIT N)
```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM messages
WHERE \"conversationId\" = 'CONVERSATION_UUID_PLACEHOLDER'
ORDER BY \"createdAt\" DESC
LIMIT 50;"
```
Expected index: `idx_messages_conversationId_createdAt`.

### 5. Provider availability lookup (availability_schedules by providerId + dayOfWeek)
```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM availability_schedules
WHERE \"providerId\" = 'PROVIDER_UUID_PLACEHOLDER'
  AND \"dayOfWeek\" = 3
LIMIT 1;"
```
Expected index: `idx_availability_schedules_providerId_dayOfWeek`.

### Interpreting results
- Confirm the plan shows `Index Scan` (or `Index Only Scan`) using the named index rather than `Seq Scan`.
- `Buffers: shared hit` >> `read` = good (data in cache).
- `rows` actual close to `width` estimate = planner statistics are current (run `ANALYZE <table>` if stale).
- Cost > ~1000 on a simple lookup usually means the index was not picked.

---

## 4. Pagination & Performance Rules for Engineers

1. **Never call `.find()` without `.take()` / `limit`** on any table that could exceed 1000 rows (bookings, messages, reviews, notifications, audit_logs, time_blocks).
2. `findAndCount()` is acceptable for small pages. For very large datasets or deep offsets (> 500 rows into scan), prefer **keyset / cursor pagination** using the last seen `createdAt` or `id`.
3. Avoid N+1 per-item subqueries in list endpoints. Use `relations: [...]` or `QueryBuilder` `.leftJoinAndSelect` / `.leftJoin` + `IN` bulk loads.
4. When you add a new `WHERE` filter on a `Repository` call or `QueryBuilder`, check the table in §2 and ask: "does this column combination need an index?" If the answer is "maybe for production scale," add a class-level `@Index([...])` on the entity and include it in the idempotent migration.
5. Do **not** raise `MAX_PAGE_SIZE` (50) in `src/common/pagination.ts` just to ship a feature. For admin-only reports, create a dedicated endpoint with explicit role checks and its own higher-but-still-bounded cap (document separately).
6. For queries run > once per user session, baseline with `EXPLAIN (ANALYZE, BUFFERS)`. Share the plan on the PR description when adding the index.
