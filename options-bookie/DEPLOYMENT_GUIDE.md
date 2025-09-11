# 🚀 Vercel Deployment Guide

Deploy your OptionsBookie app to Vercel in just a few clicks!

## Why Vercel?

- ✅ **Built for Next.js** - Zero configuration needed
- ✅ **Free tier** with generous limits
- ✅ **Automatic deployments** from Git
- ✅ **Built-in environment variables** management
- ✅ **Custom domains** included
- ✅ **No Docker/containerization** needed

## Step 1: Prepare Your Code

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

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
   - Sign up/Login with your GitHub account

2. **Import your project**
   - Click "New Project"
   - Select your GitHub repository
   - Vercel will auto-detect it's a Next.js app

3. **Configure environment variables**
   - In the "Environment Variables" section, add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     NEXTAUTH_SECRET=your_nextauth_secret
     NEXTAUTH_URL=https://your-app-name.vercel.app
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     PERPLEXITY_API_KEY=your_perplexity_api_key
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `https://your-app-name.vercel.app`

### Option B: Deploy via Vercel CLI

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

## Step 3: Update Google OAuth

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

## Step 4: Test Your Deployment

1. **Visit your app**: `https://your-app-name.vercel.app`
2. **Test authentication**: Sign in with Google
3. **Test functionality**: Create portfolios, add trades
4. **Verify data persistence**: Check Supabase for your data

## Step 5: Set Up Custom Domain (Optional)

1. **In Vercel dashboard**:
   - Go to your project settings
   - Click "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

## Automatic Deployments

Once set up:
- **Every push to main branch** = automatic deployment
- **Pull requests** = preview deployments
- **Zero downtime** updates

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `NEXTAUTH_SECRET` | Random secret for NextAuth | `your-secret-key` |
| `NEXTAUTH_URL` | Your Vercel app URL | `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxx` |

## Troubleshooting

### Common Issues

1. **Build fails**
   - Check Vercel build logs
   - Ensure all dependencies are in `package.json`
   - Verify environment variables are set

2. **Authentication doesn't work**
   - Check Google OAuth redirect URI
   - Verify `NEXTAUTH_URL` matches your Vercel URL
   - Ensure all secrets are correctly set

3. **Database connection issues**
   - Verify Supabase credentials
   - Check if your Supabase project allows connections from Vercel
   - Ensure RLS policies are correctly configured

### Debug Commands

```bash
# Test production build locally
npm run build
npm run start

# Check Vercel CLI
vercel --version
vercel env ls
```

## Performance

- **Build time**: ~2-3 minutes
- **Cold start**: ~1-2 seconds
- **Hot reload**: Instant
- **Global CDN**: Fast worldwide

## Cost

- **Free tier**: 100GB bandwidth/month
- **Pro tier**: $20/month for more resources
- **Custom domains**: Free
- **SSL certificates**: Free and automatic

## Next Steps

1. **Monitor usage** in Vercel dashboard
2. **Set up analytics** (optional)
3. **Configure custom domain** (optional)
4. **Set up monitoring** (optional)

Your OptionsBookie app will be live on Vercel in minutes! 🎉

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js on Vercel**: [vercel.com/docs/frameworks/nextjs](https://vercel.com/docs/frameworks/nextjs)
- **Environment Variables**: [vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables)