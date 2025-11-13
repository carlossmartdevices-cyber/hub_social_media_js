# Deployment Guide - Hostinger Server

This guide will help you deploy the Social Media Hub application to your Hostinger server.

## Prerequisites

- Hostinger VPS or hosting account with SSH access
- Node.js 14+ installed on server
- PostgreSQL database access
- Your Twitter API credentials

## Step 1: Prepare Your Server

### Connect to your Hostinger server via SSH:
```bash
ssh username@your-server-ip
```

### Install Node.js (if not installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PostgreSQL (if not installed):
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

### Install PM2 (Process Manager):
```bash
sudo npm install -g pm2
```

## Step 2: Set Up Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE hub_social_media;
CREATE USER hub_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hub_social_media TO hub_admin;
\q
```

## Step 3: Upload Your Code

### Option A: Using Git (Recommended)
```bash
cd /var/www  # or your preferred directory
git clone <your-repository-url>
cd hub_social_media_js
```

### Option B: Using FTP/SFTP
Upload the entire project folder to your server using FileZilla or similar FTP client.

## Step 4: Configure Environment Variables

```bash
cd /var/www/hub_social_media_js
nano .env
```

Add your production configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hub_social_media
DB_USER=hub_admin
DB_PASSWORD=your_secure_password

# Twitter API Configuration
TWITTER_CONSUMER_KEY=tqKRdDszN9fgYqWC7jFBVx2gP
TWITTER_CONSUMER_SECRET=y4WhWxQiMbVHKQ4x4qdClNiQlQODsG397Wn9K3mhX0mfmn1Tn4
TWITTER_ACCESS_TOKEN=1929028565380558848-MvjqxFmdd3iTlI8MmAyEh56SxOfIdz
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

# Twitter OAuth 2.0 Configuration
TWITTER_CLIENT_ID=tqKRdDszN9fgYqWC7jFBVx2gP
TWITTER_CLIENT_SECRET=lEiyUQ_z5NnCGIdbJdi4s092-S0IH8w8oABLnh999lmUoYyr7r
TWITTER_BEARER_TOKEN=your_bearer_token_here

# Application Configuration
NODE_ENV=production
PORT=3000
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 5: Install Dependencies

```bash
npm install --production
```

## Step 6: Start Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 7: Configure Firewall (if needed)

```bash
sudo ufw allow 3000/tcp
sudo ufw enable
```

## Step 8: Set Up Nginx Reverse Proxy (Optional but Recommended)

### Install Nginx:
```bash
sudo apt-get install nginx
```

### Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/social-hub
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/social-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 9: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Useful PM2 Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs social-hub

# Restart application
pm2 restart social-hub

# Stop application
pm2 stop social-hub

# Monitor application
pm2 monit
```

## Troubleshooting

### Check logs:
```bash
pm2 logs social-hub --lines 100
```

### Check if port is in use:
```bash
sudo lsof -i :3000
```

### Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Check PostgreSQL status:
```bash
sudo systemctl status postgresql
```

## Security Recommendations

1. **Change default database password**
2. **Set up firewall rules** to only allow necessary ports
3. **Keep Node.js and dependencies updated**
4. **Enable SSL/HTTPS** for production
5. **Set up automated backups** for your database
6. **Use strong passwords** for all services
7. **Restrict SSH access** (disable root login, use SSH keys)

## Updating the Application

```bash
cd /var/www/hub_social_media_js
git pull origin main  # if using git
npm install --production
pm2 restart social-hub
```

## Backing Up Database

```bash
pg_dump -U hub_admin hub_social_media > backup_$(date +%Y%m%d).sql
```

## Restoring Database

```bash
psql -U hub_admin hub_social_media < backup_20250129.sql
```

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
