# Email Automation System

Complete email automation system for compliance reminders and payment notifications using company dashboard email configuration.

## Features

### ✅ Compliance Reminders
- **GST Filing Reminders**: Automatic reminders before GST filing due dates
- **TDS Filing Reminders**: Quarterly TDS filing deadline alerts
- **Compliance Alerts**: General compliance notifications

### ✅ Payment Notifications
- **Payment Due Reminders**: Alerts for upcoming invoice due dates
- **Invoice Overdue Notifications**: Alerts for overdue invoices
- **Custom Reminders**: Configurable custom notifications

### ✅ Advanced Features
- **Multi-recipient Support**: Company admin, finance users, custom emails
- **Template System**: Configurable email templates with variables
- **Scheduled Sending**: Automated scheduling (daily, weekly, monthly, quarterly)
- **Company Email Integration**: Uses existing company dashboard email configuration

## Architecture

### Backend Components
1. **EmailAutomationService** (`finance/email_automation_service.py`)
   - Core service for processing automations
   - Integrates with company email service
   - Handles all email types and scheduling

2. **Management Command** (`finance/management/commands/process_email_automations.py`)
   - Command-line interface for processing automations
   - Supports company-specific processing

3. **Celery Tasks** (`finance/tasks.py`)
   - Background task processing
   - Automated scheduling support

4. **API Views** (`finance/integration_views.py`)
   - CRUD operations for email automations
   - Test and trigger functionality

### Frontend Components
1. **EmailAutomationTab** (`components/EmailAutomationTab.tsx`)
   - Complete UI for managing email automations
   - Create, edit, delete, test, and trigger automations

## Setup Instructions

### 1. Database Migration
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 2. Configure Company Email Settings
1. Go to Company Dashboard → Email Settings
2. Configure SMTP or API-based email service
3. Test email configuration

### 3. Setup Automated Processing

#### Option A: Cron Jobs (Recommended)
```bash
# Run the setup script
python setup_email_automation_cron.py

# Or manually add to crontab:
crontab -e

# Add these lines:
0 * * * * cd /path/to/backend && python manage.py process_email_automations >> /var/log/email_automation.log 2>&1
0 */6 * * * cd /path/to/backend && python manage.py process_email_automations >> /var/log/email_automation_backup.log 2>&1
```

#### Option B: Celery (For Production)
```bash
# Start Celery worker
celery -A sap_backend worker -l info

# Start Celery beat for scheduling
celery -A sap_backend beat -l info
```

### 4. Test the System
```bash
# Run test script
python test_email_automation.py

# Manual command execution
python manage.py process_email_automations

# Process specific company
python manage.py process_email_automations --company-id=1
```

## Usage

### Creating Email Automations

1. **Access Integration Menu**
   - Go to Finance Dashboard → Integration → Email Automation

2. **Create New Automation**
   - Click "Add Email Automation"
   - Select email type (GST Filing, TDS Filing, Payment Due, etc.)
   - Configure recipients, frequency, and timing
   - Customize email templates

3. **Template Variables**
   Available variables for email templates:
   - `{company_name}` - Company name
   - `{due_date}` - Due date for compliance/payment
   - `{days_remaining}` - Days until due date
   - `{current_date}` - Current date
   - `{filing_period}` - GST filing period
   - `{quarter}` - TDS quarter
   - `{invoice_count}` - Number of due invoices
   - `{total_outstanding}` - Total outstanding amount

### Email Types

#### 1. GST Filing Reminder
- **Trigger**: Based on GST filing due dates (11th of next month)
- **Variables**: `{due_date}`, `{days_remaining}`, `{filing_period}`
- **Default Schedule**: Monthly, 3 days before due date

#### 2. TDS Filing Reminder
- **Trigger**: Based on quarterly TDS filing dates
- **Variables**: `{due_date}`, `{days_remaining}`, `{quarter}`
- **Default Schedule**: Quarterly, 7 days before due date

#### 3. Payment Due Reminder
- **Trigger**: Based on invoice due dates
- **Variables**: `{invoice_count}`, `{total_outstanding}`
- **Default Schedule**: Daily check, 3 days before due date

