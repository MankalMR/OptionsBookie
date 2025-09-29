import { createClient } from '@supabase/supabase-js';
import { OptionsTransaction } from '@/types/options';

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

// Helper function to convert Supabase row to OptionsTransaction
// Helper function to parse date strings correctly as local dates
function parseLocalDate(dateString: string | Date): Date {
  if (dateString instanceof Date) return dateString;
  if (typeof dateString === 'string') {
    // Handle ISO date strings (YYYY-MM-DDTHH:mm:ss.sssZ) - extract just the date part
    const isoDateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) {
      const [year, month, day] = isoDateMatch[1].split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
  }
  return new Date(dateString);
}

function rowToTransaction(row: any): OptionsTransaction {
  return {
    id: row.id,
    stockSymbol: row.stock_symbol,
    tradeOpenDate: parseLocalDate(row.trade_open_date),
    expiryDate: parseLocalDate(row.expiry_date),
    callOrPut: row.call_or_put,
    buyOrSell: row.buy_or_sell,
    stockPriceCurrent: parseFloat(row.stock_price_current),
    breakEvenPrice: parseFloat(row.break_even_price),
    strikePrice: parseFloat(row.strike_price),
    premium: parseFloat(row.premium),
    numberOfContracts: row.number_of_contracts,
    fees: parseFloat(row.fees || 0),
    status: row.status,
    exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
    closeDate: row.close_date ? parseLocalDate(row.close_date) : undefined,
    profitLoss: parseFloat(row.profit_loss || 0),
    annualizedROR: row.annualized_ror ? parseFloat(row.annualized_ror) : undefined,
    cashReserve: row.cash_reserve ? parseFloat(row.cash_reserve) : undefined,
    marginCashReserve: row.margin_cash_reserve ? parseFloat(row.margin_cash_reserve) : undefined,
    costBasisPerShare: row.cost_basis_per_share ? parseFloat(row.cost_basis_per_share) : undefined,
    collateralAmount: row.collateral_amount ? parseFloat(row.collateral_amount) : undefined,
    portfolioId: row.portfolio_id || '',
    chainId: row.chain_id || undefined, // Added missing chainId mapping
    createdAt: parseLocalDate(row.created_at),
    updatedAt: parseLocalDate(row.updated_at),
  };
}

// Helper function to convert OptionsTransaction to Supabase row
function transactionToRow(transaction: Partial<OptionsTransaction>, userId: string) {
  return {
    user_id: userId,
    portfolio_id: transaction.portfolioId,
    stock_symbol: transaction.stockSymbol,
    trade_open_date: transaction.tradeOpenDate ?
      (transaction.tradeOpenDate instanceof Date ? transaction.tradeOpenDate.toISOString() : new Date(transaction.tradeOpenDate).toISOString()) :
      undefined,
    expiry_date: transaction.expiryDate ?
      (transaction.expiryDate instanceof Date ? transaction.expiryDate.toISOString() : new Date(transaction.expiryDate).toISOString()) :
      undefined,
    call_or_put: transaction.callOrPut,
    buy_or_sell: transaction.buyOrSell,
    stock_price_current: transaction.stockPriceCurrent,
    break_even_price: transaction.breakEvenPrice,
    strike_price: transaction.strikePrice,
    premium: transaction.premium,
    number_of_contracts: transaction.numberOfContracts,
    fees: transaction.fees || 0,
    status: transaction.status,
    exit_price: transaction.exitPrice,
    close_date: transaction.closeDate ?
      (transaction.closeDate instanceof Date ? transaction.closeDate.toISOString() : new Date(transaction.closeDate).toISOString()) :
      undefined,
    profit_loss: transaction.profitLoss || 0,
    annualized_ror: transaction.annualizedROR,
    cash_reserve: transaction.cashReserve,
    margin_cash_reserve: transaction.marginCashReserve,
    cost_basis_per_share: transaction.costBasisPerShare,
    collateral_amount: transaction.collateralAmount,
    chain_id: transaction.chainId, // Added missing chainId mapping
  };
}

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
    const rowData = transactionToRow(transaction, userEmail);
    delete (rowData as any).user_id; // Don't update user_id

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
  async migrateData(transactions: any[], targetUserId: string): Promise<void> {
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
