# 🚀 Deployment Guide for Hub Social Media JS

## Complete Deployment Instructions

This guide provides step-by-step instructions for deploying both the frontend (Next.js) and backend (Express.js) applications.

## 📋 Prerequisites

### System Requirements
- Node.js v18+ (LTS recommended)
- npm v9+ or yarn
- PostgreSQL 14+
- Redis 6+ (optional, for caching)
- Git

### Environment Setup
```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Redis (optional)
sudo apt-get install -y redis-server
```

## 🔧 Backend Deployment

### 1. Install Backend Dependencies
```bash
cd /root/hub_social_media_js
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
nano .env
```

**Critical environment variables to set:**
```
NODE_ENV=production
PORT=8080
API_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com

# Database
DB_HOST=localhost
DB_PORT=55433
DB_NAME=content_hub
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Secrets (must be 32+ characters)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Twitter/X OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=https://yourdomain.com/api/auth/x/callback
```

### 3. Run Database Migrations
```bash
npm run migrate
```

### 4. Start the Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run start

# With PM2 (recommended for production)
npm install -g pm2
pm2 start src/index.ts --name "hub-backend" --interpreter none
pm2 save
pm2 startup
```

## 🎨 Frontend Deployment

### 1. Install Frontend Dependencies
```bash
cd /root/hub_social_media_js/client
npm install
```

### 2. Configure Frontend Environment
Edit `client/.env.local`:
```bash
nano client/.env.local
```

**Set the API URL:**
```
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### 3. Build the Frontend
```bash
npm run build
```

### 4. Start the Frontend Server
```bash
# Development mode
npm run dev

# Production mode
npm run start

# With PM2
pm2 start npm --name "hub-frontend" -- run start
pm2 save
```

## 🌐 Production Deployment Options

### Option 1: Single Server Deployment
```bash
# Backend on port 8080
pm2 start src/index.ts --name "hub-backend" --interpreter none

# Frontend on port 3000
cd client
pm2 start npm --name "hub-frontend" -- run start

# Nginx reverse proxy configuration
nano /etc/nginx/sites-available/hub-social
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment (Recommended)

Create a `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080/api
    restart: unless-stopped

  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=content_hub
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Option 3: Separate Servers (Scalable)

**Backend Server:**
```bash
# Install dependencies
npm install

# Build and start
npm run build
pm2 start src/index.ts --name "hub-backend" --interpreter none
```

**Frontend Server:**
```bash
# Install dependencies
npm install

# Build and start
npm run build
pm2 start npm --name "hub-frontend" -- run start
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 2. Firewall Configuration
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## 📊 Monitoring and Maintenance

### 1. PM2 Monitoring
```bash
pm2 monit
pm2 logs
pm2 list
```

### 2. Log Rotation
```bash
# Install logrotate
sudo apt-get install -y logrotate

# Create logrotate config
nano /etc/logrotate.d/hub-social
```

**Logrotate configuration:**
```
/root/hub_social_js/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 root root
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

## 🚀 Deployment Checklist

- [ ] Install Node.js, PostgreSQL, Redis
- [ ] Clone repository and install dependencies
- [ ] Configure environment variables (.env files)
- [ ] Run database migrations
- [ ] Build frontend (`npm run build`)
- [ ] Start backend and frontend services
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificates
- [ ] Configure firewall
- [ ] Set up monitoring and log rotation
- [ ] Test all functionality
- [ ] Set up backups

## 🔄 Update and Maintenance

### Updating the Application
```bash
# Pull latest changes
cd /root/hub_social_media_js
git pull origin master

# Update dependencies
npm install
cd client
npm install

# Rebuild and restart
cd ..
npm run build
pm2 restart all
```

### Backup Strategy
```bash
# Database backup
pg_dump -U postgres -d content_hub > backup_$(date +%Y%m%d).sql

# Full application backup
tar -czvf hub_backup_$(date +%Y%m%d).tar.gz /root/hub_social_media_js
```

## 📞 Troubleshooting

### Common Issues

**1. Database connection failed:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -p 55433 -U postgres -d content_hub
```

**2. Frontend not loading:**
```bash
# Check Next.js logs
pm2 logs hub-frontend

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t
```

**3. API endpoints not working:**
```bash
# Check backend logs
pm2 logs hub-backend

# Test API directly
curl http://localhost:8080/api/health
```

**4. OAuth login failed:**
```bash
# Check Twitter OAuth configuration
echo "TWITTER_CLIENT_ID: $TWITTER_CLIENT_ID"

# Test OAuth endpoint
curl http://localhost:8080/api/auth/x/login
```

## 🎉 Deployment Complete!

Your Hub Social Media application should now be running at:
- **Frontend**: `https://yourdomain.com`
- **Backend API**: `https://yourdomain.com/api/`
- **Admin Dashboard**: `https://yourdomain.com/settings`

Enjoy your fully deployed social media management platform! 🚀
