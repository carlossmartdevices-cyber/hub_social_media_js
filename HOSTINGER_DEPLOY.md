# Quick Hostinger Deployment Guide

This is a streamlined guide specifically for deploying to Hostinger servers.

## Prerequisites Checklist

- [ ] Hostinger VPS or Cloud Hosting plan (shared hosting won't work for Node.js apps)
- [ ] SSH access enabled in Hostinger control panel
- [ ] Your Hostinger SSH credentials
- [ ] PostgreSQL database (can be created in Hostinger control panel)

## Method 1: Deploy via FTP/File Manager (Easiest for Beginners)

### Step 1: Prepare Your Files Locally

On Windows, run:
```bash
deploy.bat
```

On Linux/Mac, run:
```bash
chmod +x deploy.sh
./deploy.sh
```

This creates a `deploy_package` folder with all necessary files.

### Step 2: Compress the Package

- **Windows**: Right-click `deploy_package` folder → Send to → Compressed folder
- **Linux/Mac**: Run `tar -czf deploy_package.tar.gz deploy_package`

### Step 3: Upload to Hostinger

#### Option A: Using Hostinger File Manager
1. Log into your Hostinger control panel (hpanel)
2. Go to **Files** → **File Manager**
3. Navigate to `/home/username/` or create `/home/username/apps`
4. Click **Upload** and upload your compressed package
5. Right-click the uploaded file → **Extract**

#### Option B: Using FTP Client (FileZilla)
1. Download FileZilla or similar FTP client
2. Connect using credentials from Hostinger control panel
3. Upload the compressed package to `/home/username/apps`
4. Use SSH to extract (see Method 2)

### Step 4: Set Up Database in Hostinger

1. In Hostinger control panel, go to **Databases** → **PostgreSQL**
2. Click **Create Database**
3. Note down:
   - Database name
   - Username
   - Password
   - Host (usually localhost or a specific IP)

### Step 5: Connect via SSH and Configure

```bash
# Connect to your server
ssh username@your-server-ip
# Password will be in your Hostinger control panel

# Navigate to your app directory
cd ~/apps/hub_social_media_js
# or wherever you uploaded it

# Create .env file
nano .env
```

Paste your configuration (update with your actual database credentials):
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# Twitter API Configuration
TWITTER_CONSUMER_KEY=tqKRdDszN9fgYqWC7jFBVx2gP
TWITTER_CONSUMER_SECRET=y4WhWxQiMbVHKQ4x4qdClNiQlQODsG397Wn9K3mhX0mfmn1Tn4
TWITTER_ACCESS_TOKEN=1929028565380558848-MvjqxFmdd3iTlI8MmAyEh56SxOfIdz
TWITTER_ACCESS_TOKEN_SECRET=ZSVPoZvQmaYdlXpxuBicAHso3W26xuMopBE7yLz93gPRc

# Twitter OAuth 2.0 Configuration
TWITTER_CLIENT_ID=tqKRdDszN9fgYqWC7jFBVx2gP
TWITTER_CLIENT_SECRET=lEiyUQ_z5NnCGIdbJdi4s092-S0IH8w8oABLnh999lmUoYyr7r
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAACug2AEAAAAAxx0%2FObIg2qUvIniTTVrS9c2jPJY%3DbIgRA7KD9KilNsDphVNX049iEc5rBdwTtc3WHS7TmZeklpIIkl

# Telegram API Configuration
TELEGRAM_BOT_TOKEN=8323409032:AAE__tQgnvC6rnH9jzrTuXvBzmgRD-3ha2I

# Application Configuration
NODE_ENV=production
PORT=3000
```

Save with `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Install Dependencies and Start

```bash
# Install dependencies
npm install --production

# Install PM2 globally (if not already installed)
npm install -g pm2

# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Set PM2 to start on server reboot
pm2 startup

# Check status
pm2 status

# View logs
pm2 logs social-hub
```

## Method 2: Deploy via Git (Recommended for Updates)

### Step 1: Set Up Git Repository

If you haven't already, initialize a git repository:
```bash
# On your local machine
git init
git add .
git commit -m "Initial commit"
```

Push to GitHub, GitLab, or Bitbucket.

### Step 2: Clone on Hostinger

```bash
# SSH into your Hostinger server
ssh username@your-server-ip

# Navigate to apps directory
mkdir -p ~/apps
cd ~/apps

# Clone your repository
git clone https://github.com/yourusername/hub_social_media_js.git
cd hub_social_media_js

# Follow steps 4-6 from Method 1 above
```

## Important Hostinger-Specific Notes

### 1. Node.js Version
Check your Node.js version:
```bash
node --version
```

If it's below v14, update it:
```bash
# Using nvm (if available)
nvm install 18
nvm use 18
```

### 2. Port Configuration
- Hostinger VPS: You can use any port (3000 is fine)
- Hostinger Shared Hosting: Node.js apps typically not supported
- Check if port 3000 is open:
```bash
netstat -tuln | grep 3000
```

### 3. PostgreSQL Access
Hostinger provides PostgreSQL access:
- Go to **Databases** in hpanel
- Use the hostname provided (might be localhost or specific IP)
- Ensure your database user has proper permissions

### 4. Firewall Configuration
If using VPS, you may need to configure firewall:
```bash
# Allow port 3000
sudo ufw allow 3000/tcp
sudo ufw enable
sudo ufw status
```

## Monitoring Your Application

```bash
# Check if application is running
pm2 status

# View real-time logs
pm2 logs social-hub

# Monitor resources
pm2 monit

# Restart application
pm2 restart social-hub

# Stop application
pm2 stop social-hub
```

## Updating Your Application

```bash
# SSH into server
ssh username@your-server-ip

# Navigate to app directory
cd ~/apps/hub_social_media_js

# Pull latest changes (if using git)
git pull origin main

# Install any new dependencies
npm install --production

# Restart application
pm2 restart social-hub
```

## Troubleshooting Common Hostinger Issues

### Issue 1: "Permission denied" errors
```bash
# Fix permissions
chmod -R 755 ~/apps/hub_social_media_js
```

### Issue 2: Cannot connect to database
- Verify database credentials in Hostinger control panel
- Check if PostgreSQL is running: `systemctl status postgresql`
- Ensure database host is correct (might be an IP, not localhost)

### Issue 3: Port already in use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change PORT in .env file
```

### Issue 4: Application crashes on startup
```bash
# Check logs for errors
pm2 logs social-hub --lines 100

# Check if all dependencies installed
npm install --production

# Verify .env file exists and is configured
cat .env
```

### Issue 5: Node.js not found
```bash
# Add Node.js to PATH (if needed)
export PATH=$PATH:/usr/local/bin/node
export PATH=$PATH:/usr/local/bin/npm

# Or create symlinks
sudo ln -s /usr/local/bin/node /usr/bin/node
sudo ln -s /usr/local/bin/npm /usr/bin/npm
```

## Setting Up Domain (Optional)

If you want to access your app via domain name instead of IP:port

### 1. Point Domain to Server
In Hostinger control panel:
- Go to **Domains**
- Add A record pointing to your VPS IP

### 2. Set Up Nginx Reverse Proxy
```bash
# Install Nginx (if not installed)
sudo apt update
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/social-hub
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/social-hub /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3. Add SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

## Security Best Practices

1. **Change default passwords** - Use strong passwords for database
2. **Keep .env secure** - Never commit .env to git
3. **Update regularly** - Keep Node.js and packages updated
4. **Use SSL** - Always use HTTPS in production
5. **Backup database** - Set up automated backups
6. **Monitor logs** - Regularly check for errors

## Quick Command Reference

```bash
# Deploy commands
deploy.bat                          # Windows: prepare deployment
./deploy.sh                         # Linux/Mac: prepare deployment

# PM2 commands
pm2 start ecosystem.config.js       # Start app
pm2 restart social-hub              # Restart app
pm2 stop social-hub                 # Stop app
pm2 logs social-hub                 # View logs
pm2 monit                           # Monitor resources
pm2 status                          # Check status

# Database backup
pg_dump -U your_db_user your_db_name > backup.sql

# Update app
git pull && npm install --production && pm2 restart social-hub
```

## Getting Help

- **Hostinger Support**: https://www.hostinger.com/contact
- **Check logs**: `pm2 logs social-hub`
- **Check server resources**: `pm2 monit`
- **Database connection**: Verify in Hostinger control panel

## Next Steps After Deployment

1. Test all API integrations (Twitter, Telegram, etc.)
2. Verify database connectivity
3. Check scheduled jobs are running
4. Monitor application performance
5. Set up automated backups
6. Configure monitoring alerts (optional)

---

**Need help?** Check the logs first: `pm2 logs social-hub --lines 100`
