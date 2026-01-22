# 🔧 Frontend Troubleshooting Guide - Hub Social Media JS

## 📋 Current Status

**Issue:** Frontend process is crashing repeatedly (22,425 restarts)
**Backend Status:** ✅ Working perfectly
**Frontend Status:** ❌ Crashing on startup

---

## 🔍 Diagnosis

### Symptoms
- Frontend process shows 22,425+ restarts in PM2
- Process starts but immediately crashes
- No response from http://localhost:3000/
- Backend API is working correctly

### Possible Causes
1. **Missing Environment Variables**
2. **Corrupted Build**
3. **Missing Dependencies**
4. **Port Conflict**
5. **Configuration Issues**
6. **Memory Issues**

---

## 🛠️ Troubleshooting Steps

### 1. Check Environment Variables
```bash
cd /root/hub_social_media_js/client
cat .env.local
# Should show: NEXT_PUBLIC_API_URL=https://clickera.app/api
```

### 2. Reinstall Dependencies
```bash
cd /root/hub_social_media_js/client
rm -rf node_modules package-lock.json
npm install
```

### 3. Clean and Rebuild
```bash
cd /root/hub_social_media_js/client
npm run clean  # If available
rm -rf .next
npm run build
```

### 4. Check Port Availability
```bash
# Check if port 3000 is in use
netstat -tuln | grep 3000
lsof -i :3000
```

### 5. Test Development Mode
```bash
cd /root/hub_social_media_js/client
npm run dev
# Check if it starts without crashing
```

### 6. Check Logs
```bash
# Check PM2 logs
pm2 logs hub-frontend --lines 100

# Check system logs
journalctl -u hub-frontend -n 50
```

### 7. Verify Node.js Version
```bash
node -v
# Should be v18+ (LTS recommended)
```

### 8. Check Memory Usage
```bash
free -h
pm2 monit
```

---

## 🔧 Fixes to Try

### Fix 1: Rebuild and Restart
```bash
cd /root/hub_social_media_js/client
npm run build
pm2 restart hub-frontend
```

### Fix 2: Change Port
```bash
# Edit client/.env.local
NEXT_PUBLIC_API_URL=https://clickera.app/api
PORT=3001  # Add this line

# Update ecosystem.config.js
# Change frontend port to 3001

pm2 restart hub-frontend
```

### Fix 3: Increase Memory
```bash
# Edit ecosystem.config.js
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  NODE_OPTIONS: '--max-old-space-size=2048'  # Increase memory limit
}

pm2 restart hub-frontend
```

### Fix 4: Debug Mode
```bash
cd /root/hub_social_media_js/client
NODE_ENV=development npm run dev
# Check for errors in console
```

---

## 📁 Important Files to Check

### 1. Environment Configuration
- `client/.env.local` - Frontend environment variables
- `client/next.config.js` - Next.js configuration
- `client/package.json` - Dependencies and scripts

### 2. Build Configuration
- `client/.next/` - Build output directory
- `client/node_modules/` - Dependencies

### 3. Log Files
- `/root/.pm2/logs/hub-frontend-error.log` - Error logs
- `/root/.pm2/logs/hub-frontend-out.log` - Output logs

---

## 🚀 Recovery Plan

### Step 1: Stop Current Process
```bash
pm2 stop hub-frontend
pm2 delete hub-frontend
```

### Step 2: Clean Everything
```bash
cd /root/hub_social_media_js/client
rm -rf node_modules .next package-lock.json
```

### Step 3: Reinstall Dependencies
```bash
cd /root/hub_social_media_js/client
npm install
```

### Step 4: Rebuild
```bash
cd /root/hub_social_media_js/client
npm run build
```

### Step 5: Restart with PM2
```bash
pm2 start npm --name "hub-frontend" -- run start
```

---

## 📊 Common Issues and Solutions

### Issue: Missing Environment Variables
**Solution:** Verify `.env.local` exists and has correct values

### Issue: Corrupted Build
**Solution:** Delete `.next` directory and rebuild

### Issue: Port Conflict
**Solution:** Change port or kill conflicting process

### Issue: Memory Issues
**Solution:** Increase Node.js memory limit

### Issue: Missing Dependencies
**Solution:** Delete `node_modules` and reinstall

### Issue: Configuration Errors
**Solution:** Check `next.config.js` for syntax errors

---

## 🎯 Next Steps

1. **Check Logs:** `pm2 logs hub-frontend --lines 100`
2. **Test Locally:** `npm run dev` in development mode
3. **Verify Dependencies:** `npm audit`
4. **Check Configuration:** Review `next.config.js`
5. **Test Build:** `npm run build` manually

---

## 📞 Support Information

### Backend (Working)
- **URL:** https://clickera.app/api/
- **Status:** ✅ Online and functional
- **Process:** hub-backend (PID: 654024)

### Frontend (Needs Fix)
- **Expected URL:** https://clickera.app
- **Status:** ❌ Crashing on startup
- **Process:** hub-frontend (PID: varies)

### Management
```bash
# View all processes
pm2 list

# View frontend logs
pm2 logs hub-frontend

# Restart frontend
pm2 restart hub-frontend

# Check status
pm2 status
```

---

**End of Troubleshooting Guide**
**Generated:** January 22, 2026
**Status:** Backend ✅ Working, Frontend ❌ Needs Troubleshooting
