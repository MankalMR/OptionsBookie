const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createPortfoliosDirect() {
  try {
    console.log('Creating portfolios directly...');

    // First, let's try to create a portfolio to see if the table exists
    const { data: testPortfolio, error: testError } = await supabase
      .from('portfolios')
      .insert({
        user_id: 'test@example.com',
        name: 'Test Portfolio',
        description: 'Test portfolio',
        is_default: true
      })
      .select()
      .single();

    if (testError) {
      if (testError.code === 'PGRST205') {
        console.log('Portfolios table does not exist. You need to run the SQL migration manually.');
        console.log('');
        console.log('Please go to your Supabase dashboard and run the following SQL:');
        console.log('');
        console.log('-- Create portfolios table');
        console.log('CREATE TABLE IF NOT EXISTS public.portfolios (');
        console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
        console.log('  user_id TEXT NOT NULL,');
        console.log('  name TEXT NOT NULL,');
        console.log('  description TEXT,');
        console.log('  is_default BOOLEAN DEFAULT FALSE,');
        console.log('  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,');
        console.log('  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,');
        console.log('  CONSTRAINT unique_default_portfolio_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED');
        console.log(');');
        console.log('');
        console.log('-- Enable RLS');
        console.log('ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;');
        console.log('');
        console.log('-- Create RLS policies');
        console.log('CREATE POLICY "Users can view their own portfolios" ON public.portfolios FOR SELECT USING (auth.email() = user_id);');
        console.log('CREATE POLICY "Users can insert their own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.email() = user_id);');
        console.log('CREATE POLICY "Users can update their own portfolios" ON public.portfolios FOR UPDATE USING (auth.email() = user_id) WITH CHECK (auth.email() = user_id);');
        console.log('CREATE POLICY "Users can delete their own portfolios" ON public.portfolios FOR DELETE USING (auth.email() = user_id);');
        console.log('');
        console.log('-- Add portfolio_id column to options_transactions');
        console.log('ALTER TABLE public.options_transactions ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE;');
        console.log('');
        console.log('-- Create index');
        console.log('CREATE INDEX IF NOT EXISTS idx_options_transactions_portfolio_id ON public.options_transactions(portfolio_id);');
        console.log('');
        console.log('After running this SQL, run this script again to create default portfolios.');
        return;
      } else {
        console.error('Error testing portfolios table:', testError);
        return;
      }
    }

    // If we get here, the table exists, so delete the test portfolio
    await supabase.from('portfolios').delete().eq('user_id', 'test@example.com');

    console.log('Portfolios table exists. Creating default portfolios for existing users...');

    // Get all unique users
    const { data: users, error: usersError } = await supabase
      .from('options_transactions')
      .select('user_id')
      .not('user_id', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    const uniqueUsers = [...new Set(users.map(u => u.user_id))];
    console.log(`Found ${uniqueUsers.length} unique users`);

    for (const userId of uniqueUsers) {
      // Check if user already has a default portfolio
      const { data: existingPortfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (existingPortfolio) {
        console.log(`✓ User ${userId} already has a default portfolio`);
        continue;
      }

      // Create default portfolio for this user
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          user_id: userId,
          name: 'Default Portfolio',
          description: 'Default portfolio for existing transactions',
          is_default: true
        })
        .select()
        .single();

      if (portfolioError) {
        console.error(`Error creating portfolio for user ${userId}:`, portfolioError);
      } else {
        console.log(`✓ Created default portfolio for user ${userId}`);

        // Assign all transactions for this user to their default portfolio
        const { error: updateError } = await supabase
          .from('options_transactions')
          .update({ portfolio_id: portfolio.id })
          .eq('user_id', userId)
          .is('portfolio_id', null);

        if (updateError) {
          console.error(`Error updating transactions for user ${userId}:`, updateError);
        } else {
          console.log(`✓ Updated transactions for user ${userId}`);
        }
      }
    }

    console.log('Portfolio setup completed!');

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

createPortfoliosDirect();
