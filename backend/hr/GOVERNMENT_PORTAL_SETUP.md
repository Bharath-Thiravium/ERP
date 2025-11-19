# Government Portal Integration Setup

## Overview
The government portal integration has been updated to use **real government APIs** instead of mock data, with enhanced security features including encrypted credential storage.

## Security Fixes Applied
- ✅ Removed all mock data and responses
- ✅ Fixed XSS vulnerabilities with input sanitization
- ✅ Fixed path traversal issues with secure file handling
- ✅ Fixed SQL injection with parameterized queries
- ✅ Added encrypted password storage for portal credentials
- ✅ Implemented secure API clients with proper SSL verification
- ✅ Added comprehensive error handling and logging

## Setup Instructions

### 1. Generate Encryption Key
```bash
cd /home/athenas/sap\ project/backend
python manage.py setup_government_portal --generate-key
```

### 2. Set Environment Variable
Add the generated key to your environment:
```bash
export PORTAL_ENCRYPTION_KEY="your-generated-key-here"
```

### 3. Install Required Dependencies
```bash
pip install cryptography requests urllib3
```

### 4. Run Migrations
```bash
python manage.py migrate hr
```

### 5. Test Portal Integration
```bash
python manage.py setup_government_portal --test-connection
```

## Portal Configuration

### Required Government Portal Accounts
You need active accounts on these portals:

1. **EPFO Portal** - https://unifiedportal-mem.epfindia.gov.in/epfo
2. **ESIC Portal** - https://www.esic.in/ESICInsurancePortal  
3. **Income Tax Portal** - https://www.incometax.gov.in/iec/foportal
4. **Professional Tax Portal** - State-specific (e.g., Maharashtra: https://mahagst.gov.in/professionaltax)

### Credential Setup
1. Navigate to HR → Government Portal in the frontend
2. Click "Portal Settings" 
3. Enter your government portal credentials
4. Credentials are automatically encrypted before storage

## API Endpoints

### Submit Returns
```
POST /api/hr/government/submit/
{
  "return_id": 123,
  "portal_type": "epfo|esic|pt|income_tax",
  "session_key": "your-session-key"
}
```

### Check Status
```
POST /api/hr/government/check-status/
{
  "acknowledgment_number": "ACK123456789",
  "return_type": "pf_ecr|esi_return|pt_return|tds_24q",
  "session_key": "your-session-key"
}
```

### Generate Challan
```
POST /api/hr/government/generate-challan/
{
  "return_id": 123,
  "challan_type": "pf|esi|pt|tds",
  "session_key": "your-session-key"
}
```

## Security Features

### Encrypted Credentials
- All portal passwords are encrypted using Fernet (AES 128)
- Encryption key stored securely in environment variables
- Automatic encryption/decryption on save/retrieve

### Secure API Clients
- SSL certificate verification enabled
- Request timeout protection
- Retry mechanism for failed requests
- Proper session management

### Input Validation
- All user inputs sanitized to prevent XSS
- SQL injection protection with parameterized queries
- Path traversal protection for file operations
- CSRF token validation

## Error Handling

### Common Error Codes
- `MISSING_CREDENTIALS` - Portal credentials not configured
- `LOGIN_FAILED` - Invalid portal credentials
- `SUBMISSION_ERROR` - API submission failed
- `STATUS_CHECK_FAILED` - Unable to check status
- `INVALID_DATA` - Invalid input data format

### Logging
All portal activities are logged for audit trail:
- Successful submissions
- Failed login attempts  
- API errors and responses
- Security violations

## Production Deployment

### Environment Variables
```bash
# Required
PORTAL_ENCRYPTION_KEY=your-encryption-key

# Optional
GOVERNMENT_PORTAL_TIMEOUT=30
ENABLE_PORTAL_LOGGING=true
```

### SSL Certificates
For digital signatures, place certificates in:
```
/path/to/certificates/
├── epfo_certificate.pem
├── esic_certificate.pem
├── it_certificate.pem
└── pt_certificate.pem
```

### Monitoring
Monitor these endpoints for health:
- Portal login success rates
- API response times
- Error rates by portal type
- Credential expiry alerts

## Troubleshooting

### Common Issues

1. **Login Failed**
   - Verify portal credentials are correct
   - Check if portal account is active
   - Ensure 2FA is disabled for API access

2. **Encryption Errors**
   - Verify PORTAL_ENCRYPTION_KEY is set
   - Check key format (should be base64 encoded)
   - Regenerate key if corrupted

3. **API Timeouts**
   - Government portals may be slow
   - Increase timeout in settings
   - Retry failed requests

4. **SSL Errors**
   - Update certificates if expired
   - Check portal SSL configuration
   - Verify system time is correct

### Support
For technical support:
1. Check application logs for detailed errors
2. Verify portal status on government websites
3. Test with minimal data first
4. Contact portal support for account issues

## Compliance Notes
- All data transmission uses HTTPS
- Credentials stored with AES encryption
- Audit logs maintained for compliance
- Regular security updates applied
- Follows government API guidelines