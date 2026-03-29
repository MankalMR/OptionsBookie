const fs = require('fs');

const file = '.agent/sage/2026-03-22-llm-trade-history-query.md';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `## Status\npending-implementation`,
  `## Status\ndone`
);

content = content + `\n\n## Implementation Notes
- Files changed: \`src/app/api/ai/parse-query/route.ts\`, \`src/components/analytics/TransactionsTable.tsx\`, \`package.json\`
- Behavior: Implemented the natural language parsing route using the \`@google/genai\` SDK. Added a mock fallback mode for \`/demo\` that intercepts specific phrases (like 'TSLA', 'Put', 'win') for deterministic test validation without triggering API calls or requiring keys. Added an inline search field above the analytics transactions table to dispatch queries and show active filter badges.
- Tests: Updated Jest test suite and validated via Playwright locally on \`/demo\`.
- Known follow-ups: The filter is currently scoped to individual instances of the \`TransactionsTable\` (e.g. inside an expanded month's row). If users wish to filter *all* analytics table rows simultaneously, the state should be lifted to the parent page component.`;

fs.writeFileSync(file, content);
