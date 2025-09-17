#!/bin/bash

# Quick deployment commands for server 46.202.160.75

# Upload and run setup
scp production-setup.sh root@46.202.160.75:/root/
ssh root@46.202.160.75 "chmod +x /root/production-setup.sh && /root/production-setup.sh"

# Upload project files
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='__pycache__' . root@46.202.160.75:/var/www/SAP-Python/

# Run deployment
ssh root@46.202.160.75 "cd /var/www/SAP-Python && ./deploy.sh production"