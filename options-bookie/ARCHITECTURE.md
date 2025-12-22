# System Architecture

## 1. Executive Summary

**OptionsBookie** is a comprehensive, full-stack web application designed for options traders. It serves as a specialized trading journal and analytics platform, differentiating itself with advanced domain logic that models capital efficiency and complex trading strategies (e.g., chains, rolls, cash-secured puts).

The system is built as a **Next.js Monolith** leveraging a **Serverless/BaaS** architecture with Supabase. It balances strict server-side security using Row Level Security (RLS) with a responsive "thick client" approach where complex financial calculations are performed in the browser for real-time interactivity.

### Key System Capabilities
- **Multi-Portfolio Management**: Segregation of trades into distinct portfolios (e.g., Roth, Speculative).
- **Advanced Performance Metrics**: Real-time calculation of P&L, Annualized Return on Risk (RoR), and Win Rates.
- **Capital Efficiency Analysis**: A proprietary "Dual Metric" system that calculates returns based on both *Peak Exposure* (concurrent trades) and *Time-Weighted Capital* (capital reuse).
- **Strategy & Chain Tracking**: Grouping related trades (e.g., rolling a position) into "Chains" to track the lifecycle of a strategy involving multiple transactions.

---

## 2. High-Level Architecture

The system follows a standard modern web application flow:
1.  **Identity Provider**: Authenticates users.
2.  **Next.js Server**: Serves the UI and proxies API requests.
3.  **Database Layer**: Enforces security policies and stores data.
4.  **Client Application**: Performs heavy lifting for data visualization and calculation.

```mermaid
graph TD
    User[User] -->|HTTPS| NextApp[Next.js Application (Vercel)]
    
    subgraph "Frontend Layer (Client Browser)"
        NextApp --> Components[UI Components]
        Components --> LogicEngine[Domain Logic Engine]
        LogicEngine -->|Calculates| Analytics[Analytics & Metrics]
        
        subgraph "Logic Engine Modules"
            Calc[optionsCalculations.ts]
            Overlap[timeOverlapDetection.ts]
        end
    end

    subgraph "Backend Services (API Routes)"
        NextApp -->|API Requests| APIRoutes[/api/transactions]
        APIRoutes -->|Server Session| NextAuth[NextAuth.js]
        APIRoutes --> DAL[Data Access Layer (lib/database)]
    end

    subgraph "External Services"
        NextAuth -->|OAuth| Google[Google Identity]
        DAL -->|Postgres Protocol| SupabaseDB[(Supabase PostgreSQL)]
        DAL -->|HTTP| MarketData[AlphaVantage/Finnhub API]
    end

    subgraph "Database Layer (Supabase)"
        SupabaseDB -->|Enforces| RLS[Row Level Security]
        RLS --> Tables[Tables: Transactions, Portfolios]
        Tables -->|Triggers| DBLogic[PL/pgSQL Functions]
    end
```

---

## 3. Component Architecture

### 3.1 Frontend Subsystem
The user interface is built mainly using Client Components to support heavy interactivity (modals, sorting, filtering).

*   **Responsibilities**:
    *   Primary user interaction and workflow orchestration (`AddTransaction`, `EditTransaction`).
    *   Real-time data transformation: Converting raw transaction lists into aggregated analytics (Monthly Summaries, Charts).
    *   Local State Management: Handling UI state (selected portfolio, active tab) via React Hooks.
*   **Key Modules**:
    *   **Core Pages** (`src/app/page.tsx`): The central controller that fetches data and passes it to child views.
    *   **Visualization Components** (`src/components/analytics/*`): specialized views like `SummaryView`, `TransactionTable`, and `SymbolGroupedView`.
    *   **Data Hooks** (`src/hooks/useTransactions.ts`): Custom hooks that encapsulate data fetching logic and error handling.
*   **Patterns & Frameworks**:
    *   **Next.js App Router**: Hybrid rendering (Server Shell + Client Leaf Nodes).
    *   **Tailwind CSS & Shadcn/UI**: Component-first styling system.
    *   **Thick Client**: Derived data is computed on the fly in the browser, reducing server load and storage redundancy.

### 3.2 Domain Logic Engine
This subsystem encapsulates the complex mathematical rules of options trading. It is the "Brain" of the application.

*   **Responsibilities**:
    *   **P&L Calculation**: Computing profit/loss based on premiums, fees, and exit prices.
    *   **Capital Efficiency**: Detecting if trades overlap in time to accurately measure capital usage ("Dual Metric System").
    *   **Date Normalization**: Handling timezone complexities inherent in market close times (expiry dates).
*   **Key Modules**:
    *   **`optionsCalculations.ts`**: Pure functions for standard financial math (RoR, Collateral, Break-even).
    *   **`timeOverlapDetection.ts`**: Specialized algorithm that sorts trades by time and detects concurrent exposure vs. sequential capital reuse.
