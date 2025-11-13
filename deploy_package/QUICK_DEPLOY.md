# Quick Deployment Instructions

## Your Twitter/X posting fix is ready to deploy! 🚀

The issue has been fixed - we added 3 missing handler functions that were causing the menu loop.

---

## Deploy in 3 Simple Steps:

### Step 1: Add SSH Key (One-time setup - makes future deploys automatic)

Copy and paste this command (you'll be prompted for your server password once):

```bash
cat ~/.ssh/hostinger_deploy.pub | ssh root@72.60.29.80 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Step 2: Deploy Automatically

After the SSH key is added, run:

```bash
./auto_deploy.sh
```

That's it! The script will automatically upload, extract, and restart your bot.

---

## OR: Manual Deployment (if you prefer)

If you'd rather deploy manually, run these 3 commands (enter password when prompted):

```bash
# 1. Upload
scp deploy_package.tar.gz root@72.60.29.80:/var/www/

# 2. Extract and deploy
ssh root@72.60.29.80 "cd /var/www && tar -xzf deploy_package.tar.gz && rm -rf hub_social_media_js.old && mv hub_social_media_js hub_social_media_js.old 2>/dev/null; mv deploy_package hub_social_media_js && cd hub_social_media_js && ls -la"

# 3. Restart bot
ssh root@72.60.29.80 "cd /var/www/hub_social_media_js && pm2 restart social-hub"
```

---

## What Was Fixed?

The bot was missing these handler functions:
- `handlePlatformSelection()` - Now properly handles platform selection
- `handleTimeSelection()` - Handles scheduling options
- `handleConfirmation()` - Handles yes/no confirmations

**Before:** Click "Post to X" → Menu loops back to "Pick social media"
**After:** Click "Post to X" → "Send your content to post to Twitter/X" → Success! ✅

---

## Verify It's Working

After deployment:
1. Open your Telegram bot
2. Click "📝 Post Content"
3. Click "🐦 Post to Twitter/X"
4. You should see: "📝 Send the content you want to post to Twitter/X:"
5. Type your message and it will post!

---

## Need Help?

If you get any errors, check:
- PM2 status: `ssh root@72.60.29.80 "pm2 status"`
- Bot logs: `ssh root@72.60.29.80 "pm2 logs social-hub"`
