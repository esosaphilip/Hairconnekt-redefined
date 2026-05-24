#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSWORD="${TEST_PASSWORD:-}"

if [[ -z "$PASSWORD" ]]; then
  echo "Missing TEST_PASSWORD" >&2
  exit 1
fi

for bin in curl jq; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required tool: $bin" >&2
    exit 1
  fi
done

request() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"

  local url="${BASE_URL}${path}"

  if [[ -n "$body" ]]; then
    if [[ -n "$token" ]]; then
      curl -sS -X "$method" "$url" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$body" \
        -w "\n%{http_code}"
    else
      curl -sS -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -d "$body" \
        -w "\n%{http_code}"
    fi
  else
    if [[ -n "$token" ]]; then
      curl -sS -X "$method" "$url" \
        -H "Authorization: Bearer $token" \
        -w "\n%{http_code}"
    else
      curl -sS -X "$method" "$url" \
        -w "\n%{http_code}"
    fi
  fi
}

request_with_origin_and_cookie() {
  local method="$1"
  local path="$2"
  local cookie_file="$3"
  local origin="$4"
  local csrf_token="${5:-}"
  local body="${6:-}"

  local url="${BASE_URL}${path}"
  local args=(
    -sS
    -X "$method"
    "$url"
    -H "Origin: $origin"
    -b "$cookie_file"
    -c "$cookie_file"
  )

  if [[ -n "$csrf_token" ]]; then
    args+=(-H "X-CSRF-Token: $csrf_token")
  fi

  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  curl "${args[@]}" -w "\n%{http_code}"
}

expect_status() {
  local status="$1"
  local got="$2"
  local label="$3"
  if [[ "$got" != "$status" ]]; then
    echo "FAIL ($label): expected $status got $got" >&2
    exit 1
  fi
}

split_body_status() {
  local raw="$1"
  local status
  status="$(echo "$raw" | tail -n 1)"
  local body
  body="$(echo "$raw" | sed '$d')"
  echo "$status"
  echo "$body"
}

timestamp="$(date +%s)"
admin_identifier="${ADMIN_IDENTIFIER:-admin@hairconnekt.de}"
admin_password="${ADMIN_PASSWORD:-}"
admin_cookie_identifier="$admin_identifier"
admin_cookie_password="$admin_password"
admin_email="admin.$timestamp@test.de"
provider_email="provider.$timestamp@test.de"
client_email="client.$timestamp@test.de"

admin_token=""
if [[ -n "$admin_password" ]]; then
  echo "--- AUTH: admin login ---"
  raw="$(request POST "/api/v1/auth/admin-login" "" "$(jq -n --arg id "$admin_identifier" --arg pw "$admin_password" '{ identifier:$id, password:$pw }')")"
  status="$(echo "$raw" | tail -n 1)"
  body="$(echo "$raw" | sed '$d')"
  expect_status 200 "$status" "admin login"
  admin_token="$(echo "$body" | jq -r '.accessToken')"
else
  echo "--- AUTH: register admin (optional) ---"
  raw="$(request POST "/api/v1/auth/register" "" "$(jq -n --arg email "$admin_email" --arg pw "$PASSWORD" '{
    firstName:"Test", lastName:"Admin", email:$email, password:$pw, role:"admin", acceptedTerms:true
  }')")"
  status="$(echo "$raw" | tail -n 1)"
  body="$(echo "$raw" | sed '$d')"
  if [[ "$status" == "201" ]]; then
    admin_token="$(echo "$body" | jq -r '.accessToken')"
    admin_cookie_identifier="$admin_email"
    admin_cookie_password="$PASSWORD"
  else
    echo "SKIP: admin token not available (admin register failed with $status). Set ADMIN_PASSWORD to enable provider approval + booking create test."
  fi
fi

echo "--- AUTH: register provider ---"
raw="$(request POST "/api/v1/auth/register" "" "$(jq -n --arg email "$provider_email" --arg pw "$PASSWORD" '{
  firstName:"Test", lastName:"Provider", email:$email, password:$pw, role:"provider", acceptedTerms:true
}')")"
status="$(echo "$raw" | tail -n 1)"
body="$(echo "$raw" | sed '$d')"
expect_status 201 "$status" "provider register"
provider_token="$(echo "$body" | jq -r '.accessToken')"
provider_user_id="$(echo "$body" | jq -r '.user.id')"

echo "--- AUTH: register client ---"
raw="$(request POST "/api/v1/auth/register" "" "$(jq -n --arg email "$client_email" --arg pw "$PASSWORD" '{
  firstName:"Test", lastName:"Client", email:$email, password:$pw, role:"client", acceptedTerms:true
}')")"
status="$(echo "$raw" | tail -n 1)"
body="$(echo "$raw" | sed '$d')"
expect_status 201 "$status" "client register"
client_token="$(echo "$body" | jq -r '.accessToken')"
client_user_id="$(echo "$body" | jq -r '.user.id')"

