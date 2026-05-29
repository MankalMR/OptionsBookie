# Feature Ticket: SEO Metadata & H1 Hierarchy

## Status
completed

## Context
Standardizing heading hierarchy and adding granular metadata is critical for search engines to understand the relationship between pages and their relevance to specific queries.

## Tasks
- [x] Standardize `<h1>` tags across all public pages (About, Contact, Landing).
- [x] Add unique `Metadata` exports to `/about`, `/contact`, `/etfs`, and `/cot-analysis`.
- [x] Implement visually hidden `<h1>` on the Dashboard for accessibility and SEO.
- [x] Refactor `/etfs` and `/cot-analysis` to Server Components to support metadata.

## Implementation Details
- **Dashboard**: Added a `.sr-only` h1 to maintain accessibility while satisfying crawler requirements for a primary heading.
- **Analytics Pages**: Converted `page.tsx` in `/etfs` and `/cot-analysis` to server components, moving client logic to sister components.
- **Metadata**: Added descriptive titles and meta descriptions that target "Options Tracker", "Portfolio Analytics", and "COT Data".
