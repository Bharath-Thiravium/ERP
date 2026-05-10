# Email Templates Setup - Summary

## What Was Created

### 1. Email Templates (HTML)
Location: `/var/www/SAP-Python/backend/finance/templates/email/`

- **invoice_email.html** - Professional invoice email with purple gradient header
- **quotation_email.html** - Quotation email with pink gradient header  
- **receipt_email.html** - Payment receipt email with green gradient header

All templates feature:
- Modern responsive design (600px width)
- Gradient headers with distinct colors per document type
- Professional typography and spacing
- Mobile-friendly layout
- Call-to-action buttons
- Company branding footer

### 2. Email Service
Location: `/var/www/SAP-Python/backend/finance/email_service.py`

**FinanceEmailService** class with methods:
- `send_invoice_email(invoice, recipient_email, attach_pdf=True)`
- `send_quotation_email(quotation, recipient_email, attach_pdf=True)`
- `send_receipt_email(payment, recipient_email, attach_pdf=True)`

Features:
- Uses company-specific email settings from database
- Template rendering with context variables
- HTML email with fallback text
- Error handling and logging
- PDF attachment support (placeholder for future implementation)

### 3. Management Command
Location: `/var/www/SAP-Python/backend/finance/management/commands/test_email.py`

**Command:** `python manage.py test_email`

Options:
- `--type` - Email type: simple, invoice, quotation, receipt
- `--to` - Recipient email address (required)
- `--id` - Document ID (required for invoice/quotation/receipt)

Examples:
```bash
python manage.py test_email --type=simple --to=test@example.com
python manage.py test_email --type=invoice --to=customer@example.com --id=1
python manage.py test_email --type=quotation --to=customer@example.com --id=5
python manage.py test_email --type=receipt --to=customer@example.com --id=10
```

### 4. Interactive Test Script
Location: `/var/www/SAP-Python/backend/test_email_config.sh`

**Usage:** `./test_email_config.sh`

Features:
- Interactive menu for selecting email type
- Prompts for recipient email and document ID
- Auto-activates virtual environment
- Color-coded output
- User-friendly interface

### 5. Configuration Updates
Location: `/var/www/SAP-Python/backend/sap_backend/settings.py`

Updated email backend configuration to use SMTP from .env file instead of console backend:
- EMAIL_BACKEND from .env
- EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS from .env
- EMAIL_HOST_USER, EMAIL_HOST_PASSWORD from .env
- FRONTEND_URL for email links

### 6. Documentation
Location: `/var/www/SAP-Python/backend/finance/templates/email/README.md`

Complete documentation including:
- Template descriptions and variables
- Usage examples
- Testing instructions
- Configuration guide
- Troubleshooting tips
- Customization guide

## How to Use

### Quick Test
```bash
cd /var/www/SAP-Python/backend
./test_email_config.sh
```

### In Code
```python
from finance.email_service import FinanceEmailService

# Send invoice
invoice = Invoice.objects.get(id=1)
FinanceEmailService.send_invoice_email(invoice, 'customer@example.com')

# Send quotation
quotation = Quotation.objects.get(id=1)
FinanceEmailService.send_quotation_email(quotation, 'customer@example.com')

# Send receipt
payment = Payment.objects.get(id=1)
FinanceEmailService.send_receipt_email(payment, 'customer@example.com')
```

### From Views/API
You can integrate the email service into your views:

```python
from rest_framework.decorators import action
from finance.email_service import FinanceEmailService

@action(detail=True, methods=['post'])
def send_email(self, request, pk=None):
    invoice = self.get_object()
    recipient = request.data.get('email', invoice.customer.email)
    
    success = FinanceEmailService.send_invoice_email(invoice, recipient)
    
    if success:
        return Response({'message': 'Email sent successfully'})
    return Response({'error': 'Failed to send email'}, status=400)
```

## Email Configuration

### System-Level (.env)
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@athenas.co.in
EMAIL_HOST_PASSWORD=your_app_specific_password_here
EMAIL_TIMEOUT=30
FRONTEND_URL=https://sap.athenas.co.in
```

### Company-Level (Database)
Each company can configure their own email settings in:
- Company Dashboard > Settings > Email Settings
- Table: `company_dashboard_companyemailsettings`

## Testing Checklist

- [ ] Test simple email: `python manage.py test_email --type=simple --to=your@email.com`
- [ ] Test invoice email with real invoice ID
- [ ] Test quotation email with real quotation ID
- [ ] Test receipt email with real payment ID
- [ ] Verify email arrives in inbox (check spam folder)
- [ ] Check email rendering in Gmail
- [ ] Check email rendering in Outlook
- [ ] Verify all links work correctly
- [ ] Confirm company branding appears correctly

## Next Steps

1. **Update .env file** with actual email credentials
2. **Test email sending** using the test script
3. **Integrate into views** - Add email sending to invoice/quotation creation endpoints
4. **Add UI buttons** - Add "Send Email" buttons in frontend
5. **Implement PDF attachments** - Generate and attach PDFs to emails
6. **Add email logs** - Track sent emails in database
7. **Create email queue** - Use Celery for async email sending
8. **Add email templates** for other modules (HR, Inventory)

## Files Created

```
backend/
├── finance/
│   ├── email_service.py                          # Email service class
│   ├── templates/
│   │   └── email/
│   │       ├── invoice_email.html                # Invoice template
│   │       ├── quotation_email.html              # Quotation template
│   │       ├── receipt_email.html                # Receipt template
│   │       └── README.md                         # Documentation
│   └── management/
│       ├── __init__.py
│       └── commands/
│           ├── __init__.py
│           └── test_email.py                     # Test command
├── test_email_config.sh                          # Interactive test script
└── sap_backend/
    └── settings.py                               # Updated email config

```

## Status

✅ Email templates created
✅ Email service implemented
✅ Management command created
✅ Test script created
✅ Configuration updated
✅ Documentation written
✅ Backend restarted

**Ready to test!** 🚀
