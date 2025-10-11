# 2FA Reset Script Usage Guide

## Problem
If you accidentally refresh the 2FA setup page before scanning the QR code, the 2FA gets marked as "enabled" but you haven't actually scanned the code, leaving you locked out.

## Solution 1: Backend Script (Quick Fix)

### Usage
```bash
cd /home/athenas/sap\ project/backend
python scripts/reset_master_admin_2fa.py <master_admin_email>
```

### Example
```bash
python scripts/reset_master_admin_2fa.py admin@athenas.co.in
```

### What it does
- Resets `two_factor_enabled` to `False`
- Clears the `two_factor_secret`
- Allows you to start fresh 2FA setup

## Solution 2: Frontend Fix (Permanent Solution)

The frontend has been updated to:

1. **Persistent QR Code**: QR code remains visible even after page refresh until you complete verification
2. **Proper Verification Flow**: 
   - Step 1: Generate QR code (doesn't enable 2FA yet)
   - Step 2: Scan QR code with authenticator app
   - Step 3: Enter verification code to complete setup
3. **Reset Button**: Added "Reset Setup" button to start over if needed

## How the New Flow Works

1. Click "Enable Two-Factor Auth"
2. QR code appears (2FA not enabled yet)
3. Scan QR code with your authenticator app
4. Enter the 6-digit code from your app
5. Click "Complete 2FA Setup"
6. 2FA is now properly enabled

## Features Added

- ✅ QR code persists across page refreshes
- ✅ Proper verification before enabling 2FA
- ✅ Reset button to start over
- ✅ Clear status indicators
- ✅ Backend script for emergency reset

## Security Notes

- The script requires direct database access
- Only use the script in emergency situations
- The new frontend flow prevents the original issue
- All 2FA operations are logged for security audit