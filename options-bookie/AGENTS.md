# AGENTS.md

## Project Overview
OptionsBookie is a simplified options trading journal focused on capital efficiency and strategy tracking. It is a **Next.js Monolith** using Supabase for persistence.

The architecture strictly separates:
- **UI** (Next.js App Router)
- **Logic** (Pure TypeScript calculation modules)
- **Data** (Supabase/PostgreSQL)

## 📚 Documentation Index
**READ THESE FIRST** based on your task. You are not expected to read everything, but you **must** read the relevant sections before making changes.

- **[Building & Running](agent_docs/building_the_project.md)**: Setup, dev server, and production build.
- **[Testing & Quality](agent_docs/running_tests.md)**: How to run unit tests and linting. **Critical for logic changes.**
- **[Code Conventions](agent_docs/code_conventions.md)**: Naming, patterns (Repository, Thick Client), and directory structure.
- **[System Architecture](agent_docs/system_architecture.md)**: High-level component map and flow diagrams.
- **[Database Schema](agent_docs/database_schema.md)**: Tables, DTO mappings, and RLS keys.
- **[Security & Safety](agent_docs/security_and_safety.md)**: Auth rules, secret handling, and destructive action protocols.
- **[Domain Logic](agent_docs/domain_logic.md)**: **Highly Recommended** if touching P&L, RoR, or Capital calculations.

## Task Examples

| Task | Relevant Docs | Description |
| :--- | :--- | :--- |
| **Fix P&L Math** | `Domain Logic`, `Testing` | Modify `src/utils/optionsCalculations.ts` and add unit tests. |
| **Add DB Column** | `Database Schema`, `Code Conventions` | Update SQL, Update DTOs in `src/lib`, Update Types. |
| **New Chart** | `System Architecture`, `Code Conventions` | Create component in `src/components/analytics` using existing hooks. |
| **Fix Auth Bug** | `Security & Safety`, `System Architecture` | Check `middleware.ts` or API route session handling. |

## ⚠️ Agent "Do's and Don'ts"

### DO
- **Check `agent_docs/`**: The context you need is likely there.
- **Respect DTOs**: Always update mapping functions in `src/lib/database-supabase.ts` when schema changes.
- **Test Math**: Financial logic changes require unit test verification.
- **Use `process.env`**: Validated access for secrets.

### DON'T
- **No Direct DB Access in UI**: Do not import Supabase client in `src/app` or `src/components`. Use `src/lib` adapters.
- **No Logic in UI**: Do not calculate Annualized RoR inside a React Component. Use `src/utils`.
- **No Unsafe Secrets**: Never hardcode API keys.
- **No CI Changes**: Do not modify build/deploy workflows without explicit instruction.
