# ✅ Vercel Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] TypeScript errors fixed
- [x] Build passes successfully (`npm run build`)
- [x] No linting errors
- [x] All features working locally

### ✅ Environment Setup
- [ ] Supabase project configured
- [ ] Google OAuth credentials set up
- [ ] Environment variables ready

### ✅ Database Setup
- [ ] Supabase database schema created
- [ ] RLS policies configured
- [ ] Test data migrated (if needed)

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Vercel will auto-detect Next.js

### 3. Configure Environment Variables
In Vercel dashboard, add these secrets:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app-name.vercel.app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4. Update Google OAuth
1. Go to Google Cloud Console
2. Add redirect URI: `https://your-app-name.vercel.app/api/auth/callback/google`

### 5. Test Deployment
- [ ] App loads successfully
- [ ] Google authentication works
- [ ] Can create portfolios
- [ ] Can add/edit/delete trades
- [ ] Data persists correctly

## Post-Deployment

### ✅ Verify Everything Works
- [ ] Authentication flow
- [ ] Portfolio management
- [ ] Trade CRUD operations
- [ ] Data persistence
- [ ] UI responsiveness

### ✅ Monitor
- [ ] Check Vercel logs for errors
- [ ] Monitor Supabase usage
- [ ] Test with different browsers

## Troubleshooting

### Common Issues
1. **Build fails**: Check TypeScript errors
2. **Auth doesn't work**: Verify Google OAuth redirect URI
3. **Database errors**: Check Supabase credentials and RLS policies
4. **App doesn't load**: Check environment variables

### Debug Commands
```bash
# Test build locally
npm run build
npm run start

# Check types
npm run type-check

# Check linting
npm run lint
```

## Success! 🎉

Your OptionsBookie app should now be live on Vercel!
