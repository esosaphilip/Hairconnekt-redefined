#!/bin/bash
BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMESTAMP=$(date +%s)
EMAIL="${TEST_EMAIL:-neu.$TIMESTAMP@test.de}"
PASSWORD="${TEST_PASSWORD:-}"

if [ -z "$PASSWORD" ]; then
  echo "Missing TEST_PASSWORD"
  exit 1
fi

echo -e "\n--- TEST 1 ---"
RES1=$(curl -s -X POST $BASE_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"Neu\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"provider\",\"acceptedTerms\":true}")
echo "$RES1"

TOKEN=$(echo "$RES1" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo -e "\n--- TEST 2 ---"
RES2=$(curl -s -i -X POST $BASE_URL/api/v1/providers/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"providerType":"freelancer","businessName":"Test Studio",
       "street":"Hauptstraße","houseNumber":"1","city":"Wuppertal",
       "postalCode":"42103","serviceRadius":10,"serviceIds":[],
       "experienceYears":3,"languages":["de"],"cancellationPolicy":"24h","bio":""}')
echo "$RES2"

echo -e "\n--- TEST 3 ---"
RES3=$(curl -s -i -X POST $BASE_URL/api/v1/providers/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"providerType":"freelancer","businessName":"Test Studio",
       "street":"Hauptstraße","houseNumber":"1","city":"Wuppertal",
       "postalCode":"42103","serviceRadius":10,"serviceIds":[],
       "experienceYears":3,"languages":["de"],"cancellationPolicy":"24h","bio":""}')
echo "$RES3"

echo -e "\n--- TEST 4 ---"
RES4=$(curl -s -i $BASE_URL/api/v1/providers/me \
  -H "Authorization: Bearer $TOKEN")
echo "$RES4"
