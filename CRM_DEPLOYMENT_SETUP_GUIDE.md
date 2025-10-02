# CRM Service Deployment & Setup Guide

## Overview
This guide provides step-by-step instructions for deploying and setting up the complete CRM service in your SAP System.

## Prerequisites

### Backend Requirements
- Python 3.8+
- Django 4.2+
- PostgreSQL 12+
- Redis (for caching and sessions)
- Git

### Frontend Requirements
- Node.js 16+
- npm or pnpm
- React 18+
- TypeScript 4.9+

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Add these to your `requirements.txt` if not already present:
```
django-filter>=23.2
djangorestframework>=3.14.0
django-cors-headers>=4.0.0
psycopg2-binary>=2.9.6
redis>=4.5.0
celery>=5.2.0
```

### 2. Database Configuration

Update your `backend/sap_backend/settings.py`:

```python
# Add CRM to INSTALLED_APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    
    # Your existing apps
    'authentication',
    'hr',
    'finance',
    'inventory',
    
    # Add CRM app
    'crm',
    
    # Other apps...
]

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'sap_system_db',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# CRM specific settings
CRM_SETTINGS = {
    'EMAIL_INTEGRATION': True,
    'CALENDAR_INTEGRATION': True,
    'NOTIFICATION_ENABLED': True,
    'AUTO_LEAD_ASSIGNMENT': False,
    'LEAD_SCORING_ENABLED': True,
    'PIPELINE_STAGES': [
        'prospecting',
        'qualification', 
        'needs_analysis',
        'proposal',
        'negotiation',
        'closed_won',
        'closed_lost'
    ]
}
```

### 3. URL Configuration

Update `backend/sap_backend/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/hr/', include('hr.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/crm/', include('crm.urls')),  # Add CRM URLs
    # Add other service URLs...
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 4. Create CRM App Structure

```bash
cd backend
python manage.py startapp crm
```

Copy the complete backend implementation from `CRM_BACKEND_COMPLETE.py` to the respective files:
- Copy models to `backend/crm/models.py`
- Copy serializers to `backend/crm/serializers.py`
- Copy views to `backend/crm/views.py`
- Copy URLs to `backend/crm/urls.py`
- Copy admin to `backend/crm/admin.py`
- Copy apps config to `backend/crm/apps.py`

### 5. Run Migrations

```bash
cd backend
python manage.py makemigrations crm
python manage.py migrate
```

### 6. Create Superuser (if needed)

```bash
python manage.py createsuperuser
```

### 7. Load Initial Data (Optional)

Create a fixture file `backend/crm/fixtures/initial_data.json`:

```json
[
  {
    "model": "crm.lead",
    "pk": 1,
    "fields": {
      "lead_id": "DEMO001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "company_name": "Example Corp",
      "status": "new",
      "priority": "medium",
      "source": "website",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
]
```

Load the fixture:
```bash
python manage.py loaddata initial_data
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
# or
pnpm install
```

### 2. Create CRM Directory Structure

```bash
mkdir -p src/pages/services/crm/{components,hooks,pages,types,utils}
```

### 3. Copy Frontend Files

Copy the complete frontend implementation from `CRM_FRONTEND_COMPLETE.tsx` to the respective files:
- Copy types to `frontend/src/pages/services/crm/types/index.ts`
- Copy API utils to `frontend/src/pages/services/crm/utils/api.ts`
- Copy hooks to `frontend/src/pages/services/crm/hooks/useCRM.ts`
- Copy components to respective files in `frontend/src/pages/services/crm/components/`
- Copy pages to respective files in `frontend/src/pages/services/crm/pages/`
- Copy main index to `frontend/src/pages/services/crm/index.tsx`

### 4. Update API Client

Add CRM API methods to your existing `frontend/src/lib/api.ts` using the methods from `CRM_API_CLIENT_INTEGRATION.ts`.

### 5. Update Router Configuration

Update your main router to include CRM routes in `frontend/src/lib/serviceRouter.tsx`:

```tsx
import CRMService from '../pages/services/crm'

// Add to your service routes
{
  path: '/services/crm/*',
  element: <CRMService />,
  meta: {
    title: 'CRM Management',
    requiresAuth: true,
    service: 'crm'
  }
}
```

### 6. Update Navigation

Add CRM to your services navigation:

```tsx
// In your services navigation component
{
  name: 'CRM',
  path: '/services/crm',
  icon: Users,
  description: 'Customer Relationship Management'
}
```

## Environment Configuration

### Backend Environment (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sap_system_db

# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# CRM Configuration
CRM_ENABLED=True
CRM_EMAIL_INTEGRATION=True
CRM_CALENDAR_INTEGRATION=True
CRM_NOTIFICATION_ENABLED=True

# Email Configuration (for CRM notifications)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379/0

# Celery Configuration (for background tasks)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend Environment (.env)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_CRM_SERVICE_ENABLED=true
VITE_APP_NAME=SAP System
VITE_COMPANY_NAME=ExampleTech Solutions
```

## Running the Application

### 1. Start Backend Server

```bash
cd backend
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### 2. Start Frontend Development Server

```bash
cd frontend
npm run dev
# or
pnpm dev
```

The frontend will be available at `http://localhost:5173`

### 3. Access CRM Service

1. Log in to your SAP System
2. Navigate to Services
3. Click on CRM Management
4. Start using the CRM features

## Testing the Setup

### 1. Backend API Testing

Test the CRM API endpoints:

```bash
# Test dashboard stats
curl -X GET "http://localhost:8000/api/crm/dashboard/" \
  -H "Authorization: Bearer YOUR_SESSION_KEY"

# Test creating a lead
curl -X POST "http://localhost:8000/api/crm/leads/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_KEY" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "status": "new"
  }'
```

### 2. Frontend Testing

1. Open browser and navigate to `http://localhost:5173`
2. Log in with your credentials
3. Navigate to CRM service
4. Test creating, editing, and deleting leads
5. Test dashboard functionality
6. Test other CRM features

## Production Deployment

### 1. Backend Production Setup

```bash
# Install production dependencies
pip install gunicorn whitenoise

# Collect static files
python manage.py collectstatic --noinput

# Run with Gunicorn
gunicorn sap_backend.wsgi:application --bind 0.0.0.0:8000
```

### 2. Frontend Production Build

```bash
cd frontend
npm run build
# or
pnpm build
```

### 3. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /path/to/backend/static/;
    }

    # Media files
    location /media/ {
        alias /path/to/backend/media/;
    }
}
```

## Database Backup and Maintenance

### 1. Regular Backups

```bash
# Create backup
pg_dump -U username -h localhost sap_system_db > crm_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -U username -h localhost sap_system_db < crm_backup_20240101_120000.sql
```

### 2. Database Maintenance

```bash
# Analyze database performance
python manage.py dbshell
ANALYZE;

