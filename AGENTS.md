# AGENTS.md

AI Coding Agent Guide for OptionsBookie

---

## For AI Agents: How to Use This Guide

**Welcome!** You're an AI agent working on the OptionsBookie web application. This file provides a high-level overview and points you to detailed, task-specific documentation.

**Before starting work**:
1. Read this file to understand the project at a high level
2. Identify which task-specific guides are relevant to your work
3. Read **only** the guides you need (progressive disclosure)
4. Refer back to guides as needed during implementation

**Key Rule**: Don't try to read everything at once. Read what's relevant for your current task to save context tokens and focus strictly on the problem domain at hand.

---

## Project Overview

**OptionsBookie** is a comprehensive, full-stack web application designed for options traders. It serves as a specialized trading journal and analytics platform, differentiating itself with advanced domain logic that models capital efficiency and complex trading strategies (e.g., chains, rolls, cash-secured puts).

**Architecture**: A Next.js Monolith leveraging a Serverless/BaaS architecture with Supabase. It balances strict server-side security using Row Level Security (RLS) with a responsive "thick client" approach where complex financial calculations are performed in the browser for real-time interactivity.

**Core Features**:
- Multi-Portfolio Management (e.g., Roth, Speculative)
- Advanced Performance Metrics (P&L, Annualized Return on Risk, Win Rates)
- Capital Efficiency Analysis (Dual Metric system comparing Peak Exposure to Time-Weighted Capital reuse)
- Strategy & Chain Tracking (grouping rolls and lifecycle trades together)
- Fully Isolated "Demo Mode" for prospective users

**Technology Stack**:
- Frontend: Next.js 14.2 (App Router), React 18
- Styling: Tailwind CSS, Shadcn/UI, Lucide React
- Backend: Next.js API Routes, NextAuth.js (Google OAuth)
- Database: Supabase (PostgreSQL) with Row Level Security (RLS)
- External Integrations: AlphaVantage, Finnhub API
- Testing: Jest

---

## Task-Specific Documentation

**📁 Read these guides based on your task:**

### System Architecture & Organization

- **[ARCHITECTURE.md](ARCHITECTURE.md)** (System-wide overview)
  - Complete system architecture map
  - Component analysis (UI, Domain Logic, DAL, Security, Database)
  - Details the "Thick Client" vs "Secure Server" boundary
  - **Read when**: You need to understand the big picture data flow or are touching core infrastructure.

### Financial Math & Domain Logic

- **[CAPITAL_CALCULATION_ARCHITECTURE.md](CAPITAL_CALCULATION_ARCHITECTURE.md)**
  - Deep dive into how OptionsBookie calculates "Smart Capital", RoR, and peak margin usage
  - Explains the critical difference between Chain Capital, Independent Trades, and Time Overlap
  - **Read when**: Working on any calculation bugs, changing `src/utils/optionsCalculations.ts`, or implementing new analytics views.

### Demo Mode Sandbox

- **[DEMO_ARCHITECTURE.md](DEMO_ARCHITECTURE.md)**
  - Documents the isolated, in-memory `globalThis` demo implementation
  - Explains the `ENABLE_DEMO_MODE=1` guard structure and seed data propagation
  - **Read when**: Touching any route inside `src/app/api/demo/`, editing `src/app/demo/page.tsx`, or changing the demo seed data.

### Database Schema & Security

- **[01-initial-database-setup.sql](01-initial-database-setup.sql)**
  - Canonical source of truth for the Supabase schema and RLS policies
  - Includes user `profiles`, `portfolios`, and `options_transactions`
  - **Read when**: Adding new database fields, modifying API calls to `src/lib/database-supabase.ts`, or investigating missing data bugs.

### Agent Specific Code Guides (agent_docs/)

The repository contains several highly specific guides in the `agent_docs/` folder:

- **[Testing & Quality](agent_docs/running_tests.md)**: Rules for Jest testing, evaluating edge cases, and ensuring financial logic remains stable.
- **[Code Conventions](agent_docs/code_conventions.md)**: Naming conventions, the "Thick Client" vs "Repository" pattern distinction, and strict state management rules.
- **[Building & Running](agent_docs/building_the_project.md)**: Details on the dev server, environment variables (`.env.local`), and Vercel build steps.
- **[Security & Safety](agent_docs/security_and_safety.md)**: Guidelines on protecting user data row-level security limits, and avoiding destructive actions.

