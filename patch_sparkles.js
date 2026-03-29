const fs = require('fs');

const file = 'src/components/analytics/TransactionsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `import { Link } from 'lucide-react';`,
  `import { Link, Sparkles } from 'lucide-react';`
);

fs.writeFileSync(file, content);
