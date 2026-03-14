# Code Conventions and Standards

## Language & Frameworks
- **Language:** TypeScript (Strict Mode). Avoid `any`.
- **Framework:** Next.js 14+ (App Router).
- **Styling:** Tailwind CSS + Shadcn/UI.

## Architecture Patterns
- **Thick Client:** Derived data (P&L, Aggregates) is computed in the browser (`src/utils`) to ensure responsiveness. Do not push this logic to the DB/API unless performance demands it.
- **Repository Pattern:** UI components (`src/app`, `src/components`) must **never** access Supabase directly. Use the service adapters in `src/lib/`.

## Naming Conventions
| Context | Convention | Example |
| :--- | :--- | :--- |
| **TypeScript Variables** | camelCase | `tradeOpenDate` |
| **Database Columns** | snake_case | `trade_open_date` |
| **React Components** | PascalCase | `TransactionTable` |
| **Files** | camelCase / PascalCase | `optionsCalculations.ts`, `SummaryView.tsx` |

## State Management
- Use **React Hooks** (`useState`, `useContext`) for local state.
- Data fetching is handled via custom hooks implementation (`useTransactions`).
- No global store (Redux/Zustand) is currently used.

## Directory Structure Strategy
- **`src/utils/`**: Pure, stateless logic only. No JSX.
- **`src/lib/`**: Side-effect heavy code (API calls, DB connections).
- **`src/components/ui/`**: Dumb, presentation-only components.
