-- =====================================================================
-- CLEANUP SCRIPT — 5 CONFIRMED FAKE TEST ACCOUNTS (HARD DELETE)
-- Generated: 2026-08-27 (script ONLY — do not run until manually reviewed)
-- Scope: EXACTLY the 5 user IDs listed below. No pattern match, no wildcards.
-- Founder confirmation: these 5 users are fake test data, safe to fully delete.
--
-- HOW TO USE THIS FILE IN NEON SQL EDITOR:
--   1. First run ONLY Section A (Preview SELECTs). Review the row counts
--      and content returned to confirm nothing unexpected is touched.
--   2. If the preview looks correct, run Section B (Transactional DELETE)
--      as a SINGLE execution block so everything either deletes together
--      or rolls back if FK order is wrong.
--
-- EXACT USER LIST (UUID match only):
--   '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'  (houb@gmail.com,     provider)
--   '38393b09-e989-4484-9d44-6c5e0e377d1d'  (sophia@gmail.com,   provider)
--   '798ede9b-29b3-4353-a0e5-e492148d8599'  (myfood@gmail.com,   client)
--   '076e5624-905d-4c71-877c-ae3fdc67c98c'  (rebuild@test.de,    provider)
--   '690562e6-0066-41cd-a2f6-5d5959020dfa'  (paul@gmail.com,     provider)
--
-- Would the existing purge-test-data.ts script have caught ANY of these?
-- → NO. purge-test-data.ts matches Provider rows where businessName
--   LIKE '%test%' OR businessName LIKE '%accept%'.  These 5 accounts
--   are identified by explicit UUID + email; no business-name
--   assumption is safe (4 are provider role, 1 is client role which
--   the existing script never touches anyway).  Hence this separate,
--   ID-scoped script.
--
-- FK ORDER DERIVATION (children-before-parents):
--   (no foreign keys TO them → delete first)
--     1. audit_logs          (actorUserId is a Column, no FK constraint — no blocking, clean first)
--     2. notifications       (userId → users.id)
--     3. favourites          (clientId → users.id  AND  providerId → providers.id)
--     4. messages            (senderId → users.id; conversationId → conversations.id deleted next)
--     5. conversations       (participant1Id → users.id; participant2Id → users.id)
--     6. reviews             (clientId → users.id; providerId → providers.id; bookingId → bookings.id)
--     7. bookings            (clientId → users.id; providerId → providers.id)
--     8. portfolio_images    (providerId → providers.id)
--     9. time_blocks         (providerId → providers.id)
--    10. services            (providerId → providers.id)
--    11. availability_schedules (providerId → providers.id)
--    12. refresh_tokens      (userId → users.id, onDelete: CASCADE in entity; delete explicitly anyway for clarity)
--    13. password_reset_requests (userId → users.id, onDelete: CASCADE)
--    14. email_verifications (userId → users.id column)
--    15. addresses           (userId → users.id)
--    16. providers           (userId → users.id — delete BEFORE users because provider FK references user)
--    17. users               (the root row — last)
-- =====================================================================

-- =====================================================================
-- SECTION A — PREVIEW SELECTS (RUN THIS FIRST, REVIEW OUTPUT!)
-- Shows every row across every affected table.  Nothing is modified.
-- =====================================================================

-- 0. The 5 root users themselves (confirm emails + role match the list above)
SELECT id, email, "firstName", "lastName", role, "isActive", "isEmailVerified", "createdAt"
FROM "users"
WHERE id IN (
  '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899',
  '38393b09-e989-4484-9d44-6c5e0e377d1d',
  '798ede9b-29b3-4353-a0e5-e492148d8599',
  '076e5624-905d-4c71-877c-ae3fdc67c98c',
  '690562e6-0066-41cd-a2f6-5d5959020dfa'
)
ORDER BY "createdAt" ASC;

-- 1. Provider profile rows (one per provider-role user; 4 expected, maybe 0 if profile never created)
SELECT id, "userId", "businessName", status, city, "postalCode", "createdAt"
FROM "providers"
WHERE "userId" IN (
  '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899',
  '38393b09-e989-4484-9d44-6c5e0e377d1d',
  '798ede9b-29b3-4353-a0e5-e492148d8599',
  '076e5624-905d-4c71-877c-ae3fdc67c98c',
  '690562e6-0066-41cd-a2f6-5d5959020dfa'
);