echo "--- SECURITY: unauthenticated admin list denied ---"
raw="$(request GET "/api/v1/admin/providers" "" "")"
status="$(echo "$raw" | tail -n 1)"
expect_status 401 "$status" "admin list unauthenticated"

echo "--- SECURITY: non-admin admin list denied ---"
raw="$(request GET "/api/v1/admin/providers" "$client_token" "")"
status="$(echo "$raw" | tail -n 1)"
expect_status 403 "$status" "admin list non-admin"

echo "--- PROVIDERS: register provider profile ---"
raw="$(request POST "/api/v1/providers/register" "$provider_token" "$(jq -n '{
  providerType:"freelancer",
  businessName:"Test Studio",
  street:"Hauptstraße",
  houseNumber:"1",
  city:"Wuppertal",
  postalCode:"42103",
  serviceRadius:10,
  serviceIds:[],
  experienceYears:3,
  languages:["de"],
  cancellationPolicy:"24h",
  bio:""
}')")"
status="$(echo "$raw" | tail -n 1)"
body="$(echo "$raw" | sed '$d')"
expect_status 201 "$status" "provider profile register"
provider_id="$(echo "$body" | jq -r '.id // .data.id')"

if [[ -n "$admin_token" ]]; then
  echo "--- ADMIN: approve provider ---"
  raw="$(request PATCH "/api/v1/admin/providers/$provider_id/approve" "$admin_token" "")"
  status="$(echo "$raw" | tail -n 1)"
  expect_status 200 "$status" "provider approve"
else
  echo "SKIP: provider approval (no admin token)"
fi

echo "--- PROVIDERS: set online ---"
raw="$(request PATCH "/api/v1/providers/me/availability" "$provider_token" '{"isOnline":true}')"
status="$(echo "$raw" | tail -n 1)"
expect_status 200 "$status" "provider set online"

echo "--- PROVIDERS: set schedule (all days open) ---"
raw="$(request PUT "/api/v1/providers/me/availability" "$provider_token" "$(jq -n '{
  bufferMinutes:0,
  schedule: [
    { dayOfWeek:0, isOpen:true, openTime:"00:00", closeTime:"23:59" },
    { dayOfWeek:1, isOpen:true, openTime:"00:00", closeTime:"23:59" },
    { dayOfWeek:2, isOpen:true, openTime:"00:00", closeTime:"23:59" },
    { dayOfWeek:3, isOpen:true, openTime:"00:00", closeTime:"23:59" },
    { dayOfWeek:4, isOpen:true, openTime:"00:00", closeTime:"23:59" },
    { dayOfWeek:5, isOpen:true, openTime:"00:00", closeTime:"23:59" },
    { dayOfWeek:6, isOpen:true, openTime:"00:00", closeTime:"23:59" }
  ]
}')")"
status="$(echo "$raw" | tail -n 1)"
expect_status 200 "$status" "provider schedule set"

echo "--- SERVICES: fetch categories ---"
raw="$(request GET "/api/v1/services/categories" "" "")"
status="$(echo "$raw" | tail -n 1)"
body="$(echo "$raw" | sed '$d')"
expect_status 200 "$status" "categories"
category_id="$(echo "$body" | jq -r '(.data // .)[0].id')"

echo "--- PROVIDERS: create service ---"
raw="$(request POST "/api/v1/providers/me/services" "$provider_token" "$(jq -n --arg cid "$category_id" '{
  categoryId:$cid,
  name:"Test Service",
  durationMin:60,
  priceType:"fixed",
  price:50
}')")"
status="$(echo "$raw" | tail -n 1)"
body="$(echo "$raw" | sed '$d')"
expect_status 201 "$status" "create service"
service_id="$(echo "$body" | jq -r '.id // .data.id')"

echo "--- SECURITY: unexpected provider service field rejected ---"
raw="$(request POST "/api/v1/providers/me/services" "$provider_token" "$(jq -n --arg cid "$category_id" '{
  categoryId:$cid,
  name:"Unexpected Field Service",
  durationMin:60,
  priceType:"fixed",
  price:50,
  unexpected:"blocked"
}')")"
status="$(echo "$raw" | tail -n 1)"
expect_status 400 "$status" "provider service extra field rejected"

scheduled_date="$(date -u +%Y-%m-%d)"
scheduled_time="12:00"

