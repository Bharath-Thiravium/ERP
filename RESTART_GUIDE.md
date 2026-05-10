# SAP-Python Service Restart Guide

## Quick Restart Commands

### Option 1: From Project Directory
```bash
cd /var/www/SAP-Python
./restart_services.sh
```

### Option 2: From Anywhere (Global Command)
```bash
sap-restart
```

## What the Script Does

1. **Stops all services:**
   - Stops systemd services (sap-backend, sap-frontend)
   - Kills all processes on port 8004 (Backend)
   - Kills all processes on port 3000 (Frontend)
   - Kills Uvicorn, Gunicorn, Django runserver processes
   - Kills Vite, PNPM, NPM dev processes
   - Kills Celery workers and beat scheduler

2. **Cleans up:**
   - Clears Python __pycache__ directories
   - Removes .pyc files
   - Waits for ports to be free

3. **Restarts services:**
   - Starts Backend on port 8004 (via systemd or uvicorn)
   - Starts Celery worker (4 concurrent workers)
   - Starts Celery beat scheduler
   - Starts Frontend on port 3000 (via systemd or pnpm)

4. **Verifies:**
   - Checks if backend is running on port 8004
   - Checks if frontend is running on port 3000
   - Shows service URLs and log locations

## Service URLs

After restart, access:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8004
- **API Docs:** http://localhost:8004/api/schema/swagger-ui/
- **Admin Panel:** http://localhost:8004/admin/

## View Logs

```bash
# Backend logs
tail -f /var/www/SAP-Python/backend/backend.log

# Frontend logs
tail -f /var/www/SAP-Python/frontend/frontend.log

# Celery worker logs
tail -f /var/www/SAP-Python/backend/celery_worker.log

# Celery beat logs
tail -f /var/www/SAP-Python/backend/celery_beat.log

# Systemd service logs
sudo journalctl -u sap-backend -f
```

## Manual Service Control

### Backend Only
```bash
sudo systemctl restart sap-backend
sudo systemctl status sap-backend
```

### Stop All Services
```bash
cd /var/www/SAP-Python
./stop_services.sh
```

### Kill Specific Port
```bash
# Kill backend (port 8004)
lsof -ti:8004 | xargs kill -9

# Kill frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

## Troubleshooting

### Script fails with "Port already in use"
Run the script again - it will kill the processes on the second run.

### Backend/Frontend not starting
Check the logs:
```bash
tail -50 /var/www/SAP-Python/backend/backend.log
tail -50 /var/www/SAP-Python/frontend/frontend.log
```

### Permission denied
```bash
chmod +x /var/www/SAP-Python/restart_services.sh
```

### Services not found
The script works with or without systemd services. It will automatically detect and use the appropriate method.
