# Manual Deployment Steps - Bot Not Responding

## 🔴 Problem: Bot Not Responding After auto_deploy.sh

This means either:
1. Files weren't uploaded to server
2. PM2 didn't restart
3. Bot has errors preventing it from starting

---

## ✅ Step-by-Step Manual Deployment

### Step 1: Upload the Package

Open a terminal and run:

```bash
scp deploy_package.tar.gz root@72.60.29.80:/var/www/
```

**What to expect:**
- You'll be prompted for the server password
- You should see upload progress
- Should say: `deploy_package.tar.gz 100%`

**If this fails:** Check your password or network connection

---

### Step 2: Connect to Server

```bash
ssh root@72.60.29.80
```

Enter your password when prompted.

**You should see:** Server command prompt

---

### Step 3: Extract and Deploy (Run on Server)

Once connected to the server, run these commands:

```bash
cd /var/www
ls -lh deploy_package.tar.gz
```

**You should see:** The uploaded file (around 434K)

```bash
tar -xzf deploy_package.tar.gz
ls -lh deploy_package/
```

**You should see:** Directory with your bot files

```bash
# Backup old version
mv hub_social_media_js hub_social_media_js.backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null

# Deploy new version
mv deploy_package hub_social_media_js

# Go into the directory
cd hub_social_media_js
ls -lh
```

**You should see:** All your bot files including `src/`, `package.json`, etc.

---

### Step 4: Install Dependencies (If Needed)

Still on the server:

```bash
npm install --production
```

**What to expect:** Installation of node modules (may take 1-2 minutes)

---

### Step 5: Restart PM2

```bash
pm2 restart social-hub
```

**What to expect:**
```
┌─────┬────────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ status  │ restart │ uptime   │
├─────┼────────────────┼─────────┼─────────┼──────────┤
│ 0   │ social-hub     │ online  │ 15      │ 0s       │
└─────┴────────────────┴─────────┴─────────┴──────────┘
```

**Status should be:** `online`

---

### Step 6: Check Logs

```bash
pm2 logs social-hub --lines 30
```

**Look for:**
- ✅ "Telegram Bot initialized: @hubcontenido_bot"
- ✅ "Enhanced Bot is now running!"
- ❌ Any error messages (RED text)

**If you see errors:** Copy them and we'll troubleshoot

---

### Step 7: Verify Handler Functions Were Deployed

```bash
grep -n "async handlePlatformSelection" src/main_interactive_enhanced.js
```

**Expected output:** Should show line number (around line 502)

```bash
grep -c "handlePlatformSelection\|handleTimeSelection\|handleConfirmation" src/main_interactive_enhanced.js
```

**Expected output:** `3` (meaning all 3 functions found)

---

### Step 8: Test the Bot

1. Open Telegram
2. Find: **@hubcontenido_bot**
3. Send: `/start`
4. Click: "📝 Post Content"
5. Click: "🐦 Post to Twitter/X"

**Expected:** Should ask for your content instead of looping

---

## 🚨 Common Issues & Solutions

### Issue 1: "Permission denied" when uploading

**Solution:** Check your server password. Try:
```bash
ssh root@72.60.29.80
```
If this works, then try scp again.

---

### Issue 2: PM2 status shows "errored" or "stopped"

**Check logs:**
```bash
pm2 logs social-hub --err --lines 50
```

**Common causes:**
- Missing environment variables
- Database connection issues
- Invalid Telegram token

**Fix:**
```bash
# Check if .env file exists
ls -lh .env

# View environment variables (don't share tokens!)
cat .env | grep -E "TELEGRAM_BOT_TOKEN|DB_"

# If .env is missing, you need to recreate it on the server
```

---

### Issue 3: PM2 not installed

**Install PM2:**
```bash
npm install -g pm2
```

**Then start the bot:**
```bash
cd /var/www/hub_social_media_js
pm2 start ecosystem.config.js
```

---

### Issue 4: Bot responds but menu still loops

**This means the old code is running. Fix:**
```bash
# Verify you're in the right directory
pwd
# Should show: /var/www/hub_social_media_js

# Check file date
ls -lh src/main_interactive_enhanced.js

# Force restart
pm2 delete social-hub
pm2 start ecosystem.config.js
pm2 save
```

---

## 📞 What to Report Back

After following these steps, please report:

1. **Upload status:** Did `scp` work? Any errors?
2. **PM2 status:** What does `pm2 status` show?
3. **Logs:** Any errors in `pm2 logs`?
4. **Handler check:** How many handlers found? (should be 3)
5. **Bot response:** What happens when you test in Telegram?

---

## 🎯 Quick Diagnostic Command

Run this on the SERVER to get all info:

```bash
echo "=== PM2 Status ===" && pm2 status && \
echo -e "\n=== Recent Logs ===" && pm2 logs social-hub --lines 15 --nostream && \
echo -e "\n=== Handler Functions ===" && grep -c "handlePlatformSelection\|handleTimeSelection\|handleConfirmation" src/main_interactive_enhanced.js && \
echo -e "\n=== File Date ===" && ls -lh src/main_interactive_enhanced.js
```

Copy the output and share it for faster troubleshooting.

---

## ⚡ Need Help?

If stuck, run from LOCAL machine:
```bash
./troubleshoot.sh
```

This will check server status and help identify the issue.
