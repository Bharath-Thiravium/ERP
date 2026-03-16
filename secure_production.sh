#!/bin/bash

# SAP-Python Production Security Hardening Script
# This script applies security best practices for production deployment

set -e

# Configuration
PROJECT_DIR="/var/www/SAP-Python"
BACKEND_DIR="$PROJECT_DIR/backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[SECURITY] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

print_info "========================================="
print_info "  SAP-Python Security Hardening         "
print_info "========================================="

# 1. File Permissions
print_status "Setting secure file permissions..."
find $PROJECT_DIR -type f -name "*.py" -exec chmod 644 {} \;
find $PROJECT_DIR -type f -name "*.sh" -exec chmod 755 {} \;
find $PROJECT_DIR -type d -exec chmod 755 {} \;

# Secure sensitive files
chmod 600 $BACKEND_DIR/.env
chmod 600 $BACKEND_DIR/.env.production
chmod 700 $BACKEND_DIR/logs
chmod 700 $BACKEND_DIR/backups

# 2. Nginx Security Configuration
print_status "Configuring Nginx security headers..."
sudo tee /etc/nginx/conf.d/security.conf > /dev/null <<EOF
# Security Headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Hide Nginx version
server_tokens off;

# Rate limiting
limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=general:10m rate=5r/s;

# Connection limiting
limit_conn_zone \$binary_remote_addr zone=conn_limit_per_ip:10m;
limit_conn conn_limit_per_ip 20;

# Request size limits
client_max_body_size 10M;
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;

# Timeout settings
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;

# Buffer overflow protection
client_body_buffer_size 128k;
client_header_buffer_size 1k;
client_max_body_size 10m;
large_client_header_buffers 2 1k;
EOF

# 3. SSL/TLS Configuration
print_status "Configuring SSL/TLS security..."
sudo tee /etc/nginx/conf.d/ssl.conf > /dev/null <<EOF
# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
EOF

# 4. Fail2Ban Configuration
print_status "Installing and configuring Fail2Ban..."
sudo apt install -y fail2ban

sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

# Create custom Fail2Ban filters
sudo tee /etc/fail2ban/filter.d/nginx-limit-req.conf > /dev/null <<EOF
[Definition]
failregex = limiting requests, excess: .* by zone .*, client: <HOST>
ignoreregex =
EOF

sudo tee /etc/fail2ban/filter.d/nginx-botsearch.conf > /dev/null <<EOF
[Definition]
failregex = <HOST> .* "(GET|POST).*HTTP.*" (404|444) .*
ignoreregex =
EOF

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# 5. PostgreSQL Security
print_status "Hardening PostgreSQL..."
sudo -u postgres psql -c "ALTER SYSTEM SET log_statement = 'all';"
sudo -u postgres psql -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
sudo -u postgres psql -c "ALTER SYSTEM SET log_connections = on;"
sudo -u postgres psql -c "ALTER SYSTEM SET log_disconnections = on;"
sudo -u postgres psql -c "ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';"
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# 6. Redis Security
print_status "Hardening Redis..."
sudo tee -a /etc/redis/redis.conf > /dev/null <<EOF

# Security settings
bind 127.0.0.1
protected-mode yes
requirepass $(openssl rand -base64 32)
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG "CONFIG_$(openssl rand -hex 8)"
EOF

sudo systemctl restart redis-server

# 7. System Security
print_status "Applying system security settings..."

# Disable unused network protocols
echo "install dccp /bin/true" | sudo tee -a /etc/modprobe.d/blacklist-rare-network.conf
echo "install sctp /bin/true" | sudo tee -a /etc/modprobe.d/blacklist-rare-network.conf
echo "install rds /bin/true" | sudo tee -a /etc/modprobe.d/blacklist-rare-network.conf
echo "install tipc /bin/true" | sudo tee -a /etc/modprobe.d/blacklist-rare-network.conf

# Kernel security parameters
sudo tee /etc/sysctl.d/99-security.conf > /dev/null <<EOF
# IP Spoofing protection
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 1

# Ignore Directed pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# TCP SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Control buffer sizes
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
EOF

sudo sysctl -p /etc/sysctl.d/99-security.conf

# 8. Firewall Configuration
print_status "Configuring advanced firewall rules..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Rate limiting for SSH
sudo ufw limit ssh

# Enable firewall
sudo ufw --force enable

# 9. Log Monitoring
print_status "Setting up log monitoring..."
sudo tee /etc/logrotate.d/sap-python-security > /dev/null <<EOF
/var/log/auth.log
/var/log/syslog
/var/log/nginx/*.log
$BACKEND_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload nginx
        systemctl reload rsyslog
    endscript
}
EOF

# 10. Automated Security Updates
print_status "Configuring automated security updates..."
sudo apt install -y unattended-upgrades
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

sudo systemctl enable unattended-upgrades

# 11. Create security monitoring script
print_status "Creating security monitoring script..."
sudo tee /usr/local/bin/security-check.sh > /dev/null <<'EOF'
#!/bin/bash

# Security monitoring script
LOG_FILE="/var/log/security-check.log"

echo "[$(date)] Starting security check..." >> $LOG_FILE

# Check for failed login attempts
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l)
if [ $FAILED_LOGINS -gt 10 ]; then
    echo "[$(date)] WARNING: $FAILED_LOGINS failed login attempts detected" >> $LOG_FILE
fi

# Check for suspicious network connections
SUSPICIOUS_CONNECTIONS=$(netstat -tuln | grep -E ':22|:80|:443' | wc -l)
echo "[$(date)] Active connections on critical ports: $SUSPICIOUS_CONNECTIONS" >> $LOG_FILE

# Check disk usage
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$(date)] WARNING: Disk usage is at $DISK_USAGE%" >> $LOG_FILE
fi

# Check for rootkits (basic check)
if command -v rkhunter &> /dev/null; then
    rkhunter --check --skip-keypress --report-warnings-only >> $LOG_FILE 2>&1
fi

echo "[$(date)] Security check completed" >> $LOG_FILE
EOF

sudo chmod +x /usr/local/bin/security-check.sh

# Add to crontab
(sudo crontab -l 2>/dev/null; echo "0 */6 * * * /usr/local/bin/security-check.sh") | sudo crontab -

# 12. Install additional security tools
print_status "Installing additional security tools..."
sudo apt install -y \
    rkhunter \
    chkrootkit \
    lynis \
    aide \
    clamav \
    clamav-daemon

# Configure ClamAV
sudo freshclam
sudo systemctl enable clamav-daemon

# 13. Final security verification
print_status "Running security verification..."
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart fail2ban

print_status "========================================="
print_status "  Security Hardening Complete!          "
print_status "========================================="
print_info "Security measures applied:"
print_info "✓ File permissions secured"
print_info "✓ Nginx security headers configured"
print_info "✓ SSL/TLS hardened"
print_info "✓ Fail2Ban configured"
print_info "✓ Database security enhanced"
print_info "✓ Redis secured"
print_info "✓ System kernel parameters hardened"
print_info "✓ Firewall configured"
print_info "✓ Log monitoring setup"
print_info "✓ Automated security updates enabled"
print_info "✓ Security monitoring script created"
print_info "✓ Additional security tools installed"
print_status "========================================="

print_warning "Important: Please review and test all configurations"
print_warning "Run 'sudo lynis audit system' for additional security audit"