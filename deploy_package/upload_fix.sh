#!/bin/bash

echo "========================================"
echo "📤 Uploading Fixed File to Server"
echo "========================================"
echo ""
echo "Copy and run these commands on your SERVER:"
echo ""
echo "----------------------------------------"
echo "# 1. Download the fixed file from here"
echo "----------------------------------------"
echo ""
cat << 'DOWNLOADCMD'
# You need to manually copy the fixed main_interactive_enhanced.js to your server
# Or run these commands directly on the server:

cd /var/www/hub_social_media_js

# Backup current file
cp src/main_interactive_enhanced.js src/main_interactive_enhanced.js.backup

# Edit line 69
sed -i '69s/.*/      if (process.env.TWITTER_API_KEY || process.env.TWITTER_CONSUMER_KEY) {/' src/main_interactive_enhanced.js

echo "✅ Line 69 fixed"

# Add Twitter credentials
grep -q "^TWITTER_CONSUMER_KEY=" .env || echo "TWITTER_CONSUMER_KEY=KriW4BjDrZmdJPCtlgfNs8HNa" >> .env
grep -q "^TWITTER_CONSUMER_SECRET=" .env || echo "TWITTER_CONSUMER_SECRET=8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT" >> .env
grep -q "^TWITTER_ACCESS_TOKEN=" .env || echo "TWITTER_ACCESS_TOKEN=1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b" >> .env
grep -q "^TWITTER_ACCESS_TOKEN_SECRET=" .env || echo "TWITTER_ACCESS_TOKEN_SECRET=oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt" >> .env
grep -q "^TWITTER_BEARER_TOKEN=" .env || echo "TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAGlp5QEAAAAA8pnhE29%2BfGibKbHDtpPa9jQDP6I%3DBRQXNgQ0l1hcUACxxajfbO3qMD0UI6Dq8LpQFvtghYFxItU7B6" >> .env

echo "✅ Twitter credentials added"

# Verify the fix
echo ""
echo "📋 Verifying line 69:"
sed -n '69p' src/main_interactive_enhanced.js

echo ""
echo "📋 Verifying Twitter credentials:"
grep "TWITTER_CONSUMER_KEY" .env | head -1

echo ""
echo "🔄 Restarting bot..."
pm2 restart social-hub

sleep 3

echo ""
echo "📊 Status:"
pm2 status social-hub

echo ""
echo "📝 Logs (should see 'Twitter API client initialized'):"
pm2 logs social-hub --lines 30 --nostream

DOWNLOADCMD

echo ""
echo "========================================"
