# Running Tests and Quality Checks

## Testing
Jest is used for unit testing. The primary focus of testing is the **Domain Logic Engine** in `src/utils/`, as incorrect financial math is a critical failure mode.

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Strategy
1.  **Domain Logic (`src/utils`)**: strict unit tests for `optionsCalculations.ts` and `timeOverlapDetection.ts`.
2.  **Hooks**: Unit/Integration tests for custom hooks.
3.  **UI**: Component testing (less coverage than logic).

## Quality Checks

### Linting
Code must pass ESLint checks before being committed.
```bash
npm run lint
```

### Type Checking
Ensure no TypeScript errors exist.
```bash
npm run type-check
```
