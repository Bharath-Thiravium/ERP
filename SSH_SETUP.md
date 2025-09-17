# SSH Deployment Setup

## Required GitHub Secrets

Add these secrets in your GitHub repository settings:

### 1. SSH_KEY
Generate SSH key pair on your local machine:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com"
```
- Copy the **private key** content to GitHub secret `SSH_KEY`
- Copy the **public key** to your server's `~/.ssh/authorized_keys`

### 2. HOST
```
46.202.160.75
```

### 3. USERNAME  
```
root
```

### 4. PORT (optional)
```
22
```

## Server Setup Commands

Run these on your server (46.202.160.75):

```bash
# Create project directory
mkdir -p /var/www/SAP-Python
cd /var/www/SAP-Python

# Clone repository
git clone https://github.com/Bharath-Thiravium/SAP-Python.git .

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with production values

# Run migrations
python manage.py migrate
python manage.py collectstatic --noinput

# Setup frontend
cd ../frontend
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
pnpm install
pnpm run build

# Setup services (if not already done)
sudo systemctl enable gunicorn nginx
```

## Test SSH Connection

```bash
ssh -i ~/.ssh/your_private_key root@46.202.160.75
```

## Manual Deployment

If SSH action fails, deploy manually:
```bash
ssh root@46.202.160.75 "cd /var/www/SAP-Python && git pull && cd backend && source venv/bin/activate && pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput && cd ../frontend && pnpm install && pnpm run build && sudo systemctl restart gunicorn nginx"
```