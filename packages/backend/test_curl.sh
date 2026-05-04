#!/bin/bash
BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMESTAMP=$(date +%s)
EMAIL="${TEST_EMAIL:-neu.$TIMESTAMP@test.de}"
PASSWORD="${TEST_PASSWORD:-}"

if [ -z "$PASSWORD" ]; then
  echo "Missing TEST_PASSWORD"
  exit 1
fi

echo "TEST 1:"
RES1=$(curl -s -X POST $BASE_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"Neu\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"provider\",\"acceptedTerms\":true}")
echo "$RES1"

TOKEN=$(echo $RES1 | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
    echo "Fallback to login because user might exist..."
    LOGIN_RES=$(curl -s -X POST $BASE_URL/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    TOKEN=$(echo $LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

echo -e "\nTEST 2:"
RES2=$(curl -s -X POST $BASE_URL/api/v1/providers/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"providerType":"freelancer","businessName":"Test Studio",
       "street":"Hauptstraße","houseNumber":"1","city":"Wuppertal",
       "postalCode":"42103","serviceRadius":10,"serviceIds":[],
       "experienceYears":3,"languages":["de"],"cancellationPolicy":"24h","bio":""}')
echo "$RES2"

echo -e "\nTEST 3:"
RES3=$(curl -s -i -X POST $BASE_URL/api/v1/providers/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"providerType":"freelancer","businessName":"Test Studio",
       "street":"Hauptstraße","houseNumber":"1","city":"Wuppertal",
       "postalCode":"42103","serviceRadius":10,"serviceIds":[],
       "experienceYears":3,"languages":["de"],"cancellationPolicy":"24h","bio":""}')
echo "$RES3"

echo -e "\nTEST 4:"
RES4=$(curl -s $BASE_URL/api/v1/providers/me \
  -H "Authorization: Bearer $TOKEN")
echo "$RES4"
