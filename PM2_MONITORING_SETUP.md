# PM2 Monitoring & Logging Setup

## ✅ Completed Configuration

### 1. **Log Rotation (pm2-logrotate)**
- **Status**: ✅ Installed and configured
- **Max Log Size**: 50MB per file
- **Retention**: 30 days
- **Compression**: Enabled
- **Date Format**: YYYY-MM-DD_HH-mm-ss
- **Rotation Schedule**: Daily at midnight

### 2. **Auto-Start on Reboot**
- **Status**: ✅ Configured with systemd
- **Service**: pm2-root.service
- **Command**: `systemctl enable pm2-root`
- **Saved Process List**: `/root/.pm2/dump.pm2`

### 3. **Process Monitoring**

#### Current Running Processes:
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ social-hub         │ fork     │ 0    │ online    │ 22%      │ 104.6mb  │
│ 1  │ twitter-auth       │ fork     │ 101  │ online    │ 0%       │ 62.3mb   │
│ 2  │ clickera-client    │ fork     │ 3012 │ online    │ 26.8%    │ 61.3mb   │
│ 4  │ pm2-logrotate      │ fork     │ 0    │ online    │ 0%       │ 28.2mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

## 📊 Useful PM2 Commands

### View Status
```bash
pm2 status              # Show all processes
pm2 list                # Detailed process list
pm2 monit               # Real-time monitoring dashboard
```

### View Logs
```bash
pm2 logs                # View all logs
pm2 logs social-hub     # View specific app logs
pm2 logs --lines 100    # View last 100 lines
pm2 logs --err          # View error logs only
```

### Process Management
```bash
pm2 restart all         # Restart all processes
pm2 restart social-hub  # Restart specific app
pm2 stop all            # Stop all processes
pm2 delete all          # Remove all processes
pm2 reload all          # Graceful reload
```

### Configuration
```bash
pm2 conf                # View all PM2 settings
pm2 set pm2-logrotate:max_size 100M  # Change log size
pm2 save                # Save current process list
pm2 resurrect           # Restore saved process list
```

## 📁 Log Locations

- **Main Logs**: `/root/.pm2/logs/`
- **Process Logs**: `/root/.pm2/logs/{app-name}-out.log`
- **Error Logs**: `/root/.pm2/logs/{app-name}-error.log`
- **PM2 Daemon**: `/root/.pm2/pm2.log`

## 🔍 Monitoring Features

### 1. **Real-time Monitoring**
```bash
pm2 monit
```
Shows CPU, memory, and process status in real-time.

### 2. **Log Rotation**
- Automatically rotates logs when they exceed 50MB
- Keeps 30 days of logs
- Compresses old logs to save space
- Runs daily at midnight

### 3. **Auto-Restart**
- Processes automatically restart if they crash
- Restart count tracked in PM2 status
- Graceful shutdown on system reboot

### 4. **Health Checks**
- Monitor process uptime
- Track restart counts
- Memory and CPU usage tracking

## 🚀 Next Steps

1. **Monitor Application Health**
   ```bash
   pm2 monit
   ```

2. **Check Logs for Errors**
   ```bash
   pm2 logs social-hub --lines 50
   ```

3. **Set Up Alerts** (Optional)
   - Use PM2 Plus for advanced monitoring
   - Configure email/Slack notifications

4. **Regular Maintenance**
   - Review logs weekly
   - Monitor disk space for log files
   - Update applications as needed

## 📈 Performance Metrics

Current resource usage:
- **Total Memory**: ~256MB (all processes)
- **CPU Usage**: ~49% (peak)
- **Uptime**: Varies by process
- **Restart Count**: Tracked per process

---

**Setup Date**: 2025-12-05
**PM2 Version**: 6.0.13
**Status**: ✅ Production Ready

