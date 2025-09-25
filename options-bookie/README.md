# OptionsBookie

A comprehensive options trading tracker built with Next.js, Supabase, and NextAuth.js. Track your options trades across multiple portfolios with detailed analytics and performance metrics.

## Author

**Manohar Mankala**
Email: manohar.mankala@gmail.com

## Features

- **Multi-Portfolio Support**: Organize trades across multiple portfolios
- **Comprehensive Trade Tracking**: Track all aspects of options trades including P&L, days held, and annualized returns
- **Real-time Analytics**: View portfolio performance and trade statistics
- **Secure Authentication**: Google OAuth integration with NextAuth.js
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Data Persistence**: PostgreSQL database with Supabase

## 🚀 Quick Start

### Prerequisites

- Node.js 20.18.0 or later
- Supabase account
- Google OAuth credentials

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd options-bookie
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   ```env
   NEXTAUTH_URL=http://localhost:3007
   NEXTAUTH_SECRET=your-secret-key
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Set up the database**
   - Open your Supabase SQL Editor
   - Run the contents of `01-initial-database-setup.sql`
   - See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3007](http://localhost:3007)

### 🚀 Deploy to Vercel (Recommended)

Deploy your app to Vercel in just a few clicks:

1. **Push your code to GitHub**
2. **Go to [vercel.com](https://vercel.com)**
3. **Import your GitHub repository**
4. **Add environment variables**
5. **Deploy!**

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## Database Setup

For detailed database setup instructions, see [DATABASE_SETUP.md](./DATABASE_SETUP.md).

### Quick Database Setup

1. **Fresh Installation**: Run `01-initial-database-setup.sql` in Supabase SQL Editor
2. **Migration**: Use scripts in `scripts/migration/` directory in order

## Project Structure

```
options-bookie/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   └── page.tsx        # Main page
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── scripts/               # Database scripts
│   ├── setup/            # Initial setup scripts
│   ├── migration/        # Migration scripts
│   └── debug/            # Debug scripts
├── 01-initial-database-setup.sql  # Main database setup
└── DATABASE_SETUP.md     # Database setup guide
```

## Key Components

- **PortfolioSelector**: Manage and switch between portfolios
- **TransactionTable**: View and manage options trades
- **PortfolioSummary**: Portfolio performance overview
- **AddTransactionModal**: Add new trades
- **EditTransactionModal**: Edit existing trades
- **SummaryView**: Analytics and performance metrics

## Features in Detail

### Portfolio Management
- Create multiple portfolios
- Set default portfolio
- Delete portfolios (with safety checks)
- Switch between portfolios or view all

### Trade Tracking
- Complete options trade information
- Automatic P&L calculations
- Days held tracking
- Annualized return calculations
- Break-even price calculations

### Analytics
- Portfolio performance metrics
- Win/loss statistics
- Total P&L tracking
- Trade distribution analysis

## Security

- **Row Level Security (RLS)** enabled on all database tables
- **Email-based authentication** ensures users only access their own data
- **Portfolio ownership validation** prevents unauthorized access
- **Secure API routes** with proper authentication

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Scripts

- `01-initial-database-setup.sql` - Complete database setup
- `scripts/migration/` - Migration scripts for existing databases
- `scripts/debug/` - Debug and testing scripts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## 📚 Documentation

- [Setup Guide](SETUP.md) - Complete setup including database, environment, and local development
- [Deployment Guide](DEPLOYMENT.md) - Deploy to Vercel with troubleshooting
- [Security Guide](SECURITY.md) - Comprehensive security implementation and best practices

## Support

For issues and questions:
1. Check the [Setup Guide](SETUP.md) for configuration help
2. Review the [Deployment Guide](DEPLOYMENT.md) for deployment issues
3. Check the [Security Guide](SECURITY.md) for security-related questions
4. Review the debug scripts in `scripts/debug/`

## Changelog

### Recent Updates
- ✅ Multi-portfolio support
- ✅ Portfolio deletion functionality
- ✅ Improved UI layout and organization
- ✅ Comprehensive database setup scripts
- ✅ Repository cleanup and organization