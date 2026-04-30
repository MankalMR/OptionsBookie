# Feature Ticket: Dynamic Sitemap Generation

## Status
completed

## Context
A sitemap helps search engines discover all accessible content on the site. Ensuring it includes the demo and other high-value pages is critical for SEO.

## Tasks
- [x] Refactor `sitemap.ts` to include the `/demo` route.
- [x] Standardize priorities and change frequencies across all routes.
- [x] Ensure the sitemap is linked in `robots.txt` (verified).

## Implementation Details
- **Demo Visibility**: The `/demo` route is now explicitly included with a high priority (0.9), as it provides the best interactive experience for first-time visitors.
- **Maintenance**: Structured the sitemap logic to be easily extendable as new feature pages are added.
