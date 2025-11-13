# Deployment Checklist for Hostinger

Use this checklist to ensure a smooth deployment to your Hostinger server.

## Pre-Deployment Checklist

### Local Preparation
- [ ] Test application locally and ensure it runs without errors
- [ ] All API credentials are valid and working
- [ ] Database schema is up to date
- [ ] All dependencies are listed in package.json
- [ ] .gitignore includes sensitive files (.env, node_modules, logs)
- [ ] Run deployment script (deploy.bat on Windows or deploy.sh on Linux/Mac)
- [ ] Compress the deploy_package folder

### Hostinger Account Setup
- [ ] Hostinger VPS or Cloud Hosting plan active
- [ ] SSH access enabled in Hostinger control panel
- [ ] SSH credentials obtained from control panel
- [ ] PostgreSQL database created in Hostinger control panel
- [ ] Database credentials noted down (host, port, name, user, password)

## Deployment Steps Checklist

### 1. File Upload
- [ ] Files uploaded via FTP/File Manager or Git clone completed
- [ ] Files extracted in correct directory (e.g., /home/username/apps/)
- [ ] Correct file permissions set (755 for directories, 644 for files)

### 2. Server Configuration
- [ ] Connected to server via SSH
- [ ] Node.js version checked (v14+ required)
  ```bash
  node --version
  ```
- [ ] PM2 installed globally
  ```bash
  npm install -g pm2
  ```

### 3. Environment Configuration
- [ ] .env file created in application root directory
- [ ] Database credentials updated in .env
- [ ] Twitter API credentials updated in .env
- [ ] Telegram bot token updated in .env
- [ ] NODE_ENV set to 'production' in .env
- [ ] PORT configured (default: 3000)

### 4. Database Setup
- [ ] PostgreSQL service running
  ```bash
  sudo systemctl status postgresql
  ```
- [ ] Database exists and is accessible
- [ ] Database user has proper permissions
- [ ] Test database connection

### 5. Application Setup
- [ ] logs directory created
  ```bash
  mkdir -p logs
  ```
- [ ] Dependencies installed
  ```bash
  npm install --production
  ```
- [ ] No errors during installation
- [ ] Application started with PM2
  ```bash
  pm2 start ecosystem.config.js
  ```
- [ ] PM2 process list saved
  ```bash
  pm2 save
  ```
- [ ] PM2 startup script created
  ```bash
  pm2 startup
  ```

### 6. Firewall Configuration (if applicable)
- [ ] Port 3000 opened in firewall
  ```bash
  sudo ufw allow 3000/tcp
  ```
- [ ] Firewall rules applied
  ```bash
  sudo ufw enable
  ```

### 7. Testing
- [ ] Application status is 'online' in PM2
  ```bash
  pm2 status
  ```
- [ ] Application logs show no errors
  ```bash
  pm2 logs social-hub
  ```
- [ ] Database connection successful (check logs)
- [ ] Can access application via IP:PORT (e.g., http://your-ip:3000)
- [ ] Twitter API integration working
- [ ] Telegram bot responding
- [ ] Scheduled jobs running correctly

## Post-Deployment Checklist

### Optional: Domain Setup
- [ ] Domain pointed to server IP in Hostinger DNS
- [ ] Nginx installed and configured as reverse proxy
- [ ] Nginx configuration tested
  ```bash
  sudo nginx -t
  ```
- [ ] Nginx restarted
  ```bash
  sudo systemctl restart nginx
  ```
- [ ] Can access application via domain (e.g., http://yourdomain.com)

### Optional: SSL Certificate
- [ ] Certbot installed
- [ ] SSL certificate obtained for domain
  ```bash
  sudo certbot --nginx -d yourdomain.com
  ```
- [ ] Application accessible via HTTPS

### Monitoring Setup
- [ ] PM2 monitoring working
  ```bash
  pm2 monit
  ```
- [ ] Log rotation configured (PM2 does this automatically)
- [ ] Disk space sufficient for logs and data
- [ ] Server resources adequate (RAM, CPU)

### Security
- [ ] .env file has correct permissions (600)
  ```bash
  chmod 600 .env
  ```
- [ ] Database password is strong and unique
- [ ] API keys are production keys (not test keys)
- [ ] Unnecessary ports closed in firewall
- [ ] SSH key authentication enabled (optional but recommended)
- [ ] Root login disabled (optional but recommended)

### Backup
- [ ] Database backup strategy in place
- [ ] Backup script created or scheduled
- [ ] First manual backup completed
  ```bash
  pg_dump -U db_user db_name > backup_$(date +%Y%m%d).sql
  ```
- [ ] Backup storage location confirmed

### Documentation
- [ ] Server IP and credentials saved securely
- [ ] Database credentials documented securely
- [ ] PM2 commands documented for team
- [ ] Update procedure documented

## Verification Commands

Run these commands to verify your deployment:

```bash
# Check Node.js version
node --version

# Check PM2 status
pm2 status

# Check application logs
pm2 logs social-hub --lines 50

# Check if port is listening
netstat -tuln | grep 3000

# Check PostgreSQL status
sudo systemctl status postgresql

# Check disk space
df -h

# Check memory usage
free -m

# Check PM2 is set to start on boot
pm2 list
```

## Common Issues and Solutions

### Issue: Application shows "errored" status in PM2
**Solution**: Check logs with `pm2 logs social-hub` and fix the error

### Issue: Cannot connect to database
**Solution**:
- Verify database credentials in .env
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Check database host is correct (might be IP, not localhost)

### Issue: Port 3000 already in use
**Solution**:
- Find process: `sudo lsof -i :3000`
- Kill process: `sudo kill -9 <PID>`
- Or change PORT in .env

### Issue: Permission denied errors
**Solution**: `chmod -R 755 ~/apps/hub_social_media_js`

### Issue: Cannot access via domain
**Solution**:
- Check DNS propagation (can take up to 48 hours)
- Verify Nginx configuration: `sudo nginx -t`
- Check Nginx is running: `sudo systemctl status nginx`

## Rollback Plan

If deployment fails and you need to rollback:

1. Stop the application
   ```bash
   pm2 stop social-hub
   ```

2. Restore previous version (if using git)
   ```bash
   git checkout previous-version-tag
   npm install --production
   pm2 restart social-hub
   ```

3. Restore database backup (if necessary)
   ```bash
   psql -U db_user db_name < backup_file.sql
   ```

## Contact Information

- **Hostinger Support**: https://www.hostinger.com/contact
- **Hostinger Knowledge Base**: https://support.hostinger.com/

## Notes

- Deployment date: _______________
- Deployed by: _______________
- Server IP: _______________
- Domain: _______________
- Database name: _______________
- Any special configurations: _______________

---

**Remember**: Always test in a staging environment first if possible!
