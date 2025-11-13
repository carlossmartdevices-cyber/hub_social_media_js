#!/bin/bash

echo "========================================="
echo "🚀 Deploying Twitter Enhancements"
echo "========================================="
echo ""
echo "New Features:"
echo "  ✅ Character limit validation (280 chars)"
echo "  ✅ Photo/image support for tweets"
echo "  ✅ Enhanced error messages"
echo ""
echo "Files to upload:"
echo "  1. src/utils/validator.js (with Twitter validation)"
echo "  2. src/platforms/twitter/apiClient.js (enhanced errors + media)"
echo "  3. src/main_interactive_enhanced.js (photo support)"
echo ""
echo "========================================="
echo ""

# Copy command for you to run:
cat << 'COMMANDS'
Run this command to deploy:

ssh root@72.60.29.80 'cd /var/www/hub_social_media_js && \
mkdir -p temp && \
pm2 stop social-hub'

# Then upload the files (you'll need to do this manually or via scp):

scp src/utils/validator.js root@72.60.29.80:/var/www/hub_social_media_js/src/utils/
scp src/platforms/twitter/apiClient.js root@72.60.29.80:/var/www/hub_social_media_js/src/platforms/twitter/
scp src/main_interactive_enhanced.js root@72.60.29.80:/var/www/hub_social_media_js/src/

# Then restart:

ssh root@72.60.29.80 'cd /var/www/hub_social_media_js && \
pm2 start social-hub && \
sleep 3 && \
pm2 logs social-hub --lines 30 --nostream'

COMMANDS

echo ""
echo "========================================="
echo "✅ Copy the commands above!"
echo "========================================="
