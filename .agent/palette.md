## 2024-04-01 - Raw HTML Elements in Components
**Learning:** Native HTML `<button>` elements with raw Tailwind classes often bypass global design system conventions, leading to a lack of proper focus states and accessibility features like `focus-visible`.
**Action:** Always prefer design system components (e.g., Shadcn UI `<Button>`) over raw HTML elements to ensure consistent accessibility states and screen reader support out of the box. Ensure semantic class names (`text-muted-foreground`) are used instead of non-existent arbitrary values (`text-muted-foreground600`).