**Read these when**: You are starting a fundamentally new type of task (e.g. writing your first test, adding a new database table, or installing a new dependency).


---

## Quick Reference

### Quick Commands

```bash
# Start local development server
npm run dev

# Run all tests (critical for calculation changes)
npm test

# Lint the codebase
npm run lint

# Build for production
npm run build
```

### Key Directories

- Pure Logic: `src/utils/` (Math is separated from React!)
- React Pages: `src/app/`
- React Components: `src/components/`, `src/components/analytics/`
- Server API Routes: `src/app/api/`
- Data Access Layer (DAL): `src/lib/` (Supabase adapters, Demo store)
- Types & DTOs: `src/types/`

---

## Critical Do's and Don'ts

### ✅ Always Do

- **Thick Client Approach**: Keep heavy lifting (aggregation, sorting, RoR calculation) in the browser components to reduce server cost and simplify the API layer.
- **Isolate Logic**: Write financial logic as pure, easily testable functions in `src/utils/`. Do NOT embed complex math inside React hooks or TSX files.
- **Respect Boundaries**: The UI must call `src/lib/database-*.ts` adapters. UI components MUST NOT call the Supabase client directly.
- **Write Unit Tests**: Any change to `timeOverlapDetection.ts` or `optionsCalculations.ts` strictly requires Jest test validation.
- **Handle Timezones**: Use ISO strings or `parseLocalDate` consistently, as market hours depend strongly on proper date boundary logic.

### ❌ Never Do

- **Don't hardcode math in TSX**: Separate calculation from presentation.
- **Don't touch the DB without DTO updates**: If changing the `.sql` schema, you must immediately update `OptionsTransaction` Type and its mapper functions in `src/lib/database-supabase.ts` or data will be lost across the boundary.
- **Don't bypass RLS**: Supabase Row Level Security expects `auth.uid()` bounds. Do not write API routes that operate using the `service_role` key unless absolutely necessary (and justified).
- **Don't commit Secrets**: Ensure `SUPABASE_SERVICE_ROLE_KEY`, Google Client IDs, etc. remain in `.env.local` files securely.

---

## Workflow for AI Agents

### Step 1: Understand the Task

1. Identify task type (e.g., adding a UI metric, fixing a math bug, tweaking DB queries)
2. Map it to the architecture layer (Frontend Component, Domain Pure Logic, or Data Access Layer)

### Step 2: Read Relevant Guides

**Only read what you need:**

| Task Type | Guides to Read |
|-----------|----------------|
| Calculations / Analytics | `CAPITAL_CALCULATION_ARCHITECTURE.md`, `src/utils/optionsCalculations.ts` |
| Database fields / Supabase | `01-initial-database-setup.sql`, `src/lib/database.ts` |
| Demo sandbox / Pre-Auth | `DEMO_ARCHITECTURE.md` |
| New Component / Page | `ARCHITECTURE.md` |

### Step 3: Explore Codebase

1. Use keyword searches corresponding to the Data Access Layer OR components
2. Read existing patterns (e.g. `src/hooks/useTransactions.ts` wraps standard data fetching)

### Step 4: Implement Changes

1. Write tests alongside code for any calculation module
2. Verify visual changes run on local dev

### Step 5: Quality Checks

**Before completing your task:**
- ✅ All tests pass: `npm test`
- ✅ Linter errors reviewed (Fix yours, ignore pre-existing warnings in untouched files)
- ✅ Build succeeds: `npm run build`
- ✅ Ensure Demo Mode (`ENABLE_DEMO_MODE=1`) logic wasn't accidentally impacted.

---

## Getting Help

### Documentation

- **This file**: High-level overview and index
- **`ARCHITECTURE.md`**: Deep system architecture

### Version & Maintenance

**Last Updated**: March 2026
**Maintained By**: OptionsBookie Team
**Document Structure**: Progressive disclosure with task-specific mappings

## Progressive Disclosure Reminder

**For AI Agents**: You don't need to read all documentation at once. Start with this file, then read only the guides relevant to your current task. This approach:
- Reduces cognitive load and optimizes token mapping
- Focuses attention on what matters
- Makes information easier to find
- Allows you to output higher quality code efficiently