-- Cache provider IDs for dependent queries (the 4 users above might have a provider row)
WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id
  FROM "providers" p
  JOIN target_users tu ON p."userId" = tu.id
)
-- 2. audit_logs (actorUserId = uuid column, nullable, NO FK constraint → delete for clean-up)
SELECT 'audit_logs' AS table_name, COUNT(*) AS row_count FROM "audit_logs" al JOIN target_users tu ON al."actorUserId" = tu.id
UNION ALL
-- 3. notifications (userId FK → users)
SELECT 'notifications' AS table_name, COUNT(*) AS row_count FROM "notifications" n JOIN target_users tu ON n."userId" = tu.id
UNION ALL
-- 4. addresses (userId FK → users)
SELECT 'addresses' AS table_name, COUNT(*) AS row_count FROM "addresses" a JOIN target_users tu ON a."userId" = tu.id
UNION ALL
-- 5. refresh_tokens (userId FK → users, CASCADE)
SELECT 'refresh_tokens' AS table_name, COUNT(*) AS row_count FROM "refresh_tokens" rt JOIN target_users tu ON rt."userId" = tu.id
UNION ALL
-- 6. password_reset_requests (userId FK → users, CASCADE)
SELECT 'password_reset_requests' AS table_name, COUNT(*) AS row_count FROM "password_reset_requests" prr JOIN target_users tu ON prr."userId" = tu.id
UNION ALL
-- 7. email_verifications (userId column → users)
SELECT 'email_verifications' AS table_name, COUNT(*) AS row_count FROM "email_verifications" ev JOIN target_users tu ON ev."userId" = tu.id
UNION ALL
-- 8. favourites (clientId → users; providerId → providers — include BOTH sides so we don't leave orphan fav rows)
SELECT 'favourites' AS table_name, COUNT(*) AS row_count
FROM "favourites" f
LEFT JOIN target_users tu_client ON f."clientId" = tu_client.id
LEFT JOIN target_providers tp ON f."providerId" = tp.id
WHERE tu_client.id IS NOT NULL OR tp.id IS NOT NULL
UNION ALL
-- 9. messages (senderId → users)
SELECT 'messages' AS table_name, COUNT(*) AS row_count FROM "messages" m JOIN target_users tu ON m."senderId" = tu.id
UNION ALL
-- 10. conversations (participant1Id OR participant2Id → users.id)
SELECT 'conversations' AS table_name, COUNT(*) AS row_count
FROM "conversations" c
LEFT JOIN target_users tu1 ON c."participant1Id" = tu1.id
LEFT JOIN target_users tu2 ON c."participant2Id" = tu2.id
WHERE tu1.id IS NOT NULL OR tu2.id IS NOT NULL
UNION ALL
-- 11. bookings (clientId → users.id  OR  providerId → providers.id)
SELECT 'bookings' AS table_name, COUNT(*) AS row_count
FROM "bookings" b
LEFT JOIN target_users tu_client ON b."clientId" = tu_client.id
LEFT JOIN target_providers tp ON b."providerId" = tp.id
WHERE tu_client.id IS NOT NULL OR tp.id IS NOT NULL
UNION ALL
-- 12. reviews (clientId → users OR providerId → providers OR bookingId → booking above)
SELECT 'reviews' AS table_name, COUNT(*) AS row_count
FROM "reviews" r
LEFT JOIN target_users tu_client ON r."clientId" = tu_client.id
LEFT JOIN target_providers tp ON r."providerId" = tp.id
LEFT JOIN "bookings" b ON r."bookingId" = b.id
LEFT JOIN target_users tu_book_client ON b."clientId" = tu_book_client.id
LEFT JOIN target_providers tp_book ON b."providerId" = tp_book.id
WHERE tu_client.id IS NOT NULL
   OR tp.id IS NOT NULL
   OR tu_book_client.id IS NOT NULL
   OR tp_book.id IS NOT NULL
UNION ALL
-- 13. portfolio_images (providerId → providers)
SELECT 'portfolio_images' AS table_name, COUNT(*) AS row_count FROM "portfolio_images" pi JOIN target_providers tp ON pi."providerId" = tp.id
UNION ALL
-- 14. time_blocks (providerId → providers)
SELECT 'time_blocks' AS table_name, COUNT(*) AS row_count FROM "time_blocks" tb JOIN target_providers tp ON tb."providerId" = tp.id
UNION ALL
-- 15. services (providerId → providers)
SELECT 'services' AS table_name, COUNT(*) AS row_count FROM "services" s JOIN target_providers tp ON s."providerId" = tp.id
UNION ALL
-- 16. availability_schedules (providerId → providers)
SELECT 'availability_schedules' AS table_name, COUNT(*) AS row_count FROM "availability_schedules" a_s JOIN target_providers tp ON a_s."providerId" = tp.id
;

-- Detailed preview (separate SELECT per table, full column content)
WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- Detailed: audit logs
SELECT al.id, al."actorUserId", al."actorRole", al.action, al."targetType", al."targetId", al."createdAt"
FROM "audit_logs" al JOIN target_users tu ON al."actorUserId" = tu.id
ORDER BY al."createdAt" DESC;

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- Detailed: bookings (show participants + datetime + status)
SELECT b.id, b."bookingNumber", b."scheduledDate", b."scheduledTime", b.status, b."clientId", b."providerId", b."createdAt"
FROM "bookings" b
LEFT JOIN target_users tu_client ON b."clientId" = tu_client.id
LEFT JOIN target_providers tp ON b."providerId" = tp.id
WHERE tu_client.id IS NOT NULL OR tp.id IS NOT NULL
ORDER BY b."createdAt" DESC;


-- =====================================================================
-- SECTION B — TRANSACTIONAL DELETE (RUN AFTER REVIEWING SECTION A)
-- All DELETEs in one atomic block: either everything deletes or it all
-- rolls back. Order is strict FK children-before-parents.
-- =====================================================================
BEGIN;

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 1. audit_logs (no FK constraint; clean up orphan actor logs early)
DELETE FROM "audit_logs" WHERE "actorUserId" IN (SELECT id FROM target_users);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 2. notifications
DELETE FROM "notifications" WHERE "userId" IN (SELECT id FROM target_users);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 3. messages (delete before conversations; FK senderId + FK conversationId)
DELETE FROM "messages" WHERE "senderId" IN (SELECT id FROM target_users);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 4. conversations (participant1Id OR participant2Id → user)
DELETE FROM "conversations" c
USING target_users tu1, target_users tu2
WHERE c."participant1Id" = tu1.id OR c."participant2Id" = tu2.id;

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
),
target_bookings AS (
  SELECT b.id AS id
  FROM "bookings" b
  LEFT JOIN target_users tu_client ON b."clientId" = tu_client.id
  LEFT JOIN target_providers tp ON b."providerId" = tp.id
  WHERE tu_client.id IS NOT NULL OR tp.id IS NOT NULL
)
-- 5. reviews (delete before bookings since bookingId FK; also delete client/provider sides directly)
DELETE FROM "reviews" r
USING target_users tu_client, target_providers tp, target_bookings tb
WHERE r."clientId" = tu_client.id
   OR r."providerId" = tp.id
   OR r."bookingId" = tb.id;

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 6. favourites (clientId OR providerId; delete before bookings/providers/users)
DELETE FROM "favourites" f
USING target_users tu_client, target_providers tp
WHERE f."clientId" = tu_client.id OR f."providerId" = tp.id;

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 7. bookings
DELETE FROM "bookings" b
USING target_users tu_client, target_providers tp
WHERE b."clientId" = tu_client.id OR b."providerId" = tp.id;

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 8. portfolio_images (providerId → providers)
DELETE FROM "portfolio_images" WHERE "providerId" IN (SELECT id FROM target_providers);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 9. time_blocks (providerId → providers)
DELETE FROM "time_blocks" WHERE "providerId" IN (SELECT id FROM target_providers);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 10. services (providerId → providers)
DELETE FROM "services" WHERE "providerId" IN (SELECT id FROM target_providers);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
),
target_providers AS (
  SELECT p.id AS id FROM "providers" p JOIN target_users tu ON p."userId" = tu.id
)
-- 11. availability_schedules (providerId → providers)
DELETE FROM "availability_schedules" WHERE "providerId" IN (SELECT id FROM target_providers);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
)
-- 12. refresh_tokens (userId → users, onDelete: CASCADE; delete explicitly anyway)
DELETE FROM "refresh_tokens" WHERE "userId" IN (SELECT id FROM target_users);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
)
-- 13. password_reset_requests (userId → users, onDelete: CASCADE)
DELETE FROM "password_reset_requests" WHERE "userId" IN (SELECT id FROM target_users);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
)
-- 14. email_verifications (userId column → users)
DELETE FROM "email_verifications" WHERE "userId" IN (SELECT id FROM target_users);

