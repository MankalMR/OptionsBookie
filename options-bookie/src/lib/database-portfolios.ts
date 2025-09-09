import { createClient } from '@supabase/supabase-js';
import { Portfolio } from '@/types/options';

// Create a service role client for server-side operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to convert Supabase row to Portfolio
function rowToPortfolio(row: any): Portfolio {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isDefault: row.is_default || false, // Default to false if column doesn't exist
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper function to convert Portfolio to Supabase row
function portfolioToRow(portfolio: Partial<Portfolio>, userId: string) {
  return {
    user_id: userId,
    name: portfolio.name,
    description: portfolio.description,
    is_default: portfolio.isDefault,
  };
}

export const portfolioDb = {
  // Get all portfolios for a user
  async getPortfolios(userId: string): Promise<Portfolio[]> {
    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(rowToPortfolio);
  },

  // Get a single portfolio
  async getPortfolio(id: string, userId: string): Promise<Portfolio | null> {
    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return rowToPortfolio(data);
  },

  // Get the default portfolio for a user
  async getDefaultPortfolio(userId: string): Promise<Portfolio | null> {
    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) return null;
    return rowToPortfolio(data);
  },

  // Create a new portfolio
  async createPortfolio(
    portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<Portfolio> {
    const row = portfolioToRow(portfolio, userId);

    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return rowToPortfolio(data);
  },

  // Update a portfolio
  async updatePortfolio(
    id: string,
    updates: Partial<Portfolio>,
    userId: string
  ): Promise<Portfolio | null> {
    const row = portfolioToRow(updates, userId);

    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return null;
    return rowToPortfolio(data);
  },

  // Delete a portfolio
  async deletePortfolio(id: string, userId: string): Promise<boolean> {
    // First check if this is the default portfolio
    const portfolio = await this.getPortfolio(id, userId);
    if (portfolio?.isDefault) {
      throw new Error('Cannot delete the default portfolio');
    }

    // Check if there are any transactions in this portfolio
    const { data: transactions, error: checkError } = await supabaseAdmin
      .from('options_transactions')
      .select('id')
      .eq('portfolio_id', id)
      .limit(1);

    if (checkError) throw checkError;

    if (transactions && transactions.length > 0) {
      throw new Error('Cannot delete portfolio with existing transactions. Please move or delete transactions first.');
    }

    const { error } = await supabaseAdmin
      .from('portfolios')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  },

  // Set a portfolio as default
  async setDefaultPortfolio(id: string, userId: string): Promise<Portfolio | null> {
    try {
      console.log('setDefaultPortfolio - ID:', id, 'User ID:', userId);

      // First check if the portfolio exists
      const { data: existingPortfolio, error: checkError } = await supabaseAdmin
        .from('portfolios')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (checkError) {
        console.error('Error checking portfolio existence:', checkError);
        return null;
      }

      if (!existingPortfolio) {
        console.log('Portfolio not found for user');
        return null;
      }

      console.log('Portfolio found:', existingPortfolio);

      // First unset all other default portfolios for this user
      const { error: unsetError } = await supabaseAdmin
        .from('portfolios')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', id);

      if (unsetError) {
        console.error('Error unsetting other defaults:', unsetError);
        return null;
      }

      // Set this portfolio as default
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error setting default portfolio:', error);
        return null;
      }

      console.log('Successfully set default portfolio:', data);
      return rowToPortfolio(data);
    } catch (error) {
      console.error('Error in setDefaultPortfolio:', error);
      return null;
    }
  },
};
