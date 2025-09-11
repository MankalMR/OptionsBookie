# 🔧 Vercel Deployment Troubleshooting Guide

## Common Vercel Deployment Issues & Solutions

### ❌ **Error: supabaseUrl is required**

**Problem:** Supabase environment variables are not set in Vercel.

**Solution:**
1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add these variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXTAUTH_SECRET=your_secret_key
   NEXTAUTH_URL=https://your-app.vercel.app
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```
3. **Redeploy** your app

### ❌ **Build Error: Missing environment variables**

**Problem:** Environment variables are not available during build time.

**Solution:**
- Make sure all `NEXT_PUBLIC_*` variables are set
- Check that variables don't have extra spaces or quotes
- Redeploy after adding variables

### ❌ **Authentication redirects to localhost**

**Problem:** `NEXTAUTH_URL` is set to localhost instead of Vercel URL.

**Solution:**
1. **Update NEXTAUTH_URL in Vercel:**
   ```
   NEXTAUTH_URL=https://your-app-name.vercel.app
   ```
2. **Update Google OAuth redirect URI:**
   - Go to Google Cloud Console
   - Add: `https://your-app-name.vercel.app/api/auth/callback/google`
3. **Redeploy**

### ❌ **Database connection errors**

**Problem:** Supabase credentials are incorrect or RLS policies are blocking access.

**Solution:**
1. **Verify Supabase credentials** in Vercel environment variables
2. **Check Supabase RLS policies** are correctly configured
3. **Test database connection** in Supabase dashboard

### ❌ **Build fails with TypeScript errors**

**Problem:** TypeScript compilation errors during build.

**Solution:**
1. **Fix locally first:**
   ```bash
   npm run type-check
   npm run build
   ```
2. **Commit and push** the fixes
3. **Redeploy**

## 🚀 **Step-by-Step Deployment Fix**

### 1. **Verify Environment Variables**
```bash
# Check your .env.local file
cat .env.local

# Make sure these are set:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=...
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
```

### 2. **Set Vercel Environment Variables**
1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Go to Settings → Environment Variables
4. Add all the variables from your `.env.local`
5. **Important:** Update `NEXTAUTH_URL` to your Vercel URL

### 3. **Update Google OAuth**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`

### 4. **Redeploy**
1. Go to Vercel dashboard
2. Click "Redeploy" or push a new commit
3. Monitor the build logs

## 🔍 **Debugging Commands**

### **Test Build Locally**
```bash
# Test production build
npm run build
npm run start

# Test on port 3000 (Vercel's port)
npm run start
```

### **Check Environment Variables**
```bash
# Check if variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### **Verify Supabase Connection**
```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Service Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
"
```

## 📋 **Pre-Deployment Checklist**

- [ ] All environment variables set in Vercel
- [ ] `NEXTAUTH_URL` points to Vercel URL (not localhost)
- [ ] Google OAuth redirect URI updated
- [ ] Supabase RLS policies configured
- [ ] Build passes locally (`npm run build`)
- [ ] TypeScript errors fixed (`npm run type-check`)

## 🆘 **Still Having Issues?**

### **Check Vercel Logs**
1. Go to Vercel dashboard
2. Click on your deployment
3. Check "Functions" tab for server logs
4. Look for specific error messages

### **Common Error Messages**
- `supabaseUrl is required` → Environment variables not set
- `Invalid API key` → Wrong Supabase credentials
- `redirect_uri_mismatch` → Google OAuth URI not updated
- `Build failed` → TypeScript or build errors

### **Quick Fixes**
1. **Redeploy** after setting environment variables
2. **Clear Vercel cache** (Settings → Functions → Clear Cache)
3. **Check Supabase logs** for database errors
4. **Verify all URLs** are correct (no typos)

## ✅ **Success Indicators**

- ✅ Build completes without errors
- ✅ App loads at Vercel URL
- ✅ Google authentication works
- ✅ Can create/edit/delete trades
- ✅ Data persists correctly

Your app should now be working perfectly on Vercel! 🎉
