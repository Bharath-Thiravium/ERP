# Email System - Current Implementation

## Overview

The SAP-Python system **already has a fully functional email system** for sending invoices, quotations, proforma invoices, and purchase orders. The email templates I created are **additional HTML templates** that can be used as alternatives or references.

## Existing Email Implementation

### Location
- **Email Functions**: `/var/www/SAP-Python/backend/finance/email_utils.py`
- **Email Views**: `/var/www/SAP-Python/backend/finance/views.py`
- **Company Email Service**: `/var/www/SAP-Python/backend/company_dashboard/email_service.py`

### Available Functions

1. **`send_invoice_email(invoice, recipient_email, message="")`**
   - Sends invoice with PDF attachment
   - Uses company-specific email settings
   - Professional HTML email template
   - Includes payment due date and amount

2. **`send_quotation_email(quotation, recipient_email, message="")`**
   - Sends quotation with PDF attachment
   - Uses WeasyPrint templates for PDF generation
   - Professional HTML email template
   - Includes validity period

3. **`send_proforma_email(proforma, recipient_email, message="")`**
   - Sends proforma invoice with PDF attachment
   - Uses company-specific templates
   - Professional HTML email template

4. **`send_purchase_order_email(purchase_order, recipient_email, message="")`**
   - Sends purchase order with PDF attachment
   - Uses WeasyPrint templates
   - Professional HTML email template

### Email Views (API Endpoints)

The system has dedicated views for sending emails:

- `send_invoice_email_view(request, invoice_id)`
- `send_quotation_email_view(request, quotation_id)`
- `send_proforma_email_view(request, proforma_id)`
- `send_purchase_order_email_view(request, purchase_order_id)`

### How It Works

1. **Company Email Configuration**
   - Each company configures their own SMTP settings in Company Dashboard
   - Settings stored in `company_dashboard_companyemailsettings` table
   - Includes: SMTP host, port, username, password, from email
   - Daily email limit tracking

2. **Email Sending Process**
   ```python
   # Get company-specific email service
   email_service = get_company_email_service(invoice.company)
   
   # Check if service is configured and within limits
   if not email_service or not email_service.can_send_email():
       return False, "Email service not configured or limit reached"
   
   # Generate PDF using WeasyPrint templates
   pdf_buffer = generate_invoice_pdf_content(invoice)
   
   # Send email with HTML content and PDF attachment
   success = email_service.send_email(
       to_emails=[recipient_email],
       subject=subject,
       html_content=html_content,
       text_content=text_content,
       attachments=[pdf_attachment]
   )
   ```

3. **PDF Generation**
   - Uses WeasyPrint for professional PDF templates
   - Falls back to ReportLab if WeasyPrint fails
   - Company-specific templates can be selected
   - Includes logo, company details, customer info, items, taxes, totals

4. **Email Content**
   - Professional HTML emails with proper formatting
   - Includes all relevant document details
   - Custom message field for additional notes
   - Company branding (name, contact details)
   - Proper salutations and signatures

## Email Configuration

### Company-Level Configuration (Primary Method)

Each company configures their email settings in:
- **UI**: Company Dashboard > Settings > Email Settings
- **Database**: `company_dashboard_companyemailsettings` table

Fields:
- SMTP Host (e.g., smtp.hostinger.com)
- SMTP Port (e.g., 587)
- SMTP Username
- SMTP Password (encrypted)
- From Email
- Use TLS/SSL
- Daily Email Limit
- Is Active

### System-Level Configuration (Fallback)

For system notifications, configure in `.env`:
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=system@athenas.co.in
EMAIL_HOST_PASSWORD=your_password
```

## Testing Email Functionality

### Option 1: Using Management Command (New)

Test the email system using the new management command:

```bash
# Simple test
sudo -u www-data bash -c 'cd /var/www/SAP-Python/backend && source venv/bin/activate && python manage.py test_email --type=simple --to=your@email.com'

# Test invoice email
sudo -u www-data bash -c 'cd /var/www/SAP-Python/backend && source venv/bin/activate && python manage.py test_email --type=invoice --to=customer@email.com --id=225'

