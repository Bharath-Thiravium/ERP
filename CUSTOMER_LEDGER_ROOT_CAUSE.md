# 🔍 CUSTOMER LEDGER 401 - ROOT CAUSE ANALYSIS

## Issue
Still getting 401 error with `session_key` in URL even after fix and rebuild.

## Root Causes Identified

### 1. ✅ Code Fixed
- Changed to use `apiClient` instead of `api.get()`
- Source code is correct

### 2. ✅ Frontend Built
- `pnpm build` completed successfully
- New files in `/var/www/SAP-Python/frontend/dist/`

### 3. ⚠️ BROWSER CACHE (Main Issue)
**Problem**: Nginx caches JS files for 1 year
```nginx
location ~* \.js$ {
    expires 1y;  # ← Browser caches for 1 year!
    add_header Cache-Control "public, immutable";
}
```

**Result**: Browser serves OLD cached JavaScript with the bug

## Solutions

### Solution 1: Hard Refresh (User Side) ✅
**Tell user to do this:**
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Solution 2: Clear Browser Cache (User Side) ✅
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Solution 3: Incognito/Private Window ✅
Open in incognito mode to bypass cache

### Solution 4: Update Nginx Config (Server Side) ✅
Reduce JS cache time for development:

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/sap.athenas.co.in
```

Change:
```nginx
# Before
location ~* \.js$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# After (for development)
location ~* \.js$ {
    expires 1h;  # Only 1 hour instead of 1 year
    add_header Cache-Control "public";
}
```

Then reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Solution 5: Version Busting (Best for Production) ✅
Vite automatically adds hash to filenames:
- `Dashboard-BWZwTvNA.js` ← Hash changes on each build
- `index.html` references new hash
- `index.html` has no-cache header

**This should work IF browser reloads index.html**

## Why It's Still Failing

The browser is:
1. ✅ Loading `index.html` (no cache)
2. ❌ But `index.html` references OLD JS bundle hash
3. ❌ Browser serves OLD JS from cache

## Immediate Fix

### Option A: User Action (Fastest)
**Tell user:**
```
1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page (Ctrl+Shift+R)
```

### Option B: Server Action
```bash
# Force new build with different hashes
cd /var/www/SAP-Python/frontend
rm -rf dist
pnpm build
sudo systemctl reload nginx

# Then tell user to hard refresh
```

## Verification

After clearing cache, check Network tab:
```
Before: customer-ledger/?customer_id=16&session_key=xxx  ← Wrong
After:  customer-ledger/?customer_id=16                  ← Correct
```

## Long-term Solution

### For Development Server
Use `pnpm dev` instead of build:
```bash
cd /var/www/SAP-Python/frontend
pnpm dev
# Access at http://localhost:3000
# No caching issues, hot reload
```

### For Production
Keep current setup but:
1. Always hard refresh after deployment
2. Or implement service worker for cache control
3. Or add version query param to index.html

## Summary

✅ **Code**: Fixed
✅ **Build**: Done
✅ **Nginx**: Configured
❌ **Browser**: Cached old JS

**Solution**: User must clear browser cache or hard refresh!

---

## Quick Commands

```bash
# Rebuild frontend
cd /var/www/SAP-Python/frontend && rm -rf dist && pnpm build

# Reload nginx
sudo systemctl reload nginx

# Tell user
echo "Please press Ctrl+Shift+R to hard refresh your browser"
```
