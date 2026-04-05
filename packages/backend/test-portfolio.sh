#!/bin/bash
RENDER_URL="https://hairconnekt-redefined.onrender.com"
TIMESTAMP=$(date +%s)
EMAIL="provider$TIMESTAMP@example.com"
PASSWORD="Test1234!"
PHOTO_PATH="/Users/eseosaedosomwan/Downloads/Hairconnekt redefined/apps/mobile/assets/icon.png"

echo "1. Registering test user $EMAIL as provider..."
REG_RES=$(curl -s -X POST $RENDER_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"Prov\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"provider\",\"acceptedTerms\":true}")

TOKEN=$(echo "$REG_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "User Registration successful. Token acquired."

echo "2. Registering provider profile..."
curl -s -X POST $RENDER_URL/api/v1/providers/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Test Salon","providerType":"salon","phone":"123456789","street":"Muster 1","houseNumber":"1","city":"Berlin","postalCode":"10115","serviceRadius":20,"experienceYears":5,"languages":["Deutsch"],"cancellationPolicy":"24h","serviceIds":[]}'

echo ""
echo "3. Uploading portfolio image..."
UPLOAD_RES=$(curl -s -X POST $RENDER_URL/api/v1/providers/me/portfolio \
  -H "Authorization: Bearer $TOKEN" \
  -F "portfolio=@$PHOTO_PATH")
echo "Upload Result: $UPLOAD_RES"

echo ""
echo "4. Fetching portfolio..."
curl -s -X GET $RENDER_URL/api/v1/providers/me/portfolio \
  -H "Authorization: Bearer $TOKEN"
echo ""
