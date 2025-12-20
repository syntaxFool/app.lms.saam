# GitHub Integration & Netlify Connection Checklist

Complete checklist for connecting your GitHub repository to Netlify for continuous deployment.

## Phase 1: GitHub Repository Setup ✅

- [x] Code pushed to `https://github.com/syntaxFool/app.lms.saam`
- [x] Git history clean
- [x] All branches synced
- [x] `.gitignore` configured (node_modules, dist, .env, etc.)
- [x] README.md with project description
- [x] License file included

## Phase 2: Repository Configuration

### GitHub Secrets (for local deployments)
1. Go to Repository → Settings → Secrets and variables → Actions
2. Add secrets:

```
NETLIFY_AUTH_TOKEN=<your-netlify-auth-token>
NETLIFY_SITE_ID=<your-netlify-site-id>
```

To get these:
- Go to [Netlify User Settings](https://app.netlify.com/user/applications)
- Create new access token → Copy `NETLIFY_AUTH_TOKEN`
- Go to site settings → Copy `NETLIFY_SITE_ID`

### Branch Protection (Optional but Recommended)
1. Repository → Settings → Branches
2. Add rule for `main`:
   - Require status checks to pass before merging
   - Include Netlify preview checks

## Phase 3: Netlify Connection

### Step 1: Create Netlify Account
- Go to [netlify.app](https://netlify.app)
- Sign up with GitHub account (or connect existing account)

### Step 2: Connect Repository
1. Click "Add new site" → "Import an existing project"
2. Select GitHub
3. Authorize Netlify to access your GitHub account
4. Select repository: `syntaxFool/app.lms.saam`

### Step 3: Configure Build Settings
Netlify will auto-detect:

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |
| **Functions directory** | `netlify/functions` |
| **Node version** | `18.x` |

✅ These are already correct in `netlify.toml`

### Step 4: Set Environment Variables
In Netlify Dashboard:
1. Go to Site settings → Build & deploy → Environment
2. Add environment variables:

```
VITE_API_BASE_URL = https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_GOOGLE_CLIENT_ID = your_client_id
VITE_APP_TITLE = LeadFlow India
```

### Step 5: Deploy
Click "Deploy site" or push code to trigger auto-deploy

## Phase 4: Continuous Deployment Setup

### Automatic Deployments
These happen automatically:

| Trigger | Action | URL |
|---------|--------|-----|
| Push to `main` | Deploys to production | `your-site.netlify.app` |
| Push to other branch | Creates preview deploy | `branch-name--your-site.netlify.app` |
| Pull request | Creates preview deploy | `deploy-preview-XX--your-site.netlify.app` |

### Manual Deployment (Optional)
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## Phase 5: Verification

### Check Site is Live
- [ ] Site accessible at `https://your-site.netlify.app`
- [ ] Site has Netlify subdomain or custom domain
- [ ] SSL certificate valid (HTTPS working)

### Verify Build Works
- [ ] Netlify Dashboard shows successful build
- [ ] Build logs show no errors
- [ ] All assets loaded correctly
- [ ] No broken links in console

### Test Functionality
- [ ] Home page loads
- [ ] Login works
- [ ] Navigation works (SPA routing)
- [ ] API calls work (check Network tab)
- [ ] Service worker registered (Application tab)
- [ ] PWA installable

### Check Functions
- [ ] `/api/auth` endpoint accessible
- [ ] `/api/sync` endpoint accessible  
- [ ] Function logs visible in Netlify Dashboard

## Phase 6: Domain Configuration (Optional)

### Add Custom Domain
1. Netlify Dashboard → Domain management
2. Click "Add custom domain"
3. Enter your domain (e.g., `app.saam.co.in`)
4. Update DNS records with Netlify provider info
5. Wait for DNS propagation (up to 24 hours)

### DNS Records
Netlify will provide these records to add to your domain registrar:

```
Type: ALIAS
Name: your-domain
Value: your-site.netlify.app
```

## Phase 7: Monitoring & Logs

### Build Logs
1. Go to Netlify Dashboard → Deploys
2. Click on any deploy to see logs
3. Useful for debugging build failures

### Function Logs
1. Go to Netlify Dashboard → Functions
2. See recent invocations and logs
3. Set up alerts for errors

### Analytics
1. Go to Netlify Dashboard → Analytics
2. View:
   - Build counts and times
   - Function invocations
   - Bandwidth usage

## Phase 8: Optimization Settings

### Presets (Optional)
Netlify Dashboard → Site settings → Build & deploy → Presets:
- [ ] Asset optimization
- [ ] Minify CSS
- [ ] Minify JavaScript
- [ ] Pretty URLs (already handled by redirects)

### Caching
✅ Already configured in `netlify.toml`:
- Assets: 1 year
- HTML: No cache
- Service Worker: No cache

## Integration Tests

After deployment, verify everything works:

### Frontend Tests
```bash
# Check build size
npm run build

# Audit performance
npm audit

# Type check
npm run type-check
```

### Browser Console
Open DevTools (F12) and check:
- No 404 errors
- No CORS errors
- Service worker: "Successfully registered"
- Network tab: All API calls successful

### Functionality Tests
- [ ] Create lead
- [ ] Edit lead
- [ ] Delete lead
- [ ] Filter leads
- [ ] View reports
- [ ] Offline mode (enable offline in DevTools)

## Troubleshooting

### Build Fails
1. Check build logs in Netlify Dashboard
2. Verify environment variables set
3. Run `npm run build` locally to reproduce
4. Check Node.js version matches (18.x)

### Functions Not Working
1. Verify `netlify/functions/` directory exists
2. Check function names match redirects in `netlify.toml`
3. Test locally: `netlify dev`
4. View function logs in Netlify Dashboard

### API Calls Failing
1. Check `VITE_API_BASE_URL` environment variable
2. Verify Google Apps Script endpoint is deployed
3. Check CORS headers in function response
4. Review browser console for errors

### Service Worker Issues
1. Check Network tab for `sw.js` 404 errors
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+Shift+R)
4. Check Application tab → Service Workers

### Slow Builds
1. Check dependencies size: `npm ls --depth=0`
2. Remove unused packages
3. Check if node_modules properly cached
4. Look for slow build steps in logs

## Security Checklist

- [ ] HTTPS enabled (automatic with Netlify)
- [ ] Security headers configured (in netlify.toml)
- [ ] Environment variables not exposed in logs
- [ ] No sensitive data in `.gitignore`
- [ ] GitHub Secrets properly configured
- [ ] Rate limiting on API endpoints (consider adding)
- [ ] CORS properly configured in functions

## Performance Checklist

- [ ] Build time under 3 minutes
- [ ] Gzip compression enabled (automatic)
- [ ] Assets cached aggressively
- [ ] HTML not cached (always fresh)
- [ ] Service worker installed
- [ ] Images optimized

## Post-Deployment Checklist

- [ ] Site is live and accessible
- [ ] All pages load without errors
- [ ] Navigation and routing work
- [ ] API integration works
- [ ] Forms submit successfully
- [ ] Mobile responsive
- [ ] PWA installable
- [ ] Offline functionality works
- [ ] Analytics tracking active (if configured)

## Maintenance

### Regular Updates
```bash
# Update dependencies monthly
npm update

# Audit security vulnerabilities
npm audit fix

# Test locally before pushing
npm run build
npm run preview
```

### Monitor Deploys
- Check Netlify Dashboard weekly
- Review build logs for warnings
- Monitor function performance
- Check analytics trends

### GitHub Workflow (Recommended)
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit
3. Push to GitHub: `git push origin feature/your-feature`
4. Create Pull Request
5. Netlify creates preview deploy
6. Test preview
7. Merge to main
8. Netlify deploys to production

## Additional Resources

- [Netlify Docs](https://docs.netlify.com)
- [GitHub Docs](https://docs.github.com)
- [Vite Docs](https://vitejs.dev)
- [Vue 3 Docs](https://vuejs.org)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)

## Support Contacts

- Netlify Support: [support.netlify.com](https://support.netlify.com)
- GitHub Support: [github.community](https://github.community)
- Project Issues: [GitHub Issues](https://github.com/syntaxFool/app.lms.saam/issues)

## Quick Links

| Resource | URL |
|----------|-----|
| **Netlify App** | https://app.netlify.com |
| **GitHub Repo** | https://github.com/syntaxFool/app.lms.saam |
| **Your Site** | https://your-site.netlify.app |
| **Netlify Docs** | https://docs.netlify.com |
| **Build Commands** | `npm run build`, `npm run preview` |

---

**Status**: Ready for deployment ✅
**Last Updated**: December 20, 2025
**Next Step**: Connect GitHub repo to Netlify Dashboard
