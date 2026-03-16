# SAP-Python Backend Service Management Guide

## 🚨 502 Bad Gateway Error - Root Cause & Prevention

### What Causes 502 Errors?

1. **Backend service not running** (most common)
2. **Wrong port configuration** in nginx
3. **Duplicate nginx configurations** causing conflicts
4. **Environment variable issues** (DEBUG=release)
5. **Database migration errors**

---

## ✅ Quick Fix Commands

### Check if backend is running:
```bash
systemctl status sap-backend.service
```

### Start/Restart backend:
```bash
sudo systemctl start sap-backend.service
sudo systemctl restart sap-backend.service
```

### Check nginx configuration:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### View backend logs:
```bash
sudo journalctl -u sap-backend.service -n 50 --no-pager
```

---

## 🔧 Service Configuration

### Backend Service Details:
- **Service Name:** `sap-backend.service`
- **Port:** `8004`
- **Process:** Gunicorn with 4 workers
- **User:** `www-data`
- **Working Directory:** `/var/www/SAP-Python/backend`
- **Environment File:** `/etc/sap-backend.env`

### Nginx Configuration:
- **Main Config:** `/etc/nginx/conf.d/athenas-host.conf`
- **Upstream:** `sap_backend` → `127.0.0.1:8004`
- **Domain:** `sap.athenas.co.in`

---

## 📋 Service Management Commands

### Enable service to start on boot:
```bash
sudo systemctl enable sap-backend.service
```

### Start service:
```bash
sudo systemctl start sap-backend.service
```

### Stop service:
```bash
sudo systemctl stop sap-backend.service
```

### Restart service:
```bash
sudo systemctl restart sap-backend.service
```

### Check service status:
```bash
sudo systemctl status sap-backend.service
```

### View real-time logs:
```bash
sudo journalctl -u sap-backend.service -f
```

---

## 🔍 Troubleshooting Steps

### Step 1: Check if backend is running
```bash
systemctl status sap-backend.service
ps aux | grep gunicorn | grep sap
```

### Step 2: Check if port 8004 is listening
```bash
sudo ss -tlnp | grep 8004
sudo lsof -i :8004
```

### Step 3: Test backend directly (bypass nginx)
```bash
curl http://127.0.0.1:8004/api/auth/services/active/
```

### Step 4: Check nginx configuration
```bash
sudo nginx -t
grep -r "sap_backend" /etc/nginx/
```

### Step 5: Check for port conflicts
```bash
sudo lsof -i :8004
```

### Step 6: View error logs
```bash
# Backend logs
sudo journalctl -u sap-backend.service -n 100 --no-pager

# Nginx logs
sudo tail -50 /var/log/nginx/error.log
sudo tail -50 /var/log/nginx/sap_access.log
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Port Already in Use
**Error:** `Port 8004 already in use`

**Solution:**
```bash
# Find process using port 8004
sudo lsof -ti:8004

# Kill the process
sudo kill -9 $(sudo lsof -ti:8004)

# Restart service
sudo systemctl restart sap-backend.service
```

### Issue 2: DEBUG Environment Variable Conflict
**Error:** `Invalid truth value: release`

**Solution:**
```bash
# Check environment
env | grep DEBUG

# Unset DEBUG
unset DEBUG

# Or update /etc/sap-backend.env
echo "DEBUG=False" | sudo tee -a /etc/sap-backend.env

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart sap-backend.service
```

### Issue 3: Migration Errors
**Error:** `No such migration: athens_sustainability.0006`

**Solution:**
```bash
cd /var/www/SAP-Python/backend
source venv/bin/activate
python manage.py migrate --fake-initial
python manage.py migrate
```

### Issue 4: Nginx Wrong Port
**Error:** `connect() failed (111: Connection refused) while connecting to upstream`

**Solution:**
```bash
# Check nginx upstream configuration
grep -r "sap_backend" /etc/nginx/

# Should show: server 127.0.0.1:8004;
# If it shows 8000, update the config:
sudo nano /etc/nginx/conf.d/athenas-host.conf

# Change:
# upstream sap_backend {
#     server 127.0.0.1:8004;
#     keepalive 16;
# }

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Issue 5: Duplicate Nginx Configurations
**Error:** `conflicting server name "sap.athenas.co.in"`

**Solution:**
```bash
# Find all configs with sap.athenas.co.in
grep -r "sap.athenas.co.in" /etc/nginx/sites-enabled/
grep -r "sap.athenas.co.in" /etc/nginx/conf.d/

# Remove duplicate (keep only conf.d version)
sudo rm /etc/nginx/sites-enabled/sap.athenas.co.in

# Reload nginx
sudo systemctl reload nginx
```

---

## 🔐 Password Reset for Service Users

### Reset single user password:
```bash
cd /var/www/SAP-Python/backend
source venv/bin/activate
python manage.py reset_service_user_password <unique_service_id> <new_password>
```