*   **Patterns**:
    *   **Functional Programming**: Stateless, pure functions ensuring deterministic calculations.
    *   **Strategy Pattern**: `getStrategyType` dynamically classifies trades (e.g., "Cash-Secured Put") based on attributes.

### 3.3 Data Access Layer (DAL) & API
This layer isolates the application from the specific database implementation and handles data sanitization.

*   **Responsibilities**:
    *   Validation of user sessions before allowing data access.
    *   Mapping between database rows (snake_case) and application entities (camelCase).
    *   Abstracting external market data providers.
*   **Key Modules**:
    *   **API Routes** (`src/app/api/*`): Next.js API endpoints acting as a secure gateway.
    *   **Service Adapter** (`src/lib/database-supabase.ts`): The concrete implementation of the repository interface using the Supabase SDK.
    *   **Market Data Factory** (`src/lib/stock-price-factory.ts`): Providing a unified interface for fetching stock prices, supporting multiple providers (AlphaVantage, Finnhub, Cache).
*   **Patterns**:
    *   **Repository Pattern**: separating the business logic from the data retrieval mechanism.
    *   **Factory Pattern**: Instantiating the correct stock price service based on configuration.
    *   **DTO (Data Transfer Object)**: Standardizing data shapes across the boundary.

### 3.4 Security & Authentication Service
Security is implemented using a "Defense in Depth" strategy, relying on API-level checks and database-level enforcement.

*   **Responsibilities**:
    *   **Authentication**: Verifying identity via Google OAuth (NextAuth.js) using a **JWT strategy** (Supabase Adapter is currently decoupled).
    *   **Authorization**: Ensuring users can strictly access only their own data.
*   **Key Modules**:
    *   **NextAuth.js**: Handling the OAuth lifecycle and session management.
    *   **Row Level Security (RLS)**: PostgreSQL policies defined in `01-initial-database-setup.sql` that physically prevent cross-tenant data access at the database engine level.
    *   **API Routes**: Each API endpoint manually verifies the session (`getServerSession`) before processing requests.
    *   **Middleware** (`middleware.ts`): Handles **Security Headers** (HSTS, CSP, XSS) and rate limiting. *Note: It currently does not enforce auth redirects; protection is at the API/Page level.*
*   **Patterns**:
    *   **Policy-Based Access Control**: Declarative security rules in the database schema.

### 3.5 Database Layer
The persistence layer is a Postgres database hosted on Supabase.

*   **Schema Overview**:
    *   `profiles`: User metadata linked to Auth.
    *   `portfolios`: Logical groupings of trades.
    *   `options_transactions`: The core ledger of trading activity.
*   **Key Features**:
    *   **Triggers**: `update_updated_at_column` helps maintain data integrity.
    *   **Constraints**: `ensure_single_default_portfolio` ensures business rules are enforced at the data level.

---

## 4. Repository Structure

```text
options-bookie/
├── .agent/                 # Workflows and agent-specific configuration
├── agent_docs/             # Context-specific documentation for AI agents
├── public/                 # Static assets (images, icons)
├── scripts/                # Utility scripts for DB migration and debugging
├── supabase/               # Supabase configuration and schema snapshots
├── src/
│   ├── app/                # Next.js App Router root
│   │   ├── api/            # Server-side API Routes (REST endpoints)
│   │   ├── auth/           # NextAuth.js configuration
│   │   ├── layout.tsx      # Root application shell
│   │   └── page.tsx        # Main Dashboard / Entry point
│   ├── components/
│   │   ├── analytics/      # specialized charts and summary cards
│   │   ├── ui/             # Reusable UI primitives (buttons, inputs)
│   │   ├── *Modals.tsx     # Forms for data entry (Add, Edit, Delete)
│   │   └── *Views.tsx      # Different data presentations (Table vs Grouped)
│   ├── hooks/              # React hooks for fetching data & managing state
│   ├── lib/                # Backend services & adapters
│   │   ├── database-*.ts   # Database repository implementations
│   │   └── stock-price-*.ts# Market data service implementations
│   ├── types/              # TypeScript definitions (Interfaces & DTOs)
│   ├── utils/              # Pure domain logic functions
│   │   ├── optionsCalculations.ts # Financial math core
│   │   └── timeOverlapDetection.ts# Capital efficiency algorithms
│   └── middleware.ts       # Route protection middleware
├── 01-initial-database-setup.sql  # Canonical source for DB Schema & RLS
├── CAPITAL_CALCULATION_ARCHITECTURE.md # Deep dive into the math engine
├── README.md               # User-facing project documentation
└── package.json            # Dependencies and scripts
```
