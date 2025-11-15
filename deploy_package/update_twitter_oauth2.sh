#!/bin/bash

echo "🔄 Updating Twitter OAuth 2.0 Credentials"
echo ""

ssh root@72.60.29.80 << 'ENDSSH'
cd /var/www/hub_social_media_js

# Update OAuth 2.0 credentials
grep -q "^TWITTER_CLIENT_ID=" .env && sed -i "s|^TWITTER_CLIENT_ID=.*|TWITTER_CLIENT_ID=RGRNZmlrRTBJaEh3VXhlamRicDQ6MTpjaQ|" .env || echo "TWITTER_CLIENT_ID=RGRNZmlrRTBJaEh3VXhlamRicDQ6MTpjaQ" >> .env

grep -q "^TWITTER_CLIENT_SECRET=" .env && sed -i "s|^TWITTER_CLIENT_SECRET=.*|TWITTER_CLIENT_SECRET=HBLQ00V3qRyBDZ-QZgZTfO_8oiCCUyV4YRi8_XMMaePyv855vE|" .env || echo "TWITTER_CLIENT_SECRET=HBLQ00V3qRyBDZ-QZgZTfO_8oiCCUyV4YRi8_XMMaePyv855vE" >> .env

echo "✅ OAuth 2.0 credentials updated"

echo ""
echo "📋 Current Twitter credentials:"
grep "TWITTER_" .env

ENDSSH

echo ""
echo "✅ Done!"
