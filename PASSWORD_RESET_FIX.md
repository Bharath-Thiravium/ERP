# Password Reset Conflict Fix

## Problem Analysis

The issue was in the workflow logic where both **first-time company creation** and **admin password reset** used the same `must_change_password` flag, causing confusion:

1. **First-time creation**: Company gets auto-generated password → Login → Force password change (NOT NEEDED)
2. **Admin reset**: Master admin resets password → Company login → Force password change (NEEDED)

Both scenarios triggered the same forced password change, making it impossible to distinguish between them.

## Solution Implemented

### 1. Database Changes

**Added new field to CompanyUser model:**
```python
password_reset_by_admin = models.BooleanField(default=False)
```

### 2. Backend Logic Updates

**Company Creation (serializers.py):**
```python
CompanyUser.objects.create(
    user=user,
    company=company,
    created_by=self.context['request'].user,
    password_expires_at=timezone.now() + timedelta(days=90),
    must_change_password=False,  # First time creation doesn't require forced password change
    password_reset_by_admin=False
)
```

**Login Logic (serializers.py):**
```python
# Check if password was reset by admin (only for approved companies)
elif company_user.password_reset_by_admin:
    attrs['force_password_reset'] = True
```

**Password Reset by Admin (views.py):**
```python
# Set password change requirement for admin reset
company_user.must_change_password = True
company_user.password_reset_by_admin = True  # NEW FLAG
company_user.password_expires_at = timezone.now() + timezone.timedelta(days=90)
company_user.save()
```

**Password Change Success (views.py):**
```python
# Clear both flags when password is successfully changed
company_user.must_change_password = False
company_user.password_reset_by_admin = False  # Clear admin reset flag
company_user.save()
```

### 3. Frontend Updates

**Auth Store (authStore.ts):**
- Added `forcePasswordReset` state
- Handle `force_password_reset` flag from login response
- Store/restore state from sessionStorage

**Auth Wrapper (AuthWrapper.tsx):**
```typescript
const shouldShowPasswordModal = mustChangePassword || forcePasswordReset

<PasswordChangeModal
  isOpen={shouldShowPasswordModal}
  title={forcePasswordReset ? 'Password Reset Required' : 'Password Change Required'}
  message={forcePasswordReset 
    ? 'Your password has been reset by an administrator. Please set a new password to continue.'
    : 'You must change your password to continue using the system.'
  }
/>
```

## Workflow After Fix

### First-Time Company Creation
1. Master admin creates company with auto-generated password
2. Company user logs in with auto-generated password
3. **NO forced password change** - goes directly to dashboard
4. User can optionally change password later

### Admin Password Reset
1. Master admin clicks "Reset Password" button
2. New password generated, `password_reset_by_admin = True`
3. Company user logs in with new password
4. **FORCED password change** with clear message about admin reset
5. After password change, both flags are cleared

## Files Modified

### Backend
- `authentication/models.py` - Added `password_reset_by_admin` field
- `authentication/serializers.py` - Updated creation and login logic
- `authentication/views.py` - Updated reset and change password logic
- `authentication/migrations/0002_add_password_reset_by_admin.py` - Migration file

### Frontend
- `store/authStore.ts` - Added force password reset state management
- `components/auth/AuthWrapper.tsx` - Updated to handle both scenarios
- `components/auth/PasswordChangeModal.tsx` - Added custom title/message support
- `types/index.ts` - Added `force_password_reset` to LoginResponse

## Migration Instructions

1. **Run the migration:**
   ```bash
   cd backend
   python run_migration.py
   ```

2. **Restart the backend server:**
   ```bash
   python manage.py runserver
   ```

3. **Clear browser cache/localStorage** to ensure frontend gets updated state

## Testing

### Test First-Time Creation
1. Create new company as master admin
2. Login with generated credentials
3. Should go directly to dashboard (no forced password change)

### Test Admin Password Reset
1. Go to master admin → Companies list
2. Click "Reset Password" for an existing company
3. Login with new credentials
4. Should show "Password Reset Required" modal with admin message
5. After changing password, should access dashboard normally

## Benefits

✅ **Clear separation** between first-time setup and admin reset  
✅ **Better user experience** - no confusion about why password change is required  
✅ **Proper messaging** - users know if admin reset their password  
✅ **Backward compatible** - existing functionality unchanged  
✅ **Secure** - maintains all security requirements