## 2024-03-19 - UseMemo Missing Dependencies

 **Learning:** When adding `useMemo` hooks, be incredibly careful with the dependency arrays and ensure they exactly match the variables utilized inside the memoized function. For instance, in `quickStatsData`, adding `transactions` into the dependency array was superfluous. Also, don't forget to add inline comments documenting the optimizations as this is a strict requirement for Bolt PRs.
 **Action:** Prioritize explicitly matching dependency arrays to variables inside `useMemo`, and double-check prompt requirements before submitting for code review.
