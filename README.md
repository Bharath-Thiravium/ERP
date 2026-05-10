# SAP-Python Project Setup Guide

This guide will help you set up and run both the frontend and backend of the SAP-Python project, including importing the database backup.

## Prerequisites

- Ubuntu/Linux system
- Python 3.8+
- Node.js 16+
- PostgreSQL
- Git

## Quick Start

### Option 1: Complete Setup (Recommended)
Run this single command to set up everything and start all services:

```bash
./setup_and_run.sh
```

This script will:
- Set up Python virtual environment
- Install all backend dependencies
- Set up PostgreSQL database
- Import database backup (if found)
- Install frontend dependencies
- Start Redis service
- Start Django backend server (port 8000)
- Start React frontend server (port 3000)
- Start Celery worker and beat scheduler

### Option 2: Import Database Only
If you only want to import the database backup:

```bash
./import_database.sh
```

### Option 3: Manual Setup

1. **Import Database First:**
   ```bash
   ./import_database.sh
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env file with your database credentials
   python manage.py migrate
   python manage.py runserver
   ```

3. **Setup Frontend (in new terminal):**
   ```bash
   cd frontend
   npm install -g pnpm  # if not installed
   pnpm install
   pnpm dev
   ```

## Database Backup Location

The scripts will look for your database backup file in these locations:
- `/home/$(whoami)/Downloads/sap_database_backup.sql`
- `C:/Users/bhara/Downloads/sap_database_backup.sql` (Windows path)
- `./sap_database_backup.sql` (current directory)
- `/tmp/sap_database_backup.sql`

If your backup file is in a different location, the import script will ask you to provide the path.

## Accessing the Application

After running the setup script, you can access:

- **Frontend (React):** http://localhost:3000
- **Backend API:** http://localhost:8004
- **Admin Panel:** http://localhost:8004/admin/
- **API Documentation:** http://localhost:8004/api/schema/swagger-ui/

## Restarting Services

### Quick Restart (Recommended)
To kill and restart both frontend and backend services:

```bash
./restart_services.sh
```

Or use the global command from anywhere:

```bash
sap-restart
```

This script will:
- Kill all backend processes (port 8004)
- Kill all frontend processes (port 3000)
- Kill Celery workers and beat scheduler
- Clear Python cache
- Restart backend on port 8004
- Restart Celery workers
- Restart frontend on port 3000

### Stopping Services

To stop all running services without restarting:

```bash
./stop_services.sh
```

## Troubleshooting

### Common Issues:

1. **PostgreSQL not running:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Redis not running:**
   ```bash
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   ```

3. **Port already in use:**
   ```bash
   # Use the restart script to kill and restart all services
   ./restart_services.sh
   
   # Or manually kill processes
   lsof -ti:3000 | xargs kill -9  # Frontend
   lsof -ti:8004 | xargs kill -9  # Backend
   ```

4. **Permission denied on scripts:**
   ```bash
   chmod +x *.sh
   ```

5. **Database connection error:**
   - Check your `.env` file in the backend directory
   - Ensure PostgreSQL is running
   - Verify database credentials

### Environment Variables

Edit `backend/.env` file to configure:
- Database credentials
- Email settings
- Security settings
- Redis URL

## Project Structure

```
SAP-Python/
├── backend/          # Django REST API
├── frontend/         # React application
├── EmployeeAttendanceApp/  # React Native mobile app
├── setup_and_run.sh  # Main setup script
├── import_database.sh # Database import script
├── stop_services.sh  # Stop all services
└── README.md         # This file
```

## Development

For development, you can run services individually:

**Backend:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
pnpm dev
```

**Celery (for background tasks):**
```bash
cd backend
source venv/bin/activate
celery -A sap_backend worker --loglevel=info
```

## Support

If you encounter any issues:
1. Check the logs in the terminal where you ran the setup script
2. Ensure all prerequisites are installed
3. Verify your database backup file exists and is accessible
4. Check that all required ports (3000, 8000) are available

## Features

This SAP-Python system includes:
- **Finance Module:** Invoicing, payments, quotations, purchase orders, **direct customer payments**, **TDS-only payments**
- **HR Module:** Employee management, payroll, attendance, recruitment
- **Inventory Module:** Stock management, product catalog, warehouses
- **CRM Module:** Customer relationship management, leads, opportunities
- **Analytics:** Business intelligence and reporting
- **Security:** Multi-factor authentication, role-based access control

### New: Direct Customer Payment Feature

Record payments from customers without requiring an invoice - perfect for:
- Memos (debit/credit)
- Penalties
- Incentives
- Complimentary payments
- Any miscellaneous customer payments

**Setup:**
```bash
./setup_direct_payment.sh
```

**Documentation:**
- Full Guide: `DIRECT_PAYMENT_FEATURE.md`
- Quick Reference: `DIRECT_PAYMENT_QUICK_REFERENCE.md`
- Implementation: `DIRECT_PAYMENT_IMPLEMENTATION.md`

### New: TDS-Only Payment Feature

Record TDS (Tax Deducted at Source) payments separately and in advance - perfect for:
- Advance TDS payments by customers
- Split TDS and main payments
- Quarterly TDS payments
- Better TDS compliance and tracking

**Key Benefits:**
- ✅ Record TDS independently from the TDS tab
- ✅ No dependency on cash payment
- ✅ Simple and straightforward
- ✅ Real-world business compliance
- ✅ Accurate TDS tracking and audit trail

**How to Use:**
1. Open invoice payment modal
2. Go to **TDS tab**
3. Click "Add TDS Entry"
4. Enter TDS amount and challan number
5. Click "Save TDS Entry"
6. Done! TDS recorded independently

**Documentation:**
- Simple Guide: `TDS_SIMPLE_FIX.md` ⭐ **START HERE**
- Full Guide: `TDS_ONLY_PAYMENT_FEATURE.md`
- Quick Reference: `TDS_ONLY_PAYMENT_QUICK_REFERENCE.md`