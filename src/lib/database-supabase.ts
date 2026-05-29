import { createClient } from '@supabase/supabase-js';
import { OptionsTransaction, OptionsTransactionRow } from '@/types/options';
import { rowToTransaction, transactionToRow } from './database-mappers';

// Create a service role client for server-side operations (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);




export const supabaseDb = {
  // Get all transactions for a user
  async getTransactions(userId: string): Promise<OptionsTransaction[]> {
    // Use admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;
    return data.map(rowToTransaction);
  },

  // Get transactions for a specific portfolio
  async getTransactionsByPortfolio(userId: string, portfolioId: string): Promise<OptionsTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('portfolio_id', portfolioId)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;
    return data.map(rowToTransaction);
  },

  // Get a single transaction
  async getTransaction(id: string, userId: string): Promise<OptionsTransaction | null> {
    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return rowToTransaction(data);
  },

  // Create a new transaction
  async createTransaction(
    transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<OptionsTransaction> {
    const row = transactionToRow(transaction, userId);

    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return rowToTransaction(data);
  },

  // Update a transaction
  async updateTransaction(
    id: string,
    updates: Partial<OptionsTransaction>,
    userId: string
  ): Promise<OptionsTransaction | null> {
    const row = transactionToRow(updates, userId, true);

    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return null;
    return rowToTransaction(data);
  },

  // Delete a transaction
  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('options_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  },

  // Get transactions by status
  async getTransactionsByStatus(
    status: 'Open' | 'Closed' | 'Expired' | 'Assigned',
    userId: string
  ): Promise<OptionsTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;
    return data.map(rowToTransaction);
  },

  // Get transactions by stock symbol
  async getTransactionsBySymbol(symbol: string, userId: string): Promise<OptionsTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('stock_symbol', symbol)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;
    return data.map(rowToTransaction);
  },

  // Get database statistics
  async getStats(userId: string) {
    const { data: totalData, error: totalError } = await supabaseAdmin
      .from('options_transactions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const { data: openData, error: openError } = await supabaseAdmin
      .from('options_transactions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'Open');

    const { data: closedData, error: closedError } = await supabaseAdmin
      .from('options_transactions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'Closed');

    const { data: profitData, error: profitError } = await supabaseAdmin
      .from('options_transactions')
      .select('profit_loss')
      .eq('user_id', userId)
      .eq('status', 'Closed');

    if (totalError || openError || closedError || profitError) {
      throw new Error('Failed to fetch statistics');
    }

    const totalProfitLoss = profitData?.reduce((sum, row) => sum + parseFloat(row.profit_loss), 0) || 0;

    return {
      totalTransactions: totalData?.length || 0,
      openTransactions: openData?.length || 0,
      closedTransactions: closedData?.length || 0,
      totalProfitLoss,
    };
  },
};
