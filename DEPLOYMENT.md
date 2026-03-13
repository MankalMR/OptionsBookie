# 🚀 Deployment Guide

Complete deployment guide for OptionsBookie including Vercel setup, environment configuration, and troubleshooting.

## 📋 Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [Custom Domain Setup](#custom-domain-setup)
- [Troubleshooting](#troubleshooting)
- [Performance & Monitoring](#performance--monitoring)

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [x] TypeScript errors fixed
- [x] Build passes successfully (`npm run build`)
- [x] No linting errors
- [x] All features working locally
- [x] Tests passing (`npm test`)

### Environment Variables
- [x] All required environment variables documented
- [x] No hardcoded secrets in code
- [x] `.env.local` file properly ignored by git
- [x] Production environment variables ready

### Database
- [x] Supabase project created and configured
- [x] Database schema deployed
- [x] RLS policies configured
- [x] Test data added (optional)

### Security
- [x] Security headers implemented
- [x] CSP policies configured
- [x] Authentication working
- [x] No sensitive data exposed

### Performance
- [x] Images optimized
- [x] Bundle size reasonable
- [x] No memory leaks
- [x] Loading times acceptable

---

## 🚀 Vercel Deployment

### Why Vercel?

- ✅ **Built for Next.js** - Zero configuration needed
- ✅ **Free tier** with generous limits
- ✅ **Automatic deployments** from Git
- ✅ **Built-in environment variables** management
- ✅ **Custom domains** included
- ✅ **No Docker/containerization** needed
- ✅ **Global CDN** for fast loading
- ✅ **SSL certificates** automatic

### Step 1: Prepare Your Code

1. **Make sure your app works locally**:
   ```bash
   npm run build
   npm run start
   ```

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
   - Sign up/Login with your GitHub account

2. **Import your project**
   - Click "New Project"
   - Select your GitHub repository
   - Vercel will auto-detect it's a Next.js app

3. **Configure environment variables** (see [Environment Variables](#environment-variables) section)

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `https://your-app-name.vercel.app`

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to your Vercel account
   - Set up environment variables
   - Deploy!

### Step 3: Update OAuth Settings

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Navigate to your OAuth 2.0 credentials

2. **Add Authorized Redirect URI**:
   ```
   https://your-app-name.vercel.app/api/auth/callback/google
   ```

3. **Update NEXTAUTH_URL** in Vercel:
   - Go to your Vercel project settings
   - Update `NEXTAUTH_URL` to your Vercel URL

### Step 4: Test Your Deployment

1. **Visit your app**: `https://your-app-name.vercel.app`
2. **Test authentication**: Sign in with Google
3. **Test functionality**: Create portfolios, add trades
4. **Verify data persistence**: Check Supabase for your data

---

## ⚙️ Environment Variables

### Required Variables

Set these in your Vercel project settings:

```env
# Site URL
NEXT_PUBLIC_SITE_URL=https://your-app-name.vercel.app

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app-name.vercel.app

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Optional Variables

```env
# SEO & Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=your_gtm_id

# Site Customization
NEXT_PUBLIC_SITE_NAME=OptionsBookie
NEXT_PUBLIC_SITE_DESCRIPTION=Your custom description
NEXT_PUBLIC_SITE_KEYWORDS=your,keywords,here
NEXT_PUBLIC_AUTHOR_NAME=Your Name
NEXT_PUBLIC_AUTHOR_URL=https://your-website.com
NEXT_PUBLIC_AUTHOR_EMAIL=your@email.com
```

### Environment Variables Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_SITE_URL` | Your app URL | `https://your-app.vercel.app` | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` | ✅ |
| `NEXTAUTH_SECRET` | Random secret for NextAuth | `your-secret-key` | ✅ |
| `NEXTAUTH_URL` | Your Vercel app URL | `https://your-app.vercel.app` | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` | ❌ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxx` | ❌ |

---

## 🌐 Custom Domain Setup

### Step 1: Add Domain in Vercel

1. **Go to your Vercel project**
2. **Click "Settings" → "Domains"**
3. **Add your custom domain**
4. **Follow DNS configuration instructions**

### Step 2: Configure DNS

Add these DNS records to your domain:

| Type | Name | Value |
|------|------|-------|
| CNAME | `www` | `cname.vercel-dns.com` |
| A | `@` | `76.76.19.61` |

### Step 3: Update Environment Variables

Update these variables with your custom domain:

```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
```

### Step 4: Update OAuth Settings

Add your custom domain to Google OAuth:

```
https://yourdomain.com/api/auth/callback/google
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Fails
**Symptoms**: Build fails in Vercel with errors

**Solutions**:
- Check Vercel build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly
- Test build locally: `npm run build`

#### 2. Authentication Doesn't Work
**Symptoms**: Can't sign in or authentication errors

**Solutions**:
- Check Google OAuth redirect URI matches your Vercel URL
- Verify `NEXTAUTH_URL` matches your Vercel URL exactly
- Ensure all OAuth secrets are correctly set
- Check Supabase auth configuration

#### 3. Database Connection Issues
**Symptoms**: Can't connect to database or data not loading

**Solutions**:
- Verify Supabase credentials are correct
- Check if your Supabase project allows connections from Vercel
- Ensure RLS policies are correctly configured
- Test database connection with debug scripts

#### 4. Environment Variables Not Working
**Symptoms**: App behaves differently in production

**Solutions**:
- Check variable names (case-sensitive)
- Ensure variables are set in correct environment (Production/Preview)
- Verify `NEXT_PUBLIC_` prefix for client-side variables
- Redeploy after adding new variables

### Debug Commands

```bash
# Test production build locally
npm run build
npm run start

# Check Vercel CLI
vercel --version
vercel env ls

# Check environment variables
vercel env pull .env.local
```

### Getting Help

1. **Check Vercel logs** in your project dashboard
2. **Review build logs** for specific errors
3. **Test locally** with production environment variables
4. **Check Supabase logs** for database issues
5. **Review this documentation** for common solutions

---

## 📊 Performance & Monitoring

### Performance Metrics

- **Build time**: ~2-3 minutes
- **Cold start**: ~1-2 seconds
- **Hot reload**: Instant
- **Global CDN**: Fast worldwide
- **Bundle size**: Optimized automatically

### Monitoring

1. **Vercel Analytics** (built-in)
   - Page views and performance
   - Real user monitoring
   - Core Web Vitals

2. **Google Analytics** (optional)
   - User behavior tracking
   - Conversion tracking
   - Custom events

3. **Supabase Monitoring**
   - Database performance
   - API usage
   - Error tracking

### Cost

- **Free tier**: 100GB bandwidth/month
- **Pro tier**: $20/month for more resources
- **Custom domains**: Free
- **SSL certificates**: Free and automatic

---

## 🔄 Automatic Deployments

Once set up:
- **Every push to main branch** = automatic deployment
- **Pull requests** = preview deployments
- **Zero downtime** updates
- **Rollback capability** if needed

---

## 📚 Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Custom Domains](https://vercel.com/docs/custom-domains)
- [Analytics](https://vercel.com/docs/analytics)

---

## 🎉 Success!

Your OptionsBookie app is now live on Vercel!

- **URL**: `https://your-app-name.vercel.app`
- **Custom Domain**: `https://yourdomain.com` (if configured)
- **Monitoring**: Available in Vercel dashboard
- **Updates**: Automatic on every push

Enjoy your deployed options trading tracker! 🚀
