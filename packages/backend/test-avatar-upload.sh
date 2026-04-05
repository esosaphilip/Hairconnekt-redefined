#!/bin/bash
RENDER_URL="https://hairconnekt-redefined.onrender.com"
TIMESTAMP=$(date +%s)
EMAIL="test$TIMESTAMP@example.com"
PASSWORD="Test1234!"
PHOTO_PATH="/Users/eseosaedosomwan/Downloads/Hairconnekt redefined/apps/mobile/assets/icon.png"

echo "1. Registering test user $EMAIL..."
REG_RES=$(curl -s -X POST $RENDER_URL/api/v1/auth/register \
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
curl -X POST $RENDER_URL/api/v1/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@$PHOTO_PATH" \
  -v

echo ""
