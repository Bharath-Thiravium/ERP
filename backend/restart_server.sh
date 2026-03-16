#!/bin/bash
pkill -9 -f "python3.*manage.py.*8000"
sleep 2
cd /var/www/SAP-Python/backend
unset DEBUG
nohup python3 manage.py runserver 0.0.0.0:8000 > /tmp/sap_server.log 2>&1 &
sleep 3
echo "Server restarted. Checking status..."
curl -s http://localhost:8000/api/auth/test-no-auth/ | head -5
