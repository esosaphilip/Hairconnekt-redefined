#!/bin/bash
BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMESTAMP=$(date +%s)
EMAIL="test$TIMESTAMP@example.com"
PASSWORD="${TEST_PASSWORD:-}"
PHOTO_PATH="${PHOTO_PATH:-}"

if [ -z "$PASSWORD" ]; then
  echo "Missing TEST_PASSWORD"
  exit 1
fi

if [ -z "$PHOTO_PATH" ]; then
  echo "Missing PHOTO_PATH"
  exit 1
fi

echo "1. Registering test user $EMAIL..."
REG_RES=$(curl -s -X POST $BASE_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"User\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"client\",\"acceptedTerms\":true}")

TOKEN=$(echo "$REG_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Registration failed. Response:"
    echo "$REG_RES"
    exit 1
fi

echo "Registration successful. Token acquired."
echo ""
echo "2. Running avatar upload POST..."
curl -X POST $BASE_URL/api/v1/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@$PHOTO_PATH" \
  -v

echo ""
