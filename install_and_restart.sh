#!/bin/bash
echo "Installing dependencies and restarting bot..."
echo ""
echo "Run this command:"
echo ""
echo "ssh root@72.60.29.80 'cd /var/www/hub_social_media_js && npm install --production && pm2 restart social-hub && pm2 logs social-hub --lines 30'"
