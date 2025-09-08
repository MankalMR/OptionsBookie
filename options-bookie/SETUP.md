# OptionsBookie Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and API keys

2. **Set Up Database Schema**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-schema.sql`
   - Run the SQL to create the database schema

3. **Configure Authentication**
   - In Supabase dashboard, go to Authentication > Settings
   - Enable Google OAuth
   - Add your Google OAuth credentials

### 3. Set Up Google OAuth

1. **Create Google OAuth App**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3007/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google` (for production)

2. **Get OAuth Credentials**
   - Copy Client ID and Client Secret

### 4. Configure Environment Variables

1. **Copy Environment Template**
   ```bash
   cp env.example .env.local
   ```

2. **Fill in Your Values**
   ```bash
   # NextAuth.js Configuration
   NEXTAUTH_URL=http://localhost:3007
   NEXTAUTH_SECRET=your-nextauth-secret-here

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id-here
   GOOGLE_CLIENT_SECRET=your-google-client-secret-here
   ```

### 5. Start Development Server

```bash
npm run dev
```

## 🔧 Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 📊 Database Schema

The application uses the following main tables:

- `options_transactions` - Stores all options trades
- `auth.users` - User authentication (managed by Supabase)

## 🔐 Security Features

- **Row Level Security (RLS)** - Users can only access their own data
- **JWT Authentication** - Secure session management
- **Google OAuth** - Secure login with Google
- **API Route Protection** - All API routes require authentication

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard

2. **Update OAuth Redirect URIs**
   - Add your production domain to Google OAuth settings
   - Update `NEXTAUTH_URL` in environment variables

### Other Platforms

- **Netlify** - Similar to Vercel
- **Railway** - Good for full-stack apps
- **DigitalOcean** - VPS deployment

## 🐛 Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Check if user is signed in
   - Verify Supabase RLS policies
   - Check environment variables

2. **Database connection errors**
   - Verify Supabase URL and keys
   - Check if database schema is set up correctly

3. **OAuth errors**
   - Verify Google OAuth credentials
   - Check redirect URIs
   - Ensure NEXTAUTH_URL is correct

### Getting Help

- Check the console for error messages
- Verify all environment variables are set
- Ensure Supabase project is active
- Check Google OAuth configuration

## 📝 Notes

- The app automatically creates user-specific data isolation
- All trades are private to each user
- Database is automatically backed up by Supabase
- No local database files needed
