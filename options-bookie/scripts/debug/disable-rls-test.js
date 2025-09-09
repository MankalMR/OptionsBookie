const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Use service role key to disable RLS
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function disableRLS() {
  try {
    console.log('Disabling RLS on options_transactions table...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE options_transactions DISABLE ROW LEVEL SECURITY;'
    });

    if (error) {
      console.error('Error disabling RLS:', error);
    } else {
      console.log('RLS disabled successfully');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

disableRLS();
