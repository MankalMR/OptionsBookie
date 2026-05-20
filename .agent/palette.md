## 2024-05-20 - Expand/Collapse Accessibility
**Learning:** Icon-only and inline text toggle buttons used for expanding sections often lack visible focus states in default Shadcn/Tailwind setups, rendering them invisible to keyboard-only users.
**Action:** When implementing expand/collapse toggle buttons, always append `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` and link the button to its target container using an `id` and `aria-controls` pair, along with managing the `aria-expanded` state.
