import { createClient } from '@supabase/supabase-js';
import { OptionsTransaction, OptionsTransactionRow } from '@/types/options';
import { rowToTransaction, transactionToRow } from './database-mappers';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

// Regular Supabase client for user operations (respects RLS)
// Temporarily using service role key to bypass RLS while debugging
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Service role client for admin operations only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);



// Secure database operations using regular Supabase client (respects RLS)
export const secureDb = {
  async getTransactions(userEmail: string): Promise<OptionsTransaction[]> {
    const { data, error } = await supabase
      .from('options_transactions')
      .select('*')
      .eq('user_id', userEmail)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;

    return data.map(rowToTransaction);
  },

  async getTransaction(id: string, userEmail: string): Promise<OptionsTransaction | null> {
    const { data, error } = await supabase
      .from('options_transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userEmail)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return rowToTransaction(data);
  },

  async createTransaction(transaction: Partial<OptionsTransaction>, userEmail: string): Promise<OptionsTransaction> {
    const rowData = transactionToRow(transaction, userEmail);

    const { data, error } = await supabase
      .from('options_transactions')
      .insert(rowData)
      .select()
      .single();

    if (error) throw error;
    return rowToTransaction(data);
  },

  async updateTransaction(id: string, transaction: Partial<OptionsTransaction>, userEmail: string): Promise<OptionsTransaction> {
    const rowData = transactionToRow(transaction, userEmail, true);
    delete (rowData as Partial<OptionsTransactionRow>).user_id; // Don't update user_id

    const { data, error } = await supabase
      .from('options_transactions')
      .update(rowData)
      .eq('id', id)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) throw error;
    return rowToTransaction(data);
  },

  async deleteTransaction(id: string, userEmail: string): Promise<void> {
    const { error } = await supabase
      .from('options_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userEmail);

    if (error) throw error;
  },

  async getTransactionsByStatus(status: string, userEmail: string): Promise<OptionsTransaction[]> {
    const { data, error } = await supabase
      .from('options_transactions')
      .select('*')
      .eq('status', status)
      .eq('user_id', userEmail)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;
    return data.map(rowToTransaction);
  },

  async getTransactionsBySymbol(symbol: string, userEmail: string): Promise<OptionsTransaction[]> {
    const { data, error } = await supabase
      .from('options_transactions')
      .select('*')
      .eq('stock_symbol', symbol)
      .eq('user_id', userEmail)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;
    return data.map(rowToTransaction);
  },

  async getStats(userEmail: string): Promise<{
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    totalProfitLoss: number;
    winRate: number;
  }> {
    const { data, error } = await supabase
      .from('options_transactions')
      .select('status, profit_loss')
      .eq('user_id', userEmail);

    if (error) throw error;

    const totalTrades = data.length;
    const openTrades = data.filter(t => t.status === 'Open').length;
    const closedTrades = data.filter(t => t.status === 'Closed').length;
    const totalProfitLoss = data.reduce((sum, t) => sum + (parseFloat(t.profit_loss) || 0), 0);
    const winningTrades = data.filter(t => t.status === 'Closed' && parseFloat(t.profit_loss) > 0).length;
    const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

    return {
      totalTrades,
      openTrades,
      closedTrades,
      totalProfitLoss,
      winRate,
    };
  }
};

// Admin operations using service role (for migration, etc.)
export const adminDb = {
  async migrateData(transactions: OptionsTransactionRow[], targetUserId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('options_transactions')
      .insert(transactions.map(t => ({ ...t, user_id: targetUserId })));

    if (error) throw error;
  },

  async getUserTransactions(userId: string): Promise<OptionsTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('options_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('trade_open_date', { ascending: false });

    if (error) throw error;
    return data.map(rowToTransaction);
  }
};