if [[ -n "$admin_token" ]]; then
  echo "--- BOOKINGS: create booking (client) ---"
  raw="$(request POST "/api/v1/bookings" "$client_token" "$(jq -n --arg pid "$provider_id" --arg sid "$service_id" --arg d "$scheduled_date" --arg t "$scheduled_time" '{
    providerId:$pid,
    serviceIds:[$sid],
    scheduledDate:$d,
    scheduledTime:$t,
    isMobile:false
  }')")"
  status="$(echo "$raw" | tail -n 1)"
  body="$(echo "$raw" | sed '$d')"
  expect_status 201 "$status" "create booking"
  booking_id="$(echo "$body" | jq -r '.booking.id')"

  echo "--- BOOKINGS: accept booking (provider) ---"
  raw="$(request PATCH "/api/v1/bookings/$booking_id/accept" "$provider_token" "")"
  status="$(echo "$raw" | tail -n 1)"
  expect_status 200 "$status" "accept booking"

  echo "--- BOOKINGS: get booking (client) ---"
  raw="$(request GET "/api/v1/bookings/$booking_id" "$client_token" "")"
  status="$(echo "$raw" | tail -n 1)"
  body="$(echo "$raw" | sed '$d')"
  expect_status 200 "$status" "get booking"
  booking_status="$(echo "$body" | jq -r '.status')"
  if [[ "$booking_status" != "confirmed" && "$booking_status" != "CONFIRMED" ]]; then
    echo "FAIL (booking status): expected confirmed got $booking_status" >&2
    exit 1
  fi
else
  echo "--- BOOKINGS: list bookings (client) ---"
  raw="$(request GET "/api/v1/bookings" "$client_token" "")"
  status="$(echo "$raw" | tail -n 1)"
  expect_status 200 "$status" "list bookings"
fi

if [[ -n "$admin_cookie_password" ]]; then
  admin_origin="${ADMIN_TEST_ORIGIN:-https://admin.hairconnekt.de}"
  cookie_file="$(mktemp)"
  trap 'rm -f "$cookie_file"' EXIT

  echo "--- SECURITY: fetch admin CSRF token ---"
  raw="$(curl -sS -b "$cookie_file" -c "$cookie_file" "${BASE_URL}/api/v1/auth/admin-csrf" -w "\n%{http_code}")"
  status="$(echo "$raw" | tail -n 1)"
  body="$(echo "$raw" | sed '$d')"
  expect_status 200 "$status" "admin csrf bootstrap"
  admin_csrf_token="$(echo "$body" | jq -r '.csrfToken')"

  echo "--- SECURITY: admin cookie login with CSRF ---"
  raw="$(request_with_origin_and_cookie POST "/api/v1/auth/admin-login" "$cookie_file" "$admin_origin" "$admin_csrf_token" "$(jq -n --arg id "$admin_cookie_identifier" --arg pw "$admin_cookie_password" '{ identifier:$id, password:$pw }')")"
  status="$(echo "$raw" | tail -n 1)"
  expect_status 200 "$status" "admin cookie login"

  echo "--- SECURITY: admin cookie mutation without CSRF denied ---"
  raw="$(request_with_origin_and_cookie PATCH "/api/v1/admin/providers/$provider_id/suspend" "$cookie_file" "$admin_origin" "" '{"reason":"csrf regression test"}')"
  status="$(echo "$raw" | tail -n 1)"
  expect_status 403 "$status" "admin cookie mutation missing csrf"

  echo "--- SECURITY: admin cookie mutation with CSRF allowed ---"
  raw="$(request_with_origin_and_cookie PATCH "/api/v1/admin/providers/$provider_id/suspend" "$cookie_file" "$admin_origin" "$admin_csrf_token" '{"reason":"csrf regression test"}')"
  status="$(echo "$raw" | tail -n 1)"
  expect_status 200 "$status" "admin cookie mutation with csrf"

  echo "--- SECURITY: admin logout with CSRF allowed ---"
  raw="$(request_with_origin_and_cookie POST "/api/v1/auth/admin-logout" "$cookie_file" "$admin_origin" "$admin_csrf_token" "")"
  status="$(echo "$raw" | tail -n 1)"
  expect_status 204 "$status" "admin logout with csrf"
else
  echo "SKIP: admin cookie CSRF flow (no admin credentials available)"
fi

echo "--- CHAT: create conversation (client -> provider user) ---"
raw="$(request POST "/api/v1/chat/conversations" "$client_token" "$(jq -n --arg rid "$provider_user_id" '{ recipientId:$rid }')")"
status="$(echo "$raw" | tail -n 1)"
body="$(echo "$raw" | sed '$d')"
expect_status 201 "$status" "create conversation"
conversation_id="$(echo "$body" | jq -r '.id // .data.id')"

echo "--- CHAT: send message (client) ---"
raw="$(request POST "/api/v1/chat/conversations/$conversation_id/messages" "$client_token" '{"content":"Hello from integration test"}')"
status="$(echo "$raw" | tail -n 1)"
expect_status 201 "$status" "send message"

echo "--- CHAT: list conversations (provider) ---"
raw="$(request GET "/api/v1/chat/conversations" "$provider_token" "")"
status="$(echo "$raw" | tail -n 1)"
body="$(echo "$raw" | sed '$d')"
expect_status 200 "$status" "list conversations"
found="$(echo "$body" | jq -r --arg cid "$conversation_id" '([.data // .][]? | select(.id == $cid)] | length)')"
if [[ "$found" == "0" ]]; then
  echo "FAIL (chat list): conversation not found" >&2
  exit 1
fi

echo "ALL INTEGRATION TESTS PASSED"
