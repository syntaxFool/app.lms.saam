# Netlify Deployment Guide

Complete guide to deploying the Shanuzz Academy LMS to Netlify with serverless functions.

## Prerequisites

- [Netlify account](https://netlify.app)
- GitHub repository with code pushed (already done: syntaxFool/app.lms.saam)
- Google Apps Script deployment ID
- Node.js 18+

## Deployment Steps

### 1. Connect to Netlify

**Option A: Connect GitHub Repo (Recommended)**
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select GitHub and authorize Netlify
4. Select repository: `syntaxFool/app.lms.saam`
5. Build settings will auto-detect:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

**Option B: Using Netlify CLI**
```bash
netlify init
netlify deploy --prod
```

### 2. Configure Environment Variables

In Netlify Dashboard → Site settings → Build & deploy → Environment:

```env
# Required for Google Apps Script integration
VITE_API_BASE_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Optional
VITE_APP_TITLE=LeadFlow India
VITE_APP_VERSION=1.0.0
```

### 3. Deploy

**Automatic (Recommended)**
- Push to GitHub → Netlify auto-deploys on every push
- Preview deploys for pull requests

**Manual**
```bash
netlify deploy --prod
```

### 4. Verify Deployment

```bash
# Check deployment status
netlify status

# View live site
netlify open:site
```

## Deployment Configuration

All deployment settings are in `netlify.toml`:

### Build Settings
```toml
[build]
  publish = "dist"           # Output directory
  command = "npm run build"  # Build command
  functions = "netlify/functions"
  environment = { NODE_VERSION = "18" }
```

### SPA Routing
Configured to route all requests to `index.html` for Vue Router:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### API Proxy
Routes API calls through Netlify Functions:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Caching
- **Assets** (JS/CSS/SVG): 1 year (immutable)
- **index.html**: No cache (always fresh)
- **Service Worker** (/sw.js): No cache

### Security Headers
Configured in netlify.toml:
- HSTS (HTTP Strict Transport Security)
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

## Serverless Functions

Netlify Functions in `netlify/functions/`:

### Available Functions
- **auth.ts** - Authentication proxy to Google Apps Script
- **sync.ts** - Data synchronization endpoint
- **proxy.ts** - General API proxy

### Function Configuration
Functions automatically deploy when pushed to GitHub. Access via:
```
https://your-site.netlify.app/.netlify/functions/auth
```

## Performance Optimization

### Built-in Features
✅ **Code Splitting** - Vue Router auto-loads components
✅ **Asset Minification** - Vite optimization
✅ **PWA Support** - Service worker caching
✅ **Image Optimization** - SVG icons with Tailwind
✅ **CDN Delivery** - Netlify CDN caches assets

### Bundle Sizes (Gzip)
- index.js: ~57 KB
- LeadsManager.js: ~90 KB
- Total: ~170 KB

## Troubleshooting

### Build Fails
```bash
# Check build locally
npm run build

# Check for TypeScript errors
npm run type-check

# Review build logs
netlify logs --tail
```

### Functions Not Found
- Ensure `netlify/functions/` directory exists
- Check function exports match `Handler` type
- Review function logs: Netlify Dashboard → Functions

### API Calls Failing
1. Verify `VITE_API_BASE_URL` environment variable
2. Check CORS headers in function response
3. Ensure Google Apps Script is deployed and accessible

### Service Worker Issues
Clear browser cache and hard refresh (Ctrl+Shift+R)

## Environment-Specific Builds

### Production
```toml
[context.production.environment]
  NODE_ENV = "production"
```

### Preview (Deploy Previews)
```toml
[context.preview.environment]
  NODE_ENV = "staging"
```

### Branch Deploys
Pull request previews auto-deploy with unique URLs

## Monitoring & Analytics

### Netlify Analytics
- Dashboard shows:
  - Build history
  - Function invocations
  - Bandwidth usage
  - Deploy logs

### Real User Monitoring
Enable in Netlify Dashboard → Analytics

### Google Analytics
Add to `.env`:
```env
VITE_GOOGLE_ANALYTICS_ID=GA-YOUR-ID
```

## Custom Domain

1. Go to Netlify Dashboard → Domain management
2. Add custom domain
3. Update DNS records (Netlify will show instructions)
4. SSL auto-provisions (takes ~24 hours)

## Disaster Recovery

### Rollback Deployment
1. Netlify Dashboard → Deploys
2. Find previous deployment
3. Click "Publish deploy"

### Database Backup
Google Sheets auto-saves. No additional backup needed.

## GitHub Integration

### Branch Deploy Previews
- Push to non-main branch
- Netlify creates preview URL
- Preview available until branch deleted

### Continuous Deployment
- Push to `main` → production deploy
- Auto-builds and deploys

## Next Steps

1. **Connect GitHub repo** to Netlify
2. **Set environment variables** in Netlify Dashboard
3. **Deploy** - automatic on git push
4. **Test** - verify all features work
5. **Monitor** - check Netlify logs for issues

## Support

- [Netlify Docs](https://docs.netlify.com)
- [Netlify Community](https://community.netlify.com)
- [GitHub Issues](https://github.com/syntaxFool/app.lms.saam/issues)

## Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] GitHub repository connected to Netlify
- [ ] Environment variables configured
- [ ] Build successful (check build logs)
- [ ] Site accessible at Netlify URL
- [ ] SPA routing working (refresh pages)
- [ ] API calls working (check console)
- [ ] Service worker installed (PWA ready)
- [ ] Custom domain configured (optional)
- [ ] HTTPS working and SSL certificate valid

## Quick Commands

```bash
# Deploy current branch
netlify deploy

# Deploy to production
netlify deploy --prod

# Check status
netlify status

# View logs
netlify logs --tail

# Open site in browser
netlify open:site

# Run local server with functions
netlify dev
```

## Additional Resources

- [docs/DEPLOYMENT.md](DEPLOYMENT.md) - Original deployment guide
- [netlify.toml](../netlify.toml) - Deployment configuration
- [package.json](../package.json) - Build scripts
- [GITHUB_INTEGRATION_CHECKLIST.md](GITHUB_INTEGRATION_CHECKLIST.md) - GitHub setup guide
