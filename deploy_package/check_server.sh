#!/bin/bash
echo "🔍 Checking Server Status..."
echo ""
echo "Run this command to check if deployment worked:"
echo ""
echo "ssh root@72.60.29.80 'cd /var/www/hub_social_media_js 2>&1 && echo \"✅ Directory exists\" && pm2 status social-hub && echo \"\" && echo \"Recent logs:\" && pm2 logs social-hub --lines 10 --nostream'"
echo ""
echo "================================"
echo ""
echo "Or copy-paste this to run it:"
echo ""
cat << 'COMMAND'
ssh root@72.60.29.80 'cd /var/www/hub_social_media_js && pm2 status && pm2 logs social-hub --lines 20 --nostream'
COMMAND