### Reset all finance users:
```bash
cd /var/www/SAP-Python
./reset_finance_passwords.sh
```

### Current Finance User Credentials:
- **Password:** `Finance@123`
- **Users:**
  - TC_Bharath_001 (bharath@athenas.co.in)
  - AS_Bharath_001 (bharath@athenas.co.in)
  - BKC_Harini_001 (bkconstruction202@gmail.com)
  - MAK47_harnin_001 (admin@athenas.co.in)
  - SE_Harini_001 (shamy.enterprises@gmail.com)
  - BKGE_Harini_001 (accounts@bkgreenenergy.com)

---

## 🚀 Startup Checklist

After server reboot or maintenance:

1. ✅ Check PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. ✅ Check Redis is running:
   ```bash
   sudo systemctl status redis-server
   ```

3. ✅ Start SAP backend:
   ```bash
   sudo systemctl start sap-backend.service
   ```

4. ✅ Start Celery workers:
   ```bash
   sudo systemctl start sap-celery.service
   sudo systemctl start sap-celery-beat.service
   ```

5. ✅ Check nginx:
   ```bash
   sudo systemctl status nginx
   ```

6. ✅ Test API:
   ```bash
   curl https://sap.athenas.co.in/api/auth/services/active/
   ```

---

## 📊 Monitoring Commands

### Check all SAP services:
```bash
systemctl list-units --type=service | grep sap
```

### Check resource usage:
```bash
# CPU and Memory
top -p $(pgrep -d',' -f sap-backend)

# Disk usage
df -h /var/www/SAP-Python
```

### Check database connections:
```bash
sudo -u postgres psql -d modernsap -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🔄 Deployment Workflow

### After code changes:

1. **Pull latest code:**
   ```bash
   cd /var/www/SAP-Python
   git pull origin main
   ```

2. **Update backend dependencies:**
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

4. **Collect static files:**
   ```bash
   python manage.py collectstatic --noinput
   ```

5. **Restart services:**
   ```bash
   sudo systemctl restart sap-backend.service
   sudo systemctl restart sap-celery.service
   sudo systemctl restart sap-celery-beat.service
   ```

6. **Update frontend:**
   ```bash
   cd /var/www/SAP-Python/frontend
   pnpm install
   pnpm build
   ```

7. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

---

## 📝 Important Files & Locations

### Configuration Files:
- Backend settings: `/var/www/SAP-Python/backend/sap_backend/settings.py`
- Environment variables: `/var/www/SAP-Python/backend/.env`
- Systemd service: `/etc/systemd/system/sap-backend.service`
- Systemd environment: `/etc/sap-backend.env`
- Nginx config: `/etc/nginx/conf.d/athenas-host.conf`

### Log Files:
- Backend logs: `journalctl -u sap-backend.service`
- Nginx access: `/var/log/nginx/sap_access.log`
- Nginx error: `/var/log/nginx/error.log`
- Celery logs: `journalctl -u sap-celery.service`

### Database:
- Database name: `modernsap`
- Access: `sudo -u postgres psql -d modernsap`

---

## 🆘 Emergency Recovery

### If everything is broken:

```bash
# Stop all services
sudo systemctl stop sap-backend.service
sudo systemctl stop sap-celery.service
sudo systemctl stop sap-celery-beat.service

# Clear any stuck processes
sudo pkill -f gunicorn
sudo pkill -f celery

# Check environment
cd /var/www/SAP-Python/backend
source venv/bin/activate
unset DEBUG

# Test Django
python manage.py check

# Start services one by one
sudo systemctl start sap-backend.service
sudo systemctl start sap-celery.service
sudo systemctl start sap-celery-beat.service

# Check status
systemctl status sap-backend.service
curl http://127.0.0.1:8004/api/auth/services/active/
```

---

## 📞 Quick Reference

### Service Status:
```bash
systemctl status sap-backend.service
```

### Restart Everything:
```bash
sudo systemctl restart sap-backend.service sap-celery.service sap-celery-beat.service nginx
```

### View Logs:
```bash
sudo journalctl -u sap-backend.service -f
```

### Test API:
```bash
curl https://sap.athenas.co.in/api/auth/services/active/
```

---

## ✅ Prevention Checklist

To avoid 502 errors in the future:

- [ ] Ensure `sap-backend.service` is enabled: `sudo systemctl enable sap-backend.service`
- [ ] Set DEBUG=False in `/etc/sap-backend.env`
- [ ] Remove duplicate nginx configs in sites-enabled
- [ ] Keep only one nginx config in `/etc/nginx/conf.d/athenas-host.conf`
- [ ] Verify upstream port is 8004 in nginx config
- [ ] Monitor service status regularly
- [ ] Set up monitoring/alerting for service downtime
- [ ] Document any custom changes to configurations

---

**Last Updated:** March 4, 2026
**Maintained By:** System Administrator
