# Email Templates for Finance Module

This directory contains HTML email templates for sending invoices, quotations, and payment receipts to customers.

## Available Templates

### 1. Invoice Email (`invoice_email.html`)
Sent when an invoice is generated and needs to be emailed to the customer.

**Template Variables:**
- `invoice_number` - Invoice number (e.g., SE-INV-2627-001)
- `invoice_date` - Invoice date (formatted)
- `due_date` - Payment due date
- `customer_name` - Customer name
- `total_amount` - Total invoice amount (formatted)
- `currency` - Currency code (e.g., INR, USD)
- `payment_link` - Link to view invoice online
- `company_name` - Company name
- `company_email` - Company email
- `company_phone` - Company phone

### 2. Quotation Email (`quotation_email.html`)
Sent when a quotation is created and needs to be shared with the customer.

**Template Variables:**
- `quotation_number` - Quotation number
- `quotation_date` - Quotation date
- `valid_until` - Quotation validity date
- `customer_name` - Customer name
- `total_amount` - Total quotation amount
- `currency` - Currency code
- `quotation_link` - Link to view quotation online
- `company_name` - Company name
- `company_email` - Company email
- `company_phone` - Company phone

### 3. Receipt Email (`receipt_email.html`)
Sent when a payment is received and a receipt needs to be sent to the customer.

**Template Variables:**
- `receipt_number` - Receipt number
- `payment_date` - Payment date
- `payment_method` - Payment method (e.g., Bank Transfer, Cash)
- `invoice_number` - Related invoice number
- `customer_name` - Customer name
- `amount_paid` - Amount paid
- `currency` - Currency code
- `receipt_link` - Link to view receipt online
- `company_name` - Company name
- `company_email` - Company email
- `company_phone` - Company phone

## Usage

### Using the Email Service

```python
from finance.email_service import FinanceEmailService

# Send invoice email
invoice = Invoice.objects.get(id=1)
FinanceEmailService.send_invoice_email(
    invoice=invoice,
    recipient_email='customer@example.com',
    attach_pdf=True  # Optional: attach PDF
)

# Send quotation email
quotation = Quotation.objects.get(id=1)
FinanceEmailService.send_quotation_email(
    quotation=quotation,
    recipient_email='customer@example.com',
    attach_pdf=True
)

# Send receipt email
payment = Payment.objects.get(id=1)
FinanceEmailService.send_receipt_email(
    payment=payment,
    recipient_email='customer@example.com',
    attach_pdf=True
)
```

### Testing Email Configuration

Use the management command to test email sending:

```bash
# Simple test email
python manage.py test_email --type=simple --to=your@email.com

# Test invoice email
python manage.py test_email --type=invoice --to=customer@email.com --id=1

# Test quotation email
python manage.py test_email --type=quotation --to=customer@email.com --id=1

# Test receipt email
python manage.py test_email --type=receipt --to=customer@email.com --id=1
```

Or use the interactive script:

```bash
cd /var/www/SAP-Python/backend
./test_email_config.sh
```

## Email Configuration

Email settings are configured per company in the Company Dashboard:
- Go to Company Dashboard > Settings > Email Settings
- Configure SMTP host, port, username, password
- Set from email address
- Enable/disable email service

For system-level email configuration, edit `/var/www/SAP-Python/backend/.env`:

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

## Template Styling

All templates use:
- Responsive design (600px width)
- Gradient headers with distinct colors:
  - Invoice: Purple gradient (#667eea to #764ba2)
  - Quotation: Pink gradient (#f093fb to #f5576c)
  - Receipt: Green gradient (#11998e to #38ef7d)
- Modern glassmorphism styling
- Mobile-friendly layout
- Professional typography

## Customization

To customize templates:
1. Edit the HTML files in this directory
2. Maintain the template variable syntax: `{{ variable_name }}`
3. Test changes using the test_email management command
4. Restart the backend service after changes

## Troubleshooting

**Email not sending:**
1. Check email configuration in .env file
2. Verify SMTP credentials are correct
3. Check if email service is enabled for the company
4. Review backend logs: `sudo journalctl -u sap-backend -f`

**Template not rendering:**
1. Ensure all required variables are provided
2. Check template syntax for errors
3. Verify template file path is correct

**Styling issues:**
1. Test in multiple email clients (Gmail, Outlook, etc.)
2. Use inline CSS for better compatibility
3. Avoid complex CSS that may not be supported

## Future Enhancements

- [ ] PDF attachment support
- [ ] Multi-language support
- [ ] Custom template builder in UI
- [ ] Email tracking and analytics
- [ ] Scheduled email sending
- [ ] Email templates for other modules (HR, Inventory)
