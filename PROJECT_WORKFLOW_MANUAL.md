# ᗩTᕼᙓᑎᗩ'𝔖 SAP SYSTEM - COMPLETE PROJECT WORKFLOW MANUAL

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [User Roles & Authentication](#user-roles--authentication)
4. [Complete User Workflows](#complete-user-workflows)
5. [Service Modules](#service-modules)
6. [Mobile Application](#mobile-application)
7. [Development Setup](#development-setup)
8. [Deployment Guide](#deployment-guide)
9. [Testing Procedures](#testing-procedures)
10. [Security Features](#security-features)
11. [API Documentation](#api-documentation)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 PROJECT OVERVIEW

**ᗩTᕼᙓᑎᗩ'𝔖** is a comprehensive Enterprise Resource Planning (ERP) system designed for modern businesses. It provides a complete suite of business management tools including Finance, HR, Inventory, CRM, and Analytics.

### Key Features:
- **Multi-tenant Architecture**: Each company has isolated data and services
- **Role-based Access Control**: Master Admin, Company Users, and Service Users
- **Advanced Security**: 2FA, IP restrictions, device fingerprinting, geolocation controls
- **Mobile Integration**: React Native app for employee attendance
- **AI-Enhanced Features**: Threat detection, performance analytics, automated screening
- **Indian Compliance**: GST, PF, ESI, TDS, and other statutory requirements

---

## 🏗️ SYSTEM ARCHITECTURE

### Technology Stack:

#### Backend:
- **Framework**: Django 5.2.6 with Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: JWT with SimpleJWT
- **Real-time**: Django Channels with Redis
- **Task Queue**: Celery with Redis broker
- **File Storage**: Local/Cloud storage support
- **Security**: Advanced encryption, rate limiting, SQL injection protection

#### Frontend:
- **Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **UI Components**: Ant Design + Custom components
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios with React Query

#### Mobile App:
- **Framework**: React Native 0.81.4
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Camera**: React Native Vision Camera
- **Location**: React Native Geolocation

### Project Structure:
```
sap project/
├── backend/                    # Django backend
│   ├── sap_backend/           # Main Django project
│   ├── authentication/        # User management & security
│   ├── finance/              # Finance management
│   ├── hr/                   # Human resources
│   ├── inventory/            # Inventory management
│   ├── crm/                  # Customer relationship management
│   ├── analytics/            # Analytics & reporting
│   ├── company_dashboard/    # Company dashboard features
│   ├── notifications/        # Real-time notifications
│   ├── ai_assistant/         # AI features
│   └── configuration/        # System configuration
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   └── utils/           # Utility functions
└── EmployeeAttendanceApp/    # React Native mobile app
    ├── src/
    │   ├── screens/         # Mobile screens
    │   ├── components/      # Mobile components
    │   ├── services/        # Mobile services
    │   └── store/           # Mobile state management
```

---

## 👥 USER ROLES & AUTHENTICATION

### 1. Master Admin
**Purpose**: System administrator who manages companies and services
**Capabilities**:
- Create and manage companies
- Assign services to companies
- Monitor system-wide analytics
- Manage security settings
- Reset passwords and credentials

### 2. Company User
**Purpose**: Company administrator who manages their organization
**Capabilities**:
- Complete company profile information
- Create service users for different modules
- Access company dashboard
- Manage company settings
- View analytics and reports

### 3. Service User
**Purpose**: End users who work with specific business modules
**Capabilities**:
- Access assigned service modules (Finance, HR, etc.)
- Perform business operations
- Generate reports
- Manage data within their service scope

### 4. Employee (Mobile App)
**Purpose**: Employees using mobile app for attendance
**Capabilities**:
- Mark attendance with face recognition
- View attendance history
- Check work schedules
- Access employee profile

---

## 🔄 COMPLETE USER WORKFLOWS

### Master Admin Workflow

#### 1. Initial System Setup
```
1. Master Admin Login → 2FA Verification → Dashboard
2. Create Company → Fill Basic Details → Assign Services
3. Generate Company Credentials → Save to File
4. Monitor Company Approval Status
```

#### 2. Company Management
```
1. View All Companies → Filter/Search
2. Approve/Reject Company Applications
3. Manage Service Assignments
4. Reset Company Passwords
5. View System Analytics
```

#### 3. Security Management
```
1. Configure IP Restrictions
2. Monitor Security Logs
3. Manage 2FA Settings
4. Review Threat Detection Alerts
```

### Company User Workflow

#### 1. First-Time Setup
```
1. Receive Credentials from Master Admin
2. Login → Password Change Required
3. Complete Company Profile:
   - Business Information
   - Tax Details (GST, PAN)
   - Banking Information
   - Upload Company Logo
4. Submit for Approval
5. Wait for Master Admin Approval
```

#### 2. Service User Management
```
1. Access Company Dashboard
2. Navigate to Service Management
3. Create Service Users:
   - Select Service (Finance, HR, etc.)
   - Enter User Details
   - Assign Role (Admin, Manager, User)
   - Generate Credentials
4. Manage User Permissions
5. Monitor User Activity
```

#### 3. Daily Operations
```
1. Login → Dashboard Overview
2. View Key Metrics
3. Access Service Modules
4. Review Notifications
5. Generate Reports
```

### Service User Workflow

#### 1. Service Access
```
1. Login with Service Credentials
2. Password Change (if required)
3. Access Service Dashboard
4. Navigate to Functional Areas
```

#### 2. Finance Service Workflow
```
1. Customer Management:
   - Create Customer → Enter Details → Save
   - Manage Shipping Addresses
   - Update Tax Information

2. Product/Service Management:
   - Create Products → Set HSN/SAC Codes → Configure Pricing
   - Manage Inventory (if applicable)

3. Quotation Process:
   - Create Quotation → Add Items → Calculate Totals
   - Send to Customer → Track Status

4. Purchase Order Management:
   - Convert Quotation to PO → Upload PO File
   - Track PO Status → Manage Claiming

5. Invoice Generation:
   - Create Proforma Invoice (Advance)
   - Create Tax Invoice (Final)
   - Track Payment Status

6. Payment Processing:
   - Record Payments → Link to Invoices
   - Handle TDS Calculations
   - Generate Payment Reports
```

#### 3. HR Service Workflow
```
1. Employee Management:
   - Create Employee → Enter Personal Details
   - Set Department/Designation → Configure Salary
   - Upload Documents → Enable Mobile Access

2. Attendance System:
   - Configure Attendance Settings
   - Set Geo-fencing Parameters
   - Enable Face Recognition
   - Monitor Daily Attendance

3. Payroll Processing:
   - Create Payroll Cycle → Calculate Salaries
   - Review Payslips → Approve Payments
   - Generate Statutory Reports
   - Process Bank Transfers

4. Leave Management:
   - Configure Leave Types → Set Policies
   - Process Leave Applications
   - Maintain Leave Balances

5. Performance Management:
   - Conduct Performance Reviews
   - Set Goals and KPIs
   - Generate Performance Reports
```

### Employee Mobile App Workflow

#### 1. App Setup
```
1. Download App → Install
2. Login with Employee ID → Password
3. Enable Camera Permissions
4. Enable Location Permissions
5. Complete Profile Setup
```

#### 2. Daily Attendance
```
1. Open App → Navigate to Attendance
2. Check-in Process:
   - Verify Location (GPS)
   - Capture Face Photo
   - Face Recognition Verification
   - Confirm Check-in
3. Check-out Process:
   - Similar to Check-in
   - Calculate Work Hours
   - Submit Attendance
```

#### 3. Attendance History
```
1. View Monthly Calendar
2. Check Attendance Status
3. View Work Hours Summary
4. Download Attendance Reports
```

---

## 🛠️ SERVICE MODULES

### 1. Finance Module

#### Core Features:
- **Customer Management**: Complete customer profiles with GST compliance
- **Product/Service Catalog**: HSN/SAC code integration
- **Quotation System**: Professional quote generation
- **Purchase Order Management**: PO tracking and claiming
- **Invoice Generation**: Proforma and Tax invoices
- **Payment Processing**: TDS handling and payment tracking
- **GST Compliance**: Automated tax calculations
- **Financial Reports**: Comprehensive reporting suite

#### Key Workflows:
1. **Quote-to-Cash Process**:
   ```
   Customer Creation → Product Setup → Quotation → PO Conversion → 
   Proforma Invoice → Payment → Tax Invoice → Final Payment
   ```

2. **Advanced PO Claiming**:
   ```
   PO Creation → Percentage/Quantity-based Claiming → 
   Proforma Generation → Tax Invoice Creation → Balance Tracking
   ```

### 2. HR Module

#### Core Features:
- **Employee Lifecycle Management**: Hire to retire process
- **Attendance System**: Multi-modal attendance tracking
- **Payroll Processing**: Statutory compliant salary processing
- **Leave Management**: Comprehensive leave policies
- **Performance Management**: AI-enhanced reviews
- **Recruitment**: AI-powered candidate screening
- **Statutory Compliance**: PF, ESI, TDS, PT compliance

#### Key Workflows:
1. **Employee Onboarding**:
   ```
   Job Posting → Application Screening → Interview → 
   Offer → Acceptance → Employee Creation → Document Collection
   ```

2. **Payroll Cycle**:
   ```
   Attendance Calculation → Salary Computation → 
   Statutory Deductions → Approval → Payment Processing → Reports
   ```

### 3. Inventory Module

#### Core Features:
- **Stock Management**: Real-time inventory tracking
- **Warehouse Management**: Multi-location support
- **Purchase Management**: Vendor and PO management
- **Stock Movements**: Transfer and adjustment tracking
- **Aging Analysis**: Inventory aging reports
- **Barcode Integration**: Barcode scanning support

### 4. CRM Module

#### Core Features:
- **Lead Management**: Lead capture and nurturing
- **Customer Relationship**: 360-degree customer view
- **Sales Pipeline**: Opportunity tracking
- **Marketing Automation**: Campaign management
- **Customer Support**: Ticket management
- **Analytics**: Sales performance metrics

### 5. Analytics Module

#### Core Features:
- **Real-time Dashboards**: Live business metrics
- **Custom Reports**: Drag-and-drop report builder
- **Data Visualization**: Charts and graphs
- **Predictive Analytics**: AI-powered insights
- **Performance Metrics**: KPI tracking
- **Export Capabilities**: Multiple format support

---

## 📱 MOBILE APPLICATION

### Employee Attendance App

#### Features:
- **Secure Login**: Employee ID and password authentication
- **Face Recognition**: AI-powered face matching
- **GPS Verification**: Location-based attendance
- **Offline Support**: Works without internet connection
- **Attendance History**: View past records
- **Profile Management**: Update personal information

#### Technical Implementation:
- **Camera Integration**: React Native Vision Camera
- **Face Recognition**: Custom face matching algorithm
- **Location Services**: React Native Geolocation
- **Offline Storage**: AsyncStorage for local data
- **API Integration**: Axios for backend communication

#### Workflow:
```
1. Employee Login → Credentials Verification
2. Check-in Request → Location Verification → Face Capture → 
   Face Recognition → Attendance Recorded
3. Work Day Activities → Break Management
4. Check-out Request → Similar Verification Process
5. Data Sync → Server Update → Confirmation
```

---

## 💻 DEVELOPMENT SETUP

### Prerequisites:
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- Git

### Backend Setup:
```bash
# Clone repository
git clone <repository-url>
cd "sap project/backend"

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Database setup
createdb modernsap
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver

# Start Celery (separate terminal)
celery -A sap_backend worker -l info

# Start Celery Beat (separate terminal)
celery -A sap_backend beat -l info
```

### Frontend Setup:
```bash
cd "sap project/frontend"

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

### Mobile App Setup:
```bash
cd "sap project/EmployeeAttendanceApp"

# Install dependencies
npm install

# iOS setup (Mac only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios
```

### Environment Configuration:

#### Backend (.env):
```env
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=modernsap
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

#### Frontend (.env):
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

---

## 🚀 DEPLOYMENT GUIDE

### Production Deployment

#### Server Requirements:
- **CPU**: 4+ cores
- **RAM**: 8GB+ 
- **Storage**: 100GB+ SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

#### Backend Deployment:
```bash
# Install system dependencies
sudo apt update
sudo apt install python3-pip python3-venv postgresql redis-server nginx

# Setup application
git clone <repository-url>
cd "sap project/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure PostgreSQL
sudo -u postgres createdb modernsap
sudo -u postgres createuser sapuser
sudo -u postgres psql -c "ALTER USER sapuser PASSWORD 'secure-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE modernsap TO sapuser;"

# Run migrations
python manage.py migrate
python manage.py collectstatic

# Setup Gunicorn
pip install gunicorn
gunicorn sap_backend.wsgi:application --bind 0.0.0.0:8000

# Setup Nginx
sudo nano /etc/nginx/sites-available/sap-backend
# Configure reverse proxy

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Frontend Deployment:
```bash
cd "sap project/frontend"
npm install
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/html/
```

#### Mobile App Deployment:
```bash
# Android
cd "sap project/EmployeeAttendanceApp"
npx react-native build-android --mode=release

# iOS (Mac only)
npx react-native build-ios --mode=Release
```

### Docker Deployment:
```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: modernsap
      POSTGRES_USER: sapuser
      POSTGRES_PASSWORD: secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      - DEBUG=False
      - DB_HOST=db
      - REDIS_URL=redis://redis:6379/0

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 🧪 TESTING PROCEDURES

### Backend Testing:
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test authentication
python manage.py test finance
python manage.py test hr

# Coverage report
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Frontend Testing:
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Component testing
npm run test:components
```

### Mobile App Testing:
```bash
# Unit tests
npm test

# iOS testing
npm run test:ios

# Android testing
npm run test:android
```

### Manual Testing Checklist:

#### Authentication Flow:
- [ ] Master Admin login with 2FA
- [ ] Company User registration and approval
- [ ] Service User creation and login
- [ ] Password reset functionality
- [ ] Session management

#### Finance Module:
- [ ] Customer creation with GST validation
- [ ] Product/Service setup with HSN/SAC codes
- [ ] Quotation generation and PDF export
- [ ] PO conversion and file upload
- [ ] Proforma invoice creation
- [ ] Tax invoice generation
- [ ] Payment recording with TDS
- [ ] Financial reports generation

#### HR Module:
- [ ] Employee onboarding process
- [ ] Attendance marking (web and mobile)
- [ ] Payroll calculation and processing
- [ ] Leave application and approval
- [ ] Performance review process
- [ ] Statutory report generation

#### Mobile App:
- [ ] Employee login
- [ ] Face recognition accuracy
- [ ] GPS location verification
- [ ] Offline functionality
- [ ] Data synchronization

---

## 🔒 SECURITY FEATURES

### Authentication & Authorization:
- **JWT Tokens**: Secure token-based authentication
- **2FA Support**: TOTP-based two-factor authentication
- **Role-based Access**: Granular permission system
- **Session Management**: Secure session handling

### Advanced Security:
- **IP Restrictions**: Whitelist/blacklist IP addresses
- **Device Fingerprinting**: Track and manage devices
- **Geolocation Controls**: Location-based access control
- **Rate Limiting**: Prevent brute force attacks
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **CSRF Protection**: Cross-site request forgery prevention

### Data Protection:
- **Encryption**: Sensitive data encryption
- **Secure File Upload**: File type and size validation
- **Audit Logging**: Comprehensive activity logs
- **Data Backup**: Automated backup system

### Compliance:
- **GDPR Ready**: Data privacy compliance
- **Indian IT Act**: Local compliance requirements
- **Industry Standards**: Following security best practices

---

## 📚 API DOCUMENTATION

### Authentication Endpoints:
```
POST /api/auth/master-admin/login/     # Master admin login
POST /api/auth/company-user/login/     # Company user login
POST /api/auth/service-user/login/     # Service user login
POST /api/auth/token/refresh/          # Refresh JWT token
POST /api/auth/logout/                 # Logout
```

### Company Management:
```
GET    /api/auth/companies/            # List companies
POST   /api/auth/companies/            # Create company
GET    /api/auth/companies/{id}/       # Get company details
PUT    /api/auth/companies/{id}/       # Update company
DELETE /api/auth/companies/{id}/       # Delete company
```

### Finance Endpoints:
```
GET    /api/finance/customers/         # List customers
POST   /api/finance/customers/         # Create customer
GET    /api/finance/products/          # List products
POST   /api/finance/quotations/        # Create quotation
GET    /api/finance/invoices/          # List invoices
POST   /api/finance/payments/          # Record payment
```

### HR Endpoints:
```
GET    /api/hr/employees/              # List employees
POST   /api/hr/employees/              # Create employee
GET    /api/hr/attendance/             # Get attendance
POST   /api/hr/attendance/             # Mark attendance
GET    /api/hr/payroll/                # Payroll data
```

### Mobile API:
```
POST   /api/hr/mobile/login/           # Employee mobile login
POST   /api/hr/mobile/attendance/      # Mobile attendance
GET    /api/hr/mobile/profile/         # Employee profile
```

---

## 🔧 TROUBLESHOOTING

### Common Issues:

#### Backend Issues:
1. **Database Connection Error**:
   ```
   Solution: Check PostgreSQL service, credentials, and network connectivity
   ```

2. **Redis Connection Error**:
   ```
   Solution: Ensure Redis server is running and accessible
   ```

3. **Migration Errors**:
   ```
   Solution: Check for conflicting migrations, reset if necessary
   ```

#### Frontend Issues:
1. **API Connection Error**:
   ```
   Solution: Verify backend URL in environment variables
   ```

2. **Build Errors**:
   ```
   Solution: Clear node_modules, reinstall dependencies
   ```

#### Mobile App Issues:
1. **Camera Permission Denied**:
   ```
   Solution: Check app permissions in device settings
   ```

2. **Face Recognition Not Working**:
   ```
   Solution: Ensure good lighting, clear face visibility
   ```

3. **GPS Location Error**:
   ```
   Solution: Enable location services, check permissions
   ```

### Performance Optimization:
- **Database Indexing**: Ensure proper indexes on frequently queried fields
- **Query Optimization**: Use select_related and prefetch_related
- **Caching**: Implement Redis caching for frequently accessed data
- **Static Files**: Use CDN for static file delivery
- **Image Optimization**: Compress and resize images

### Monitoring:
- **Error Logging**: Monitor application logs
- **Performance Metrics**: Track response times and resource usage
- **Security Monitoring**: Monitor failed login attempts and suspicious activities
- **Database Performance**: Monitor query performance and connection pools

---

## 📞 SUPPORT & MAINTENANCE

### Regular Maintenance Tasks:
- **Database Backup**: Daily automated backups
- **Log Rotation**: Weekly log cleanup
- **Security Updates**: Monthly security patches
- **Performance Review**: Quarterly performance analysis

### Support Channels:
- **Technical Documentation**: Comprehensive API and user guides
- **Issue Tracking**: GitHub issues or internal ticketing system
- **User Training**: Regular training sessions for new features
- **24/7 Support**: Critical issue support availability

---

## 🎯 CONCLUSION

This manual provides a complete overview of the ᗩTᕼᙓᑎᗩ'𝔖 SAP System workflow. The system is designed to be scalable, secure, and user-friendly while maintaining compliance with Indian business regulations.

For any questions or additional support, please refer to the specific module documentation or contact the development team.

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintained By**: ᗩTᕼᙓᑎᗩ'𝔖 Development Team