# SAP System Deployment Guide

This guide covers deployment for both local development and Hostinger VPS production environments.

## 🏠 Local Development Setup

### Prerequisites
- Python 3.8+
- PostgreSQL
- Redis
- Git

### Quick Setup
```bash
# Clone the repository
git clone https://github.com/your-username/sap-project.git
cd sap-project

# Backend setup
cd backend
chmod +x scripts/local_setup.sh
./scripts/local_setup.sh

# Frontend setup
cd ../frontend
pnpm install
pnpm run dev

# Start backend
cd ../backend
source venv/bin/activate
python manage.py runserver
```

### Manual Local Setup
```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.local .env
python manage.py migrate
python manage.py runserver

# Frontend (in another terminal)
cd frontend
pnpm install
pnpm run dev
```

## 🚀 Production Deployment (Hostinger VPS)

### Server Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python, PostgreSQL, Redis, Nginx
sudo apt install python3 python3-pip python3-venv postgresql postgresql-contrib redis-server nginx git -y

# Install Node.js for frontend
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm
```

### Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE modernsap;
CREATE USER postgres WITH PASSWORD 'mango';
GRANT ALL PRIVILEGES ON DATABASE modernsap TO postgres;
\q
```

### Deployment Steps

#### 1. Clone Repository
```bash
cd /var/www
sudo git clone https://github.com/your-username/sap-project.git
sudo chown -R $USER:$USER /var/www/sap-project
cd /var/www/sap-project
```

#### 2. Backend Deployment
```bash
cd backend
chmod +x scripts/production_deploy.sh
./scripts/production_deploy.sh

# Update .env with production values
nano .env
```

#### 3. Frontend Deployment
```bash
cd ../frontend
pnpm install
pnpm run build

# Copy build to nginx directory
sudo cp -r dist/* /var/www/html/
```

#### 4. Nginx Configuration
```bash
# Copy nginx config
sudo cp backend/config/nginx.conf /etc/nginx/sites-available/sap-backend
sudo ln -s /etc/nginx/sites-available/sap-backend /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. SSL Certificate (Optional but Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🔄 GitHub Workflow

### Development Workflow
1. **Local Development**
   ```bash
   git checkout -b feature/your-feature
   # Make changes
   git add .
   git commit -m "Add your feature"
   git push origin feature/your-feature
   ```

2. **Create Pull Request**
   - Go to GitHub
   - Create PR from your branch to main
   - Wait for tests to pass

3. **Merge to Main**
   - Merge PR
   - Automatic deployment to production (if configured)

### Manual Production Update
```bash
# On your VPS
cd /var/www/sap-project
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart sap-backend

# Update frontend
cd ../frontend
pnpm install
pnpm run build
sudo cp -r dist/* /var/www/html/

# Restart services
sudo systemctl restart nginx
```

## 🔧 Environment Configuration

### Local (.env.local)
```env
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Production (.env.production)
```env
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
SECRET_KEY=your-super-secret-key
```

## 📊 Monitoring & Maintenance

### Check Service Status
```bash
# Backend service
sudo systemctl status sap-backend

# View logs
sudo journalctl -u sap-backend -f

# Nginx status
sudo systemctl status nginx
```

### Database Backup
```bash
# Create backup
pg_dump -U postgres modernsap > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -U postgres modernsap < backup_file.sql
```

## 🚨 Troubleshooting

### Common Issues

1. **Static files not loading**
   ```bash
   python manage.py collectstatic --noinput
   sudo systemctl restart nginx
   ```

2. **Database connection error**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify credentials in .env file

3. **Permission errors**
   ```bash
   sudo chown -R $USER:$USER /var/www/sap-project
   sudo chmod -R 755 /var/www/sap-project
   ```

## 🔗 URLs

### Local Development
- **Backend API:** http://127.0.0.1:8000/
- **Frontend:** http://localhost:3000/
- **Admin Panel:** http://127.0.0.1:8000/admin/

### Production
- **Backend API:** https://your-domain.com/api/
- **Frontend:** https://your-domain.com/
- **Admin Panel:** https://your-domain.com/admin/

## 📝 Notes

- Always test changes locally before deploying
- Keep your .env files secure and never commit them
- Regular database backups are recommended
- Monitor server resources and logs
- Update dependencies regularly for security
