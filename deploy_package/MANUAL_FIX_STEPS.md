# 🔧 Manual Fix Steps - Twitter Configuration

## ⚠️ Important
You need to run these commands DIRECTLY on your server at `72.60.29.80`

## Option 1: Direct SSH (Recommended)

```bash
ssh root@72.60.29.80
```

Then copy-paste ALL these commands:

```bash
cd /var/www/hub_social_media_js

# Update Twitter credentials in .env
grep -q "^TWITTER_CONSUMER_KEY=" .env && sed -i "s|^TWITTER_CONSUMER_KEY=.*|TWITTER_CONSUMER_KEY=KriW4BjDrZmdJPCtlgfNs8HNa|" .env || echo "TWITTER_CONSUMER_KEY=KriW4BjDrZmdJPCtlgfNs8HNa" >> .env

grep -q "^TWITTER_CONSUMER_SECRET=" .env && sed -i "s|^TWITTER_CONSUMER_SECRET=.*|TWITTER_CONSUMER_SECRET=8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT|" .env || echo "TWITTER_CONSUMER_SECRET=8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT" >> .env

grep -q "^TWITTER_ACCESS_TOKEN=" .env && sed -i "s|^TWITTER_ACCESS_TOKEN=.*|TWITTER_ACCESS_TOKEN=1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b|" .env || echo "TWITTER_ACCESS_TOKEN=1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b" >> .env

grep -q "^TWITTER_ACCESS_TOKEN_SECRET=" .env && sed -i "s|^TWITTER_ACCESS_TOKEN_SECRET=.*|TWITTER_ACCESS_TOKEN_SECRET=oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt|" .env || echo "TWITTER_ACCESS_TOKEN_SECRET=oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt" >> .env

echo "✅ Credenciales configuradas"

# Now update the main_interactive_enhanced.js file
# Open the file in nano
nano src/main_interactive_enhanced.js
```

## 📝 Edit the file:

1. Press `Ctrl+W` to search
2. Type: `if (process.env.TWITTER_API_KEY)`
3. Press Enter
4. You should see line 69: `if (process.env.TWITTER_API_KEY) {`
5. Change it to: `if (process.env.TWITTER_API_KEY || process.env.TWITTER_CONSUMER_KEY) {`
6. Press `Ctrl+O` to save
7. Press Enter to confirm
8. Press `Ctrl+X` to exit

## 🔄 Restart the bot:

```bash
pm2 restart social-hub

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

echo ""
echo "📊 Status:"
pm2 status social-hub

echo ""
echo "📝 Recent Logs:"
pm2 logs social-hub --lines 25 --nostream
```

## ✅ What to look for in the logs:

You should see:
- ✅ `Twitter API client initialized`
- ✅ `Enhanced Bot is now running!`
- ✅ `Bot started successfully`

You should NOT see:
- ❌ `Scheduled message 1, 2, 3...` (that's the wrong script)
- ❌ `twitter is not configured yet`
- ❌ Any error messages about Twitter

---

## Option 2: Single Command via nano (Alternative)

If you prefer to edit manually:

```bash
ssh root@72.60.29.80
cd /var/www/hub_social_media_js
nano .env
```

Add or update these lines:
```
TWITTER_CONSUMER_KEY=KriW4BjDrZmdJPCtlgfNs8HNa
TWITTER_CONSUMER_SECRET=8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT
TWITTER_ACCESS_TOKEN=1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b
TWITTER_ACCESS_TOKEN_SECRET=oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAGlp5QEAAAAA8pnhE29%2BfGibKbHDtpPa9jQDP6I%3DBRQXNgQ0l1hcUACxxajfbO3qMD0UI6Dq8LpQFvtghYFxItU7B6
```

Save (`Ctrl+O`, Enter) and exit (`Ctrl+X`)

Then edit the main file:
```bash
nano src/main_interactive_enhanced.js
```

Find line 69 and change:
```javascript
// FROM:
if (process.env.TWITTER_API_KEY) {

// TO:
if (process.env.TWITTER_API_KEY || process.env.TWITTER_CONSUMER_KEY) {
```

Save and restart:
```bash
pm2 restart social-hub
pm2 logs social-hub --lines 30
```

---

## 🧪 Test After Restart:

1. Open your Telegram bot
2. Send `/start`
3. Click "📝 Post Content"
4. Click "🐦 Post to Twitter/X"
5. You should see: "📝 Send the content you want to post to Twitter/X:"
6. The menu should NOT loop back to "pick social media"

---

## 🆘 If Still Not Working:

Run this diagnostic:
```bash
cd /var/www/hub_social_media_js
node -e "require('dotenv').config(); console.log('TWITTER_CONSUMER_KEY:', process.env.TWITTER_CONSUMER_KEY ? '✅ ' + process.env.TWITTER_CONSUMER_KEY.substring(0,10) + '...' : '❌ NOT SET'); console.log('TWITTER_API_KEY:', process.env.TWITTER_API_KEY ? '✅' : '❌ NOT SET');"
```

This will show if the credentials are actually loaded.
