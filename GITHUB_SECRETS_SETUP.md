# GitHub Secrets Setup

## Required Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

### 1. HOST
```
46.202.160.75
```

### 2. USERNAME
```
root
```

### 3. SSH_KEY
Generate SSH key pair:
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/sap_deploy_key
```

Copy the **private key** content:
```bash
cat ~/.ssh/sap_deploy_key
```
Paste this content as the `SSH_KEY` secret value.

### 4. Add Public Key to Server
Copy the public key to your server:
```bash
ssh-copy-id -i ~/.ssh/sap_deploy_key.pub root@46.202.160.75
```

Or manually:
```bash
ssh root@46.202.160.75
mkdir -p ~/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2E... your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## Test SSH Connection
```bash
ssh -i ~/.ssh/sap_deploy_key root@46.202.160.75
```

## Manual Deployment (Alternative)
If GitHub Actions fails, deploy manually:
```bash
ssh root@46.202.160.75 "cd /var/www/SAP-Python && git pull && cd backend && source venv/bin/activate && pip install -r requirements.txt && python manage.py migrate && systemctl restart gunicorn"
```