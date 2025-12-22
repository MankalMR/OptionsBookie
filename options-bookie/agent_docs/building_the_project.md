# Building and Running the Project

## Prerequisites
- Node.js 18+ (LTS)
- npm
- Supabase Account
- Google OAuth Credentials (optional but recommended)

## Installation
```bash
npm install
```

## Environment Variables
Create a `.env.local` file. The application relies on these for Auth, DB connection, and Market Data.

### Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key # Keep private!

# Connectivity
NEXT_PUBLIC_SITE_URL=http://localhost:3007 # or your vercel url
NEXTAUTH_URL=http://localhost:3007         # Must match site url
NEXTAUTH_SECRET=your_random_secret
```

### Market Data (Optional but Recommended)
The app uses a Factory pattern (`src/lib/stock-price-factory.ts`) to choose a provider.
```env
ALPHA_VANTAGE_KEY=your_key
FINNHUB_API_KEY=your_key
```

### Site Customization (Optional)
```env
NEXT_PUBLIC_SITE_NAME=OptionsBookie
NEXT_PUBLIC_AUTHOR_NAME=Your Name
```

## Database Setup
1.  Run the contents of `01-initial-database-setup.sql` in your Supabase SQL Editor.
2.  (Optional) Run any additional scripts from `scripts/migration/` if dealing with a legacy DB.
*Note: `npm run db:setup` is just a placeholder echo command.*

## Development Server
Runs on port **3007**.
```bash
npm run dev
```

## Production Build
```bash
npm run build
npm start
```

## Deployment (Vercel)
This project is optimized for **Vercel**.
1.  Import project to Vercel.
2.  Add **Environment Variables** in the dashboard.
3.  Deploy.
*See `DEPLOYMENT.md` in root for a detailed guide.*