# Test quotation email
sudo -u www-data bash -c 'cd /var/www/SAP-Python/backend && source venv/bin/activate && python manage.py test_email --type=quotation --to=customer@email.com --id=71'
```

### Option 2: Using Interactive Script (New)

```bash
cd /var/www/SAP-Python/backend
./test_email_config.sh
```

### Option 3: Using Existing API Endpoints

The frontend already has "Send Email" functionality integrated. Check:
- Invoice detail page - "Send Email" button
- Quotation detail page - "Send Email" button
- Proforma detail page - "Send Email" button
- Purchase Order detail page - "Send Email" button

### Option 4: Using Python Shell

```python
from finance.models import Invoice, Quotation
from finance.email_utils import send_invoice_email, send_quotation_email

# Send invoice
invoice = Invoice.objects.get(id=225)
success, message = send_invoice_email(invoice, 'customer@example.com', 'Thank you for your business!')
print(message)

# Send quotation
quotation = Quotation.objects.get(id=71)
success, message = send_quotation_email(quotation, 'customer@example.com', 'Looking forward to your response!')
print(message)
```

## New Email Templates Created

I've created additional HTML email templates that can be used as alternatives:

### Location
`/var/www/SAP-Python/backend/finance/templates/email/`

### Templates
1. **invoice_email.html** - Modern invoice email with purple gradient
2. **quotation_email.html** - Modern quotation email with pink gradient
3. **receipt_email.html** - Modern receipt email with green gradient

### Features
- Responsive design (600px width)
- Gradient headers with distinct colors
- Modern glassmorphism styling
- Mobile-friendly layout
- Professional typography
- Call-to-action buttons

### How to Use New Templates

To use the new templates, update the email functions in `email_utils.py`:

```python
from django.template.loader import render_to_string

# In send_invoice_email function
html_content = render_to_string('email/invoice_email.html', {
    'invoice_number': invoice.invoice_number,
    'invoice_date': invoice.invoice_date.strftime('%d %b %Y'),
    'due_date': invoice.due_date.strftime('%d %b %Y'),
    'customer_name': invoice.customer.name,
    'total_amount': f"{invoice.total_amount:,.2f}",
    'currency': invoice.currency or 'INR',
    'payment_link': f"{settings.FRONTEND_URL}/finance/invoices/{invoice.id}",
    'company_name': invoice.company.name,
    'company_email': email_service.from_email,
    'company_phone': invoice.company.phone or '',
})
```

## Email Service Features

### Current Implementation Includes:

✅ Company-specific email configuration
✅ SMTP support (Hostinger, Gmail, etc.)
✅ Daily email limit tracking
✅ Email encryption for passwords
✅ PDF attachment generation
✅ Professional HTML email templates
✅ Fallback text content
✅ Error handling and logging
✅ WeasyPrint template integration
✅ Custom message support
✅ Multiple document types (Invoice, Quotation, Proforma, PO)

### What Was Added:

✅ Alternative HTML email templates (modern design)
✅ Management command for testing (`test_email`)
✅ Interactive test script (`test_email_config.sh`)
✅ Quick start guide (`email_quick_start.sh`)
✅ Comprehensive documentation

## Troubleshooting

### Email Not Sending

1. **Check Company Email Settings**
   ```sql
   SELECT * FROM company_dashboard_companyemailsettings WHERE is_active = true;
   ```

2. **Verify SMTP Credentials**
   - Go to Company Dashboard > Settings > Email Settings
   - Test the connection
   - Check if daily limit is reached

3. **Check Backend Logs**
   ```bash
   sudo journalctl -u sap-backend -f | grep -i email
   ```

4. **Test Email Service**
   ```bash
   cd /var/www/SAP-Python/backend
   ./test_email_config.sh
   ```

### Common Issues

1. **"Email service not configured"**
   - Configure email settings in Company Dashboard
   - Ensure `is_active = true`

2. **"Daily limit reached"**
   - Check `emails_sent_today` in company email settings
   - Increase `daily_email_limit` or wait for reset

3. **"SMTP authentication failed"**
   - Verify SMTP username and password
   - Check if 2FA is enabled (use app-specific password)
   - Verify SMTP host and port

4. **"Connection timeout"**
   - Check firewall settings
   - Verify SMTP port is not blocked
   - Try different SMTP port (587, 465, 25)

## Summary

The SAP-Python system **already has a complete email implementation** that:
- Uses company-specific SMTP settings
- Sends professional emails with PDF attachments
- Supports invoices, quotations, proforma invoices, and purchase orders
- Has proper error handling and logging
- Integrates with the frontend UI

The new templates and tools I created are **supplementary** and can be used for:
- Testing the email system
- Alternative email designs
- Reference for future email templates
- Development and debugging

**No additional integration is needed** - the email system is already working and can be used from the frontend UI or API endpoints.
