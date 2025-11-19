"""
Settings for Government API Integration
Add these settings to your Django settings.py file
"""

# GST API Configuration
GST_API_BASE_URL = 'https://api.gst.gov.in'
GST_CLIENT_ID = 'your_gst_client_id'
GST_CLIENT_SECRET = 'your_gst_client_secret'
GST_USERNAME = 'your_gst_username'
GST_PASSWORD = 'your_gst_password'

# TDS API Configuration
TDS_API_BASE_URL = 'https://incometaxindiaefiling.gov.in'
TDS_USERNAME = 'your_tds_username'
TDS_PASSWORD = 'your_tds_password'

# E-Invoice API Configuration
EINVOICE_API_BASE_URL = 'https://einvoice1.gst.gov.in'
EINVOICE_CLIENT_ID = 'your_einvoice_client_id'
EINVOICE_CLIENT_SECRET = 'your_einvoice_client_secret'

# Company Details (required for API calls)
COMPANY_GSTIN = 'your_company_gstin'
COMPANY_PAN = 'your_company_pan'
COMPANY_TAN = 'your_company_tan'

# Cache Configuration (for API tokens)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'gov_api',
        'TIMEOUT': 3600,  # 1 hour default timeout
    }
}

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'government_api.log',
        },
    },
    'loggers': {
        'finance.government_api': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# API Rate Limiting
API_RATE_LIMITS = {
    'GST_API': {
        'requests_per_minute': 60,
        'requests_per_hour': 1000,
    },
    'TDS_API': {
        'requests_per_minute': 30,
        'requests_per_hour': 500,
    },
    'EINVOICE_API': {
        'requests_per_minute': 100,
        'requests_per_hour': 2000,
    }
}

# Environment-specific settings
import os

if os.environ.get('DJANGO_ENV') == 'production':
    # Production API endpoints
    GST_API_BASE_URL = 'https://api.gst.gov.in'
    TDS_API_BASE_URL = 'https://incometaxindiaefiling.gov.in'
    EINVOICE_API_BASE_URL = 'https://einvoice1.gst.gov.in'
else:
    # Sandbox/Testing API endpoints
    GST_API_BASE_URL = 'https://api.sandbox.gst.gov.in'
    TDS_API_BASE_URL = 'https://sandbox.incometaxindiaefiling.gov.in'
    EINVOICE_API_BASE_URL = 'https://einvoice1.sandbox.gst.gov.in'