WITH target_users AS (
  SELECT UNNEST(ARRAY[
    '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899'::uuid,
    '38393b09-e989-4484-9d44-6c5e0e377d1d'::uuid,
    '798ede9b-29b3-4353-a0e5-e492148d8599'::uuid,
    '076e5624-905d-4c71-877c-ae3fdc67c98c'::uuid,
    '690562e6-0066-41cd-a2f6-5d5959020dfa'::uuid
  ]) AS id
)
-- 15. addresses (userId → users)
DELETE FROM "addresses" WHERE "userId" IN (SELECT id FROM target_users);

-- 16. providers (MUST delete BEFORE users because providers.userId FK references users.id)
DELETE FROM "providers"
WHERE "userId" IN (
  '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899',
  '38393b09-e989-4484-9d44-6c5e0e377d1d',
  '798ede9b-29b3-4353-a0e5-e492148d8599',
  '076e5624-905d-4c71-877c-ae3fdc67c98c',
  '690562e6-0066-41cd-a2f6-5d5959020dfa'
);

-- 17. users (LAST — the 5 root rows)
DELETE FROM "users"
WHERE id IN (
  '8c5a46f5-a37f-45e9-8ff9-0f40ecf1c899',
  '38393b09-e989-4484-9d44-6c5e0e377d1d',
  '798ede9b-29b3-4353-a0e5-e492148d8599',
  '076e5624-905d-4c71-877c-ae3fdc67c98c',
  '690562e6-0066-41cd-a2f6-5d5959020dfa'
);

COMMIT;

-- END OF TRANSACTIONAL DELETE BLOCK — after COMMIT, changes are final.
-- After running, re-run the Section A preview SELECTs again to confirm
-- all counts are 0 and the 5 root users no longer appear.
