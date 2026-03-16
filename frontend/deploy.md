# SAP System Frontend Deployment Guide

## Hostinger Deployment

### Prerequisites
1. Hostinger hosting account with Node.js support
2. Domain configured
3. Backend API deployed and accessible

### Environment Configuration

1. Create production environment file:
```bash
cp .env.example .env.production
```

2. Update production environment variables:
```env
VITE_API_URL=https://your-api-domain.com/api
VITE_WS_URL=wss://your-api-domain.com/ws
VITE_BASE_PATH=/            # Use /dashboard/ if app is hosted under /dashboard
VITE_NODE_ENV=production
VITE_ENABLE_DEVTOOLS=false
```

### Build Process

1. Install dependencies:
```bash
pnpm install
```

2. Run type checking:
```bash
pnpm run type-check
```

3. Build for production:
```bash
pnpm run build
```

4. Test production build locally:
```bash
pnpm run preview
```

### Hostinger Deployment Steps

1. **Upload Files**
   - Compress the `dist` folder contents
   - Upload to your domain's public_html folder via File Manager or FTP

2. **Configure Redirects**
   Create `.htaccess` file in public_html:
   ```apache
   RewriteEngine On
   RewriteBase /

   # Never rewrite static asset requests to index.html
   RewriteRule ^assets/ - [L]
   
   # Handle client-side routing
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   
   # Security headers
   Header always set X-Content-Type-Options nosniff
   Header always set X-Frame-Options DENY
   Header always set X-XSS-Protection "1; mode=block"
   Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
   
   # Compression
   <IfModule mod_deflate.c>
       AddOutputFilterByType DEFLATE text/plain
       AddOutputFilterByType DEFLATE text/html
       AddOutputFilterByType DEFLATE text/xml
       AddOutputFilterByType DEFLATE text/css
       AddOutputFilterByType DEFLATE application/xml
       AddOutputFilterByType DEFLATE application/xhtml+xml
       AddOutputFilterByType DEFLATE application/rss+xml
       AddOutputFilterByType DEFLATE application/javascript
       AddOutputFilterByType DEFLATE application/x-javascript
   </IfModule>
   
   # Cache static assets
   <IfModule mod_expires.c>
       ExpiresActive on
       ExpiresByType text/css "access plus 1 year"
       ExpiresByType application/javascript "access plus 1 year"
       ExpiresByType image/png "access plus 1 year"
       ExpiresByType image/jpg "access plus 1 year"
       ExpiresByType image/jpeg "access plus 1 year"
       ExpiresByType image/gif "access plus 1 year"
       ExpiresByType image/svg+xml "access plus 1 year"
   </IfModule>
   ```

3. **SSL Configuration**
   - Enable SSL in Hostinger control panel
   - Update API URLs to use HTTPS

4. **Domain Configuration**
   - Point domain to hosting
   - Configure DNS if needed

### Performance Optimization

1. **Enable Compression**
   - Gzip compression is handled by .htaccess
   - Verify compression is working

2. **CDN Setup** (Optional)
   - Configure Cloudflare or similar CDN
   - Update asset URLs if needed

3. **Monitoring**
   - Set up error tracking (Sentry)
   - Configure analytics if needed

### Troubleshooting

1. **Routing Issues**
   - Ensure .htaccess is properly configured
   - Check server supports mod_rewrite

2. **API Connection Issues**
   - Verify CORS settings on backend
   - Check SSL certificates
   - Confirm API URLs are correct

3. **Performance Issues**
   - Enable compression
   - Optimize images
   - Use CDN for static assets

### Automated Deployment (Optional)

Create GitHub Actions workflow:
```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Build
      run: pnpm run build
      
    - name: Deploy to Hostinger
      uses: SamKirkland/FTP-Deploy-Action@4.0.0
      with:
        server: your-ftp-server.com
        username: ${{ secrets.FTP_USERNAME }}
        password: ${{ secrets.FTP_PASSWORD }}
        local-dir: ./dist/
        server-dir: /public_html/
```

### Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] All routes work (no 404s)
- [ ] API connections successful
- [ ] WebSocket connections working
- [ ] Authentication flow works
- [ ] All modules accessible
- [ ] Mobile responsiveness
- [ ] Performance acceptable
- [ ] SSL certificate valid
- [ ] Error tracking configured
