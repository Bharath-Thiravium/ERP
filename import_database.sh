#!/bin/bash

# Database Import Script for SAP-Python Project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Database configuration
DB_NAME="modernsap"
DB_USER="postgres"
BACKUP_FILE="/home/$(whoami)/Downloads/sap_database_backup.sql"

# Alternative backup file locations to check
BACKUP_LOCATIONS=(
    "/home/$(whoami)/Downloads/sap_database_backup.sql"
    "C:/Users/bhara/Downloads/sap_database_backup.sql"
    "./sap_database_backup.sql"
    "/tmp/sap_database_backup.sql"
)

print_status "SAP Database Import Script"
echo "=================================="

# Find the backup file
FOUND_BACKUP=""
for location in "${BACKUP_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        FOUND_BACKUP="$location"
        print_success "Found backup file at: $location"
        break
    fi
done

if [ -z "$FOUND_BACKUP" ]; then
    print_error "Backup file not found in any of these locations:"
    for location in "${BACKUP_LOCATIONS[@]}"; do
        echo "  - $location"
    done
    echo ""
    read -p "Please enter the full path to your backup file: " CUSTOM_PATH
    if [ -f "$CUSTOM_PATH" ]; then
        FOUND_BACKUP="$CUSTOM_PATH"
        print_success "Using backup file: $CUSTOM_PATH"
    else
        print_error "File not found: $CUSTOM_PATH"
        exit 1
    fi
fi

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    print_status "Starting PostgreSQL service..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    sleep 2
fi

# Check if database exists, create if not
print_status "Checking if database '$DB_NAME' exists..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_warning "Database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Dropping existing database..."
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
        print_status "Creating new database..."
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    else
        print_status "Importing into existing database..."
    fi
else
    print_status "Creating database '$DB_NAME'..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
fi

# Import the backup
print_status "Importing database backup..."
print_status "This may take a few minutes depending on the backup size..."

# Check if backup is compressed
if [[ "$FOUND_BACKUP" == *.gz ]]; then
    print_status "Decompressing and importing gzipped backup..."
    if gunzip -c "$FOUND_BACKUP" | sudo -u postgres psql "$DB_NAME"; then
        print_success "Gzipped backup imported successfully!"
    else
        print_error "Failed to import gzipped backup"
        exit 1
    fi
elif [[ "$FOUND_BACKUP" == *.sql ]]; then
    print_status "Importing SQL backup..."
    if sudo -u postgres psql "$DB_NAME" < "$FOUND_BACKUP"; then
        print_success "SQL backup imported successfully!"
    else
        print_error "Failed to import SQL backup"
        exit 1
    fi
else
    print_error "Unsupported backup file format. Please use .sql or .sql.gz files."
    exit 1
fi

# Verify import
print_status "Verifying database import..."
TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$TABLE_COUNT" -gt 0 ]; then
    print_success "Database imported successfully! Found $TABLE_COUNT tables."
else
    print_warning "Database import completed but no tables found. This might be normal for an empty backup."
fi

# Set proper permissions (if needed)
print_status "Setting database permissions..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

print_success "Database import completed!"
echo ""
print_status "Database Details:"
echo "  - Database Name: $DB_NAME"
echo "  - Database User: $DB_USER"
echo "  - Tables Count: $TABLE_COUNT"
echo ""
print_status "You can now run the main setup script: ./setup_and_run.sh"