#### 4. Invoice Overdue
- **Trigger**: Based on overdue invoices
- **Variables**: `{overdue_count}`, `{total_overdue}`
- **Default Schedule**: Daily check

#### 5. Compliance Alert
- **Trigger**: Manual or scheduled
- **Variables**: `{company_name}`, `{current_date}`
- **Default Schedule**: As needed

#### 6. Custom Reminder
- **Trigger**: Configurable
- **Variables**: All available variables
- **Default Schedule**: Configurable

### Testing Automations

1. **Test Email**: Send test email to current user
2. **Trigger Now**: Manually trigger automation immediately
3. **View Logs**: Check automation execution logs

## API Endpoints

### Email Automation CRUD
- `GET /api/finance/integration/email-automations/` - List automations
- `POST /api/finance/integration/email-automations/` - Create automation
- `GET /api/finance/integration/email-automations/{id}/` - Get automation
- `PUT /api/finance/integration/email-automations/{id}/` - Update automation
- `DELETE /api/finance/integration/email-automations/{id}/` - Delete automation

### Testing & Triggering
- `POST /api/finance/integration/email-automations/{id}/test/` - Send test email
- `POST /api/finance/integration/email-automations/{id}/trigger/` - Trigger automation

## Monitoring & Logs

### Integration Logs
- All email automation activities are logged in `IntegrationLog` model
- View logs in Integration Dashboard
- Filter by status: success, error, warning, info

### Log Files (if using cron)
- `/var/log/email_automation.log` - Main log file
- `/var/log/email_automation_backup.log` - Backup log file

### Monitoring Points
1. **Email Service Status**: Company email configuration
2. **Automation Status**: Active/inactive automations
3. **Execution Logs**: Success/failure rates
4. **Recipient Delivery**: Email delivery status

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check company email configuration
   - Verify email service credentials
   - Check automation is active
   - Review integration logs

2. **Automations Not Running**
   - Verify cron jobs are set up
   - Check management command execution
   - Review automation schedule settings

3. **Template Errors**
   - Validate template variables
   - Check for syntax errors in templates
   - Test with sample data

### Debug Commands
```bash
# Check email service status
python manage.py shell
>>> from authentication.models import Company
>>> from company_dashboard.email_service import get_company_email_service
>>> company = Company.objects.first()
>>> service = get_company_email_service(company)
>>> service.can_send_email()

# Test specific automation
python manage.py shell
>>> from finance.integration_models import EmailAutomation
>>> from finance.email_automation_service import EmailAutomationService
>>> automation = EmailAutomation.objects.first()
>>> service = EmailAutomationService(automation.company)
>>> service.process_automation(automation)
```

## Security Considerations

1. **Email Credentials**: Stored encrypted in company email settings
2. **Template Injection**: Input sanitization for template variables
3. **Rate Limiting**: Built-in email service rate limiting
4. **Access Control**: Session-based authentication for API endpoints
5. **Audit Trail**: Complete logging of all email automation activities

## Performance Optimization

1. **Batch Processing**: Process multiple automations efficiently
2. **Caching**: Template rendering optimization
3. **Queue Management**: Celery for background processing
4. **Database Indexing**: Optimized queries for automation lookup
5. **Email Throttling**: Respect email service limits

## Integration with Existing System

### Company Email Service
- Uses existing `CompanyEmailService` from company dashboard
- Supports all configured email providers (SMTP, SendGrid, Mailgun, SES)
- Maintains email sending quotas and limits

### Finance Module Integration
- Accesses invoice and payment data for notifications
- Integrates with compliance calculations
- Uses existing customer and transaction data

### Authentication Integration
- Uses service user sessions for API access
- Integrates with company user management
- Respects user roles and permissions

## Future Enhancements

1. **Advanced Scheduling**: More complex scheduling rules
2. **Email Analytics**: Open rates, click tracking
3. **Template Builder**: Visual email template editor
4. **Webhook Integration**: External system notifications
5. **Multi-language Support**: Localized email templates
6. **Conditional Logic**: Smart automation triggers
7. **Bulk Operations**: Mass automation management
8. **Report Integration**: Attach compliance reports to emails