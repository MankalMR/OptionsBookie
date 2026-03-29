## 2024-03-09 - ARIA Labels on Icon-only Buttons
**Learning:** Icon-only utility buttons (like Edit, Delete) in data tables often lack accessible names for screen readers when they only contain Lucide React Icons.
**Action:** Always verify that utility buttons using `size="icon"` or containing only an icon have an explicit `aria-label` describing the action (e.g., `aria-label="Edit transaction"`).
## 2024-03-24 - Loading States for Async Actions
**Learning:** Destructive actions (like deleting transactions or chains) need clear, immediate visual feedback to prevent duplicate submissions and user anxiety during network delays. Modals that unmount upon successful backend API responses provide an excellent opportunity to display a localized `isDeleting` state.
**Action:** When working on modals triggering async operations, implement an explicit loading state (e.g., using a `Loader2` spinning icon and text change) and disable relevant buttons (cancel, close, submit) to ensure a robust user experience. Wait for the external API promise to resolve before allowing the parent component to unmount the modal.

## 2024-03-26 - Disabled states & Loaders on Modals
**Learning:** Adding the `Loader2` component from `lucide-react` onto asynchronous form submissions (Save Trade, Save Changes, Create Portfolio) not only gives an important visual indication of activity but preventing multi-clicks is vital since async actions like saving to the DB can take upwards of a few seconds.
**Action:** When working on generic Shadcn `Button` elements handling form submissions or async operations, always incorporate a disabled state boolean linked directly to the `Promise` resolution cycle (usually a `useState` tracking `loading` or `isSubmitting`), and replace the text with a spinning `Loader2` indicator for immediate feedback.
