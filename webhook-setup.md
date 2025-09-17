# Webhook Deployment Setup

## Overview
Automated deployment system for SAP-Python ERP using GitHub webhooks with Django backend integration.

## Features
- ✅ GitHub webhook validation with HMAC signature
- ✅ Automated git pull, migrate, collectstatic workflow
- ✅ Frontend build and deployment
- ✅ Service restart (Gunicorn, Nginx, PM2)
- ✅ Comprehensive audit logging
- ✅ Automatic rollback on failure
- ✅ Health checks and monitoring
- ✅ Admin interface for deployment history

## Setup Instructions

### 1. Configure GitHub Webhook
```
Repository Settings → Webhooks → Add webhook
- Payload URL: https://yourdomain.com/api/deploy/webhook/
- Content type: application/json
- Secret: your-github-webhook-secret-here
- Events: Just the push event
```

### 2. Update Environment Variables
```bash
# Add to .env file
WEBHOOK_SECRET=your-github-webhook-secret-here
```

### 3. Production Setup
```bash
# Make deploy script executable
chmod +x deploy.sh

# Update paths in deploy.sh
PROJECT_DIR="/var/www/SAP-Python"
```

### 4. Service Configuration

#### Gunicorn Service
```ini
# /etc/systemd/system/gunicorn.service
[Unit]
Description=Gunicorn instance to serve SAP-Python
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/SAP-Python/backend
Environment="PATH=/var/www/SAP-Python/backend/venv/bin"
ExecStart=/var/www/SAP-Python/backend/venv/bin/gunicorn --workers 3 --bind unix:/var/www/SAP-Python/backend/sap_backend.sock sap_backend.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/sap-python
server {
    listen 80;
    server_name yourdomain.com;

    location = /favicon.ico { access_log off; log_not_found off; }
    location /static/ {
        root /var/www/SAP-Python/backend;
    }
    location /media/ {
        root /var/www/SAP-Python/backend;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/SAP-Python/backend/sap_backend.sock;
    }
}
```

## API Endpoints

### Webhook Endpoint
```
POST /api/deploy/webhook/
- Receives GitHub webhook payload
- Validates signature
- Triggers deployment process
- Returns deployment ID
```

### Status Check
```
GET /api/deploy/status/{deployment_id}/
- Returns deployment status and logs
- Real-time progress monitoring
```

### Deployment History
```
GET /api/deploy/history/
- Lists recent deployments
- Status, commits, timestamps
- Audit trail
```

## Usage Examples

### Manual Deployment
```bash
# Local development
./deploy.sh local

# Staging environment
./deploy.sh staging

# Production deployment
./deploy.sh production
```

### Webhook Testing
```bash
# Test webhook locally
curl -X POST http://localhost:8000/api/deploy/webhook/ \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d @webhook-payload.json
```

### Check Deployment Status
```bash
# Get deployment status
curl http://localhost:8000/api/deploy/status/1/

# Get deployment history
curl http://localhost:8000/api/deploy/history/
```

## Security Features

1. **HMAC Signature Validation**: Verifies webhook authenticity
2. **Branch Filtering**: Only deploys main/master branch
3. **Audit Logging**: Complete deployment history
4. **Rollback Capability**: Automatic failure recovery
5. **Health Checks**: Post-deployment validation

## Monitoring & Logging

- Deployment logs: `/var/log/sap-deployment.log`
- Django admin: `/admin/deployment/deploymentlog/`
- Database audit trail with timestamps
- Error tracking and rollback logs

## Troubleshooting

### Common Issues
1. **Signature Validation Failed**: Check WEBHOOK_SECRET
2. **Git Pull Failed**: Verify repository permissions
3. **Migration Failed**: Check database connectivity
4. **Service Restart Failed**: Verify systemd permissions

### Debug Mode
```bash
# Enable verbose logging
export DEBUG=True
./deploy.sh local
```

## Production Checklist

- [ ] Configure GitHub webhook with correct URL and secret
- [ ] Update deploy.sh paths for production environment
- [ ] Set up Gunicorn and Nginx services
- [ ] Configure SSL certificate
- [ ] Set up database backups
- [ ] Test rollback functionality
- [ ] Monitor deployment logs
- [ ] Set up alerting for failed deployments