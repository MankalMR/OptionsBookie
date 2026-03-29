const fs = require('fs');
const file = 'src/components/analytics/TransactionsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file might not have useState imported if it was completely clean before
if (!content.includes('useState')) {
  content = content.replace(
    /import React, \{ useMemo \} from 'react';/,
    `import React, { useMemo, useState, KeyboardEvent } from 'react';`
  );
}

const stateString = `const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);`;
if (!content.includes(stateString)) {
   // Wait, TransactionsTable inside analytics didn't have sorting originally? Let's check what's inside.
}

fs.writeFileSync(file, content);