# Clean up old sessions
python manage.py clearsessions

# Clean up old activities (optional)
python manage.py shell
from crm.models import Activity
from datetime import datetime, timedelta
old_activities = Activity.objects.filter(
    created_at__lt=datetime.now() - timedelta(days=365),
    status='completed'
)
old_activities.delete()
```

## Monitoring and Logging

### 1. Django Logging Configuration

Add to `settings.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/crm.log',
        },
    },
    'loggers': {
        'crm': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### 2. Performance Monitoring

```python
# Add to views.py for performance monitoring
import time
import logging

logger = logging.getLogger('crm')

def log_performance(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        logger.info(f"{func.__name__} took {end_time - start_time:.2f} seconds")
        return result
    return wrapper
```

## Troubleshooting

### Common Issues

1. **Migration Errors**
   ```bash
   python manage.py migrate --fake-initial
   python manage.py migrate crm
   ```

2. **Permission Errors**
   ```bash
   python manage.py collectstatic --clear
   chmod -R 755 static/
   ```

3. **Session Key Issues**
   - Check if session is active in database
   - Verify session key format
   - Check authentication middleware

4. **API Connection Issues**
   - Verify CORS settings
   - Check API base URL in frontend
   - Verify backend server is running

### Debug Mode

Enable debug mode for troubleshooting:

```python
# settings.py
DEBUG = True
LOGGING['loggers']['django']['level'] = 'DEBUG'
```

## Security Considerations

### 1. API Security
- Always use HTTPS in production
- Implement rate limiting
- Validate all input data
- Use proper authentication

### 2. Database Security
- Use strong passwords
- Limit database access
- Regular security updates
- Backup encryption

### 3. Session Security
- Set secure session cookies
- Implement session timeout
- Monitor session activity

## Performance Optimization

### 1. Database Optimization
- Add database indexes
- Use select_related and prefetch_related
- Implement database connection pooling
- Regular database maintenance

### 2. Frontend Optimization
- Implement lazy loading
- Use React.memo for components
- Optimize bundle size
- Implement caching strategies

### 3. API Optimization
- Implement pagination
- Use database query optimization
- Add response caching
- Minimize API calls

This completes the comprehensive CRM service deployment and setup guide. Follow these steps to successfully implement the CRM system in your SAP application.