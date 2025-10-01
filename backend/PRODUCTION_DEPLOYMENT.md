# Production Deployment Guide for VPS Hostinger

## 1. Environment Configuration

Replace your VPS `.env` file with these production settings:

```bash
# Production Environment Configuration for VPS Hostinger
DEBUG=False
ENVIRONMENT=production
SECRET_KEY=your-super-secure-production-secret-key-here-change-this

# Database Configuration (Production PostgreSQL)
DB_NAME=modernsap_prod
DB_USER=postgres
DB_PASSWORD=your-production-db-password
DB_HOST=localhost
DB_PORT=5432

# Security Settings (Production)
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,your-server-ip
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Static and Media Files (Production Paths)
STATIC_ROOT=/var/www/sap-backend/static/
MEDIA_ROOT=/var/www/sap-backend/media/

# JWT Token Configuration (Production - Shorter lifetimes for security)
JWT_ACCESS_TOKEN_LIFETIME=30
JWT_REFRESH_TOKEN_LIFETIME=720

# Redis Configuration (Production)
REDIS_URL=redis://localhost:6379/0

# Email Encryption Key (Generate new secure key for production)
EMAIL_ENCRYPTION_KEY=generate-new-secure-key-for-production

# Backup Directory (Production)
BACKUP_DIR=/var/backups/sap-backend/

# Daphne/ASGI Configuration
ASGI_THREADS=4
```

## 2. Replace Django runserver with Daphne

### Install Daphne (if not already installed):
```bash
pip install daphne
```

### Start Daphne Server:
```bash
# Instead of: python manage.py runserver
# Use:
daphne -b 0.0.0.0 -p 8000 sap_backend.asgi:application

# For production with more workers:
daphne -b 0.0.0.0 -p 8000 --workers 4 sap_backend.asgi:application
```

### Create Systemd Service (Recommended for Production):
```bash
sudo nano /etc/systemd/system/sap-backend.service
```

Add this content:
```ini
[Unit]
Description=SAP Backend Daphne Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/your/sap-backend
Environment=PATH=/path/to/your/venv/bin
ExecStart=/path/to/your/venv/bin/daphne -b 0.0.0.0 -p 8000 --workers 4 sap_backend.asgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sap-backend
sudo systemctl start sap-backend
```

## 3. Nginx Configuration

Update your Nginx config to handle WebSocket connections:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Static files
    location /static/ {
        alias /var/www/sap-backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/sap-backend/media/;
        expires 7d;
    }

    # WebSocket connections
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API requests
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4. Security Checklist

1. **Generate New Secret Key**:
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

2. **Generate Email Encryption Key**:
```python
from cryptography.fernet import Fernet
print(Fernet.generate_key())
```

3. **Create Required Directories**:
```bash
sudo mkdir -p /var/www/sap-backend/static/
sudo mkdir -p /var/www/sap-backend/media/
sudo mkdir -p /var/backups/sap-backend/
sudo chown -R www-data:www-data /var/www/sap-backend/
sudo chown -R www-data:www-data /var/backups/sap-backend/
```

4. **Collect Static Files**:
```bash
python manage.py collectstatic --noinput
```

5. **Run Migrations**:
```bash
python manage.py migrate
```

## 5. Frontend Configuration

Update your frontend `.env` file to point to production backend:

```bash
REACT_APP_API_URL=https://your-domain.com
REACT_APP_WS_URL=wss://your-domain.com/ws/
```

## 6. SSL Certificate (Recommended)

Install SSL certificate using Let's Encrypt:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 7. Monitoring Commands

Check Daphne service status:
```bash
sudo systemctl status sap-backend
sudo journalctl -u sap-backend -f
```

Check Nginx status:
```bash
sudo systemctl status nginx
sudo nginx -t
```

## 8. Key Changes from runserver to Daphne

- **WebSocket Support**: Daphne handles WebSocket connections for real-time features
- **Production Ready**: Better performance and stability than runserver
- **ASGI Support**: Full support for async Django features
- **Multiple Workers**: Can handle more concurrent connections

## 9. Troubleshooting

If you encounter issues:

1. Check logs: `sudo journalctl -u sap-backend -f`
2. Verify .env file permissions: `chmod 600 .env`
3. Ensure Redis is running: `sudo systemctl status redis`
4. Check database connectivity: `python manage.py dbshell`
5. Verify static files: `python manage.py collectstatic`