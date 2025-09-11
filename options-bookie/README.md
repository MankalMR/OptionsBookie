# 📈 OptionsBookie

A comprehensive options trading tracker built with Next.js, Supabase, and NextAuth.js. Track your options trades across multiple portfolios with detailed analytics, real-time stock prices, and performance metrics.

## 👤 Author

**Manohar Mankala**
Email: manohar.mankala@gmail.com
Domain: [options-bookie.mankala.space](https://options-bookie.mankala.space)

## ✨ Features

- **📊 Multi-Portfolio Support**: Organize trades across multiple portfolios with default portfolio functionality
- **💹 Real-time Stock Prices**: Live stock prices with 1-day caching via Finnhub API
- **🎯 ITM Indicators**: Smart In-The-Money indicators for both Call and Put options (only for open trades)
- **📈 Comprehensive Trade Tracking**: Track all aspects of options trades including P&L, days held, and annualized returns
- **⚡ Auto-Expiry Management**: Automatic detection and status updates for expired trades
- **📊 Real-time Analytics**: Portfolio performance metrics with unrealized and realized P&L
- **🔐 Secure Authentication**: Google OAuth integration with NextAuth.js
- **🎨 Modern UI**: Responsive design built with Tailwind CSS and Shadcn/ui components
- **🗄️ Robust Database**: PostgreSQL database with Supabase and Row Level Security (RLS)

## 🚀 Quick Start

## 🛠️ Technology Stack

### **Frontend**
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[React 18](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - Modern component library
- **[Lucide React](https://lucide.dev/)** - Beautiful icons

### **Backend & Database**
- **[Supabase](https://supabase.com/)** - PostgreSQL database with real-time features
- **[NextAuth.js](https://next-auth.js.org/)** - JWT-based authentication (no database adapter)
- **[Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)** - Email-based database security

### **External APIs**
- **[Finnhub API](https://finnhub.io/)** - Real-time stock price data
- **[Google OAuth](https://developers.google.com/identity/protocols/oauth2)** - User authentication

### **Deployment**
- **[Vercel](https://vercel.com/)** - Serverless deployment platform
- **Custom Domain**: [options-bookie.mankala.space](https://options-bookie.mankala.space)

### Prerequisites

- Node.js 20.18.0 or later
- Supabase account
- Google OAuth credentials
- Finnhub API key (free tier available)

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
   FINNHUB_API_KEY=your-finnhub-api-key
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

## 🗄️ Database Architecture

### Overview

OptionsBookie uses **Supabase (PostgreSQL)** with **NextAuth.js JWT strategy** for a secure, scalable architecture. The system uses **email-based authentication** without database sessions, keeping the database focused on business logic.

### **🔐 Authentication System**

- **NextAuth.js with JWT Strategy**: No database adapter (all sessions are JWT-based)
- **Google OAuth**: Secure sign-in flow
- **Email-based User ID**: Uses user email as the primary identifier
- **No Session Storage**: JWTs eliminate need for database session management

### **📊 Database Tables (Your Actual Setup)**

#### **✅ Active Business Tables**

| Table | Purpose | Key Fields | User Identification |
|-------|---------|------------|-------------------|
| **`options_transactions`** | ✅ **CORE** - Options trades | `id`, `user_id` (email), `portfolio_id`, `stock_symbol`, `call_or_put`, `strike_price`, `profit_loss`, `status` | `user_id = auth.email()` |
| **`portfolios`** | ✅ **ACTIVE** - Portfolio organization | `id`, `user_id` (email), `name`, `description`, `is_default` | `user_id = auth.email()` |
| **`stock_price_cache`** | ✅ **SHARED** - Cached stock prices | `symbol`, `price`, `change`, `cached_at` (1-day TTL) | Shared across all users |

#### **🗑️ Removed Tables**

These NextAuth.js tables were **removed** because they're unused with JWT strategy:

| Table | Status | Reason for Removal |
|-------|--------|--------------------|
| **`users`** | 🗑️ **Removed** | JWT strategy doesn't use database for user storage |
| **`accounts`** | 🗑️ **Removed** | JWT strategy doesn't use database for OAuth connections |
| **`sessions`** | 🗑️ **Removed** | JWT strategy doesn't use database sessions |
| **`verification_tokens`** | 🗑️ **Removed** | JWT strategy doesn't use database for tokens |
| **`profiles`** | 🗑️ **Removed** | Legacy table, not actively used |

> **💡 Clean Architecture**: OptionsBookie uses JWT strategy (`session: { strategy: "jwt" }`) which stores authentication data in encrypted JWT tokens, not the database. This keeps the database focused purely on business logic.
>
> **📁 Backup Available**: Table schemas are preserved in `scripts/migration/backup-nextauth-schema.sql` for reference.

### **🔒 Actual Security Architecture**

```mermaid
graph TD
    A[User Signs in with Google] --> B[NextAuth.js creates JWT]
    B --> C[JWT contains user email]
    C --> D[API routes validate JWT]
    D --> E[Database queries use auth.email()]
    E --> F[RLS policies enforce email-based access]
    F --> G[User sees only their data]
```

#### **Email-based Row Level Security (RLS)**
Your app uses **simplified, email-based security**:

```sql
-- Your ACTUAL RLS policy (simplified & effective)
CREATE POLICY "Users can view their own transactions"
ON options_transactions FOR SELECT
USING (user_id = auth.email());  -- Direct email comparison!

CREATE POLICY "Users can view their own portfolios"
ON portfolios FOR SELECT
USING (user_id = auth.email());  -- Email-based isolation
```

#### **Security Benefits**:
- ✅ **Simpler Debug**: Email-based policies are easy to understand
- ✅ **No UUID Complexity**: Direct email comparison in policies
- ✅ **JWT Performance**: No database lookups for session validation
- ✅ **Data Isolation**: Users can only access their own trades/portfolios

### **📈 Stock Price Integration**

- **API Provider**: Finnhub (free tier: 60 calls/minute)
- **Caching Strategy**: 1-day TTL in `stock_price_cache` table
- **Shared Cache**: All users benefit from cached prices (not user-specific)
- **Circuit Breaker**: Rate limiting and graceful degradation
- **ITM Detection**: Smart Call/Put In-The-Money indicators

### Database Setup

For detailed database setup instructions, see [DATABASE_SETUP.md](./DATABASE_SETUP.md).

#### Quick Database Setup

1. **Fresh Installation**: Run `01-initial-database-setup.sql` in Supabase SQL Editor
2. **Migration**: Use scripts in `scripts/migration/` directory in order

## 📁 Project Structure

```
options-bookie/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth.js authentication
│   │   │   ├── portfolios/    # Portfolio management
│   │   │   ├── stock-prices/  # Stock price API (Finnhub)
│   │   │   └── transactions/  # Options trade management
│   │   └── page.tsx           # Main dashboard page
│   ├── components/            # React components
│   │   ├── AddTransactionModal.tsx
│   │   ├── EditTransactionModal.tsx
│   │   ├── PortfolioSelector.tsx
│   │   ├── PortfolioSummary.tsx
│   │   ├── StockPriceDisplay.tsx  # Stock price & ITM indicators
│   │   ├── TransactionTable.tsx
│   │   └── SummaryView.tsx
│   ├── hooks/                 # Custom React hooks
│   │   └── useStockPrices.ts  # Stock price management
│   ├── lib/                   # Core libraries
│   │   ├── auth.ts           # NextAuth.js configuration
│   │   ├── database-*.ts     # Database access layers
│   │   ├── stock-price-*.ts  # Stock price services
│   │   └── stock-price-factory.ts  # Service factory pattern
│   ├── types/                # TypeScript definitions
│   │   └── options.ts        # Core trading types
│   └── utils/                # Utility functions
│       └── optionsCalculations.ts  # P&L calculations
├── scripts/                  # Database & deployment scripts
│   ├── migration/           # Database migration scripts
│   │   └── create-stock-price-cache-table.sql
│   ├── pre-commit-security-check.sh
│   └── README.md
├── public/                   # Static assets
├── 01-initial-database-setup.sql  # Complete database setup
├── DATABASE_SETUP.md        # Database setup guide
├── DEPLOYMENT_GUIDE.md      # Vercel deployment guide
├── STOCK_PRICE_SETUP.md     # Stock price API guide
└── VERCEL_TROUBLESHOOTING.md  # Deployment troubleshooting
```

## 🧩 Key Components

### **📊 Dashboard Components**
- **`PortfolioSelector`**: Multi-portfolio management with default portfolio support
- **`PortfolioSummary`**: Real-time portfolio metrics (realized/unrealized P&L, win rate)
- **`TransactionTable`**: Comprehensive options trade management with filtering
- **`SummaryView`**: Advanced analytics and performance insights

### **💹 Stock Price Components**
- **`StockPriceDisplay`**: Real-time stock prices with trend indicators
- **`ITMIndicator`**: Smart In-The-Money indicators (Call/Put aware, open trades only)
- **`useStockPrices`**: Efficient stock price fetching with caching

### **✏️ Trade Management**
- **`AddTransactionModal`**: Full-featured trade entry with validation
- **`EditTransactionModal`**: Complete trade editing capabilities
- **Auto-expiry detection**: Automatic status updates for expired options

## 🎯 Features in Detail

### **📈 Portfolio Management**
- ✅ **Multi-Portfolio Support**: Organize trades across unlimited portfolios
- ✅ **Default Portfolio**: Set a default portfolio for quick access
- ✅ **Portfolio Switching**: View all trades or filter by specific portfolio
- ✅ **Safe Deletion**: Portfolio deletion with data protection checks
- ✅ **Portfolio Analytics**: Individual portfolio performance tracking

### **💰 Advanced Trade Tracking**
- ✅ **Complete Options Data**: Strike price, premium, expiry, contracts, fees
- ✅ **Smart P&L Calculations**: Automatic profit/loss calculations
- ✅ **Trade Status Management**: Open → Closed/Expired/Assigned workflow
- ✅ **Days Held Tracking**: Automatic calculation of holding periods
- ✅ **Annualized Returns**: ROI calculations based on holding period
- ✅ **Break-even Analysis**: Automatic break-even price calculations

### **📊 Real-time Stock Integration**
- ✅ **Live Stock Prices**: Real-time prices via Finnhub API
- ✅ **Smart Caching**: 1-day cache reduces API calls and improves performance
- ✅ **ITM Detection**: Automatic In-The-Money detection for Calls and Puts
- ✅ **Price Change Indicators**: Visual trend indicators (↗️/↘️)
- ✅ **Rate Limiting**: Circuit breaker pattern for API protection

### **📈 Analytics & Insights**
- ✅ **Unrealized P&L**: Live tracking of open positions
- ✅ **Realized P&L**: Historical performance of closed trades
- ✅ **Win/Loss Ratios**: Success rate calculations
- ✅ **Portfolio Performance**: Comprehensive portfolio-level metrics
- ✅ **Trade Distribution**: Analysis across different stocks and strategies

## 🔐 Security

### **Authentication Architecture**
- **NextAuth.js JWT Strategy**: Stateless authentication without database sessions
- **Google OAuth Integration**: Secure, industry-standard authentication flow
- **Email-based User Identification**: Simple, debuggable user identification system

### **Database Security**
- **Row Level Security (RLS)** enabled on all business tables
- **Email-based Policies**: `user_id = auth.email()` for data isolation
- **Portfolio Ownership Validation**: Users can only access their own portfolios
- **Transaction Security**: Users can only see trades in their portfolios

### **API Security**
- **JWT Session Validation**: All API routes validate NextAuth JWT tokens
- **Email-based Authorization**: Database queries filtered by user email
- **Input Validation**: Proper data validation on all endpoints
- **Error Handling**: Secure error responses without data leakage

### **Why This Architecture is Secure**
- ✅ **No Session Hijacking**: JWTs eliminate database session vulnerabilities
- ✅ **Simple RLS Policies**: Email-based policies are easy to audit and debug
- ✅ **Google OAuth Trust**: Leverages Google's robust authentication infrastructure
- ✅ **Data Isolation**: Complete separation between user data
- ✅ **Stateless Design**: No server-side session state to compromise

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

## Support

For issues and questions:
1. Check the [DATABASE_SETUP.md](./DATABASE_SETUP.md) guide
2. Review the debug scripts in `scripts/debug/`
3. Check Supabase logs for database issues
4. Verify environment variables are correctly set

## 📋 Changelog

### **v2.0.0 - Stock Price Integration & UI Enhancements**
- ✅ **Real-time Stock Prices**: Finnhub API integration with 1-day caching
- ✅ **ITM Indicators**: Smart Call/Put In-The-Money detection (open trades only)
- ✅ **Auto-expiry Management**: Automatic detection and status updates for expired trades
- ✅ **UI Modernization**: Shadcn/ui components with improved layouts
- ✅ **Performance Optimization**: Removed auto-refresh intervals, respects cache
- ✅ **API Architecture**: Factory pattern for stock price services with circuit breaker

### **v1.5.0 - Portfolio & P&L Enhancements**
- ✅ **Default Portfolio Support**: Set and manage default portfolios
- ✅ **Simplified P&L Logic**: Streamlined unrealized/realized P&L calculations
- ✅ **Enhanced Portfolio Analytics**: Comprehensive portfolio-level metrics
- ✅ **Trade Status Expansion**: Open/Closed/Expired/Assigned status workflow
- ✅ **Database Optimization**: Improved RLS policies and data integrity

### **v1.0.0 - Core Platform**
- ✅ **Multi-portfolio Support**: Organize trades across multiple portfolios
- ✅ **Portfolio Management**: Create, edit, delete portfolios with safety checks
- ✅ **Comprehensive Trade Tracking**: Full options trade lifecycle management
- ✅ **Secure Authentication**: Google OAuth with NextAuth.js integration
- ✅ **Database Architecture**: PostgreSQL with Supabase and Row Level Security
- ✅ **Modern UI**: Responsive design with Tailwind CSS

### **Recent Cleanup & Optimization**
- ✅ **Repository Cleanup**: Removed debugging and temporary migration scripts
- ✅ **Code Organization**: Improved project structure and documentation
- ✅ **Performance**: Eliminated unnecessary auto-refresh mechanisms
- ✅ **Documentation**: Comprehensive README, setup guides, and troubleshooting