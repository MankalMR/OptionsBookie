## 2024-03-09 - ARIA Labels on Icon-only Buttons
**Learning:** Icon-only utility buttons (like Edit, Delete) in data tables often lack accessible names for screen readers when they only contain Lucide React Icons.
**Action:** Always verify that utility buttons using `size="icon"` or containing only an icon have an explicit `aria-label` describing the action (e.g., `aria-label="Edit transaction"`).
