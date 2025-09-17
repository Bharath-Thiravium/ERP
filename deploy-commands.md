# Production Deployment Commands

## Quick Setup (One Command)
```bash
ssh root@46.202.160.75 'bash -s' < server-setup.sh
```

## Manual Setup Steps

### 1. Connect to Server
```bash
ssh root@46.202.160.75
```

### 2. Clone Repository
```bash
cd /var/www
git clone https://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@github.com/Bharath-Thiravium/SAP-Python.git SAP-Python
cd SAP-Python
```

### 3. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python scripts/create_services.py
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install -g pnpm
pnpm install
pnpm run build
```

### 5. Start Services
```bash
systemctl start gunicorn nginx
systemctl enable gunicorn nginx
```

## Update Deployment
```bash
ssh root@46.202.160.75 "cd /var/www/SAP-Python && git pull && cd backend && source venv/bin/activate && pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput && cd ../frontend && pnpm install && pnpm run build && systemctl restart gunicorn nginx"
```

## Access URLs
- **Admin Panel**: http://46.202.160.75/admin/
- **API Docs**: http://46.202.160.75/api/
- **Webhook**: http://46.202.160.75/api/deploy/webhook/