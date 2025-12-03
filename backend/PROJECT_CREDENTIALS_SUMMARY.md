# SAP PROJECT - CREDENTIALS SUMMARY

## MASTER ADMIN CREDENTIALS
- **Email**: ilaiaraja@gmail.com
- **Company Name**: athenas
- **Created**: 2025-09-27 05:39:30.879663+00:00
- **Last Login IP**: 127.0.0.1
- **Password**: [Hashed in database - use Django admin or reset functionality]

## COMPANY USERS

### Company: athena
- **Company Email**: athena@example.com
- **Status**: pending
- **User Email**: athenas@admin.com
- **First Login Completed**: False
- **Must Change Password**: False

### Company: ExampleTech Solutions
- **Company Email**: contact@exampletech.com
- **Status**: approved
- **User Email**: admin@example.com
- **First Login Completed**: True
- **Must Change Password**: False

## SERVICE USERS

### User 1: ilayar
- **Username**: ilayar
- **Email**: ilayar@athenas.co.in
- **Company**: ExampleTech Solutions
- **Service**: Finance Management
- **Unique Service ID**: EXMTS_ilayar_001
- **Role**: user
- **Active**: True

### User 2: hr
- **Username**: hr
- **Email**: hr@athenas.co.in
- **Company**: ExampleTech Solutions
- **Service**: Human Resources
- **Unique Service ID**: EXMTS_hr_001
- **Role**: user
- **Active**: True

## SERVICE PASSWORDS (ExampleTech Solutions)

### Finance Management
- **Service ID**: 1
- **Password**: yi1vy^GJgt2U
- **Unique Service IDs**: EXMTS_finance_001, EXMTS_testuser2_001, EXMTS_shelltest_001

### Human Resources
- **Service ID**: 2
- **Password**: 2*#yT4@&zc1F
- **Unique Service IDs**: EXMTS_hr_001

### Inventory Management
- **Service ID**: 3
- **Password**: rymEKJ0pCN^0
- **Unique Service IDs**: EXMTS_inventory_001

### Customer Relationship Management
- **Service ID**: 6
- **Password**: aSGs^HMeV$AT
- **Unique Service IDs**: EXMTS_crm_001

### Maintenance
- **Service ID**: 10
- **Password**: ffq9@n5ztMqL
- **Unique Service IDs**: N/A

## DATABASE CONFIGURATION
- **Database Name**: modernsap
- **Database User**: postgres
- **Database Password**: mango
- **Database Host**: localhost
- **Database Port**: 5432
- **Database Engine**: django.db.backends.postgresql

## SYSTEM CONFIGURATION
- **Debug Mode**: True
- **Secret Key**: local-dev-secret-key-for-development-only-not-for-production
- **Allowed Hosts**: localhost,127.0.0.1
- **CORS Origins**: http://localhost:3000
- **Redis URL**: redis://localhost:6379/0

## AVAILABLE SERVICES

1. **Finance Management** (finance) - Active
2. **Human Resources** (hr) - Active
3. **Inventory Management** (inventory) - Active
4. **Procurement** (procurement) - Active
5. **Manufacturing** (manufacturing) - Active
6. **Quality Management** (quality) - Active
7. **Maintenance** (maintenance) - Active
8. **Order Management** (orders) - Active
9. **Customer Relationship Management** (crm) - Active
10. **Analytics & Reporting** (analytics) - Active
11. **IoT Monitoring & SCADA** (iot) - Active
12. **sdsd** (asdsadd) - Active [Test service]
13. **new** (dsad) - Inactive [Test service]

## IMPORTANT NOTES

1. **Password Security**: All user passwords are hashed in the database and cannot be retrieved in plain text.
2. **Service Password Expiry**: Service passwords expire in 90 days from generation date (2025-10-15).
3. **Development Environment**: This is a development setup with DEBUG=True.
4. **Email Configuration**: Each company configures their own email service in Company Dashboard.
5. **Login Methods**:
   - Master Admin: Use email and password
   - Company Users: Use email and password
   - Service Users: Use Unique Service ID and service password

## ACCESS URLS
- **Backend API**: http://localhost:8000/
- **Admin Panel**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/schema/swagger-ui/
- **Frontend**: http://localhost:3000/ (if running)

## CREDENTIAL FILES LOCATION
- Service credentials are stored in: `/home/athenas/sap project/backend/scripts/service_credentials_exampletechsolutions.txt`
- Environment variables: `/home/athenas/sap project/backend/.env`

---
**Generated on**: $(date)
**Security Level**: Development Environment
**Last Updated**: December 1, 2025