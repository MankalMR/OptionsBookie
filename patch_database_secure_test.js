const fs = require('fs');
const file = 'src/lib/database-secure.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';",
  "process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';\nprocess.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';"
);

fs.writeFileSync(file, content);
console.log('Patched', file);
