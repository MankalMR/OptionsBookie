# Feature Ticket: Homepage SSR Refactor for SEO

## Status
completed

## Context
The current home page (`src/app/page.tsx`) is a Client Component (`'use client'`). This forces search engines to execute JavaScript to see any content and results in a "Loading..." spinner being the only thing indexed.

## Objective
Convert the homepage into a Server Component. serve a robust "Landing Page" as static HTML to improve SEO crawlability and provide a faster initial experience.

## Scope
- In scope:
  - Remove `'use client'` from `src/app/page.tsx`.
  - Move interactive dashboard logic to `src/components/Dashboard.tsx`.
  - Create a `LandingPage` component in `src/components/home/LandingPage.tsx` with high-quality SEO content.
  - Implement a server-side session check to toggle between Landing Page and Dashboard.
- Out of scope:
  - Detailed design of the dashboard.
  - Redesigning the analytics logic.

## Tech Plan
- Components:
  - `src/app/page.tsx`: Server Component.
  - `src/components/Dashboard.tsx`: Client Component for the main app.
  - `src/components/home/LandingPage.tsx`: Server-rendered component for marketing content.
- Logic:
  - Use `auth()` or equivalent session helper to check login status on the server.
  - Deliver static HTML containing key keywords: "Options Trading Tracker", "P&L Analytics", "Covered Calls".

## Acceptance Criteria
- [ ] `src/app/page.tsx` is a Server Component.
- [ ] Landing page content is visible in "View Page Source".
- [ ] Authenticated users still see their dashboard.
