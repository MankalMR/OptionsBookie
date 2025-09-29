import { createClient } from '@supabase/supabase-js';
import { OptionsTransaction } from '@/types/options';

// Create a service role client for server-side operations (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to convert Supabase row to OptionsTransaction
function rowToTransaction(row: any): OptionsTransaction {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    stockSymbol: row.stock_symbol,
    tradeOpenDate: new Date(row.trade_open_date),
    expiryDate: new Date(row.expiry_date),
    callOrPut: row.call_or_put,
    buyOrSell: row.buy_or_sell,
    stockPriceCurrent: parseFloat(row.stock_price_current),
    breakEvenPrice: parseFloat(row.break_even_price),
    strikePrice: parseFloat(row.strike_price),
    premium: parseFloat(row.premium),
    numberOfContracts: row.number_of_contracts,
    fees: parseFloat(row.fees),
    status: row.status,
    exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
    closeDate: row.close_date ? new Date(row.close_date) : undefined,
    profitLoss: parseFloat(row.profit_loss),
    annualizedROR: row.annualized_ror ? parseFloat(row.annualized_ror) : undefined,
    cashReserve: row.cash_reserve ? parseFloat(row.cash_reserve) : undefined,
    marginCashReserve: row.margin_cash_reserve ? parseFloat(row.margin_cash_reserve) : undefined,
    costBasisPerShare: row.cost_basis_per_share ? parseFloat(row.cost_basis_per_share) : undefined,
    collateralAmount: row.collateral_amount ? parseFloat(row.collateral_amount) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper function to convert OptionsTransaction to Supabase row
function transactionToRow(transaction: Partial<OptionsTransaction>, userId: string) {
  return {
    user_id: userId,
    portfolio_id: transaction.portfolioId,
    stock_symbol: transaction.stockSymbol,
    trade_open_date: transaction.tradeOpenDate ?
      (transaction.tradeOpenDate instanceof Date ?
        transaction.tradeOpenDate.toISOString() :
        (typeof transaction.tradeOpenDate === 'string' ?
          new Date(transaction.tradeOpenDate).toISOString() :
          undefined)) :
      undefined,
    expiry_date: transaction.expiryDate ?
      (transaction.expiryDate instanceof Date ?
        transaction.expiryDate.toISOString() :
        (typeof transaction.expiryDate === 'string' ?
          new Date(transaction.expiryDate).toISOString() :
          undefined)) :
      undefined,
    call_or_put: transaction.callOrPut,
    buy_or_sell: transaction.buyOrSell,
    stock_price_current: transaction.stockPriceCurrent,
    break_even_price: transaction.breakEvenPrice,
    strike_price: transaction.strikePrice,
    premium: transaction.premium,
    number_of_contracts: transaction.numberOfContracts,
    fees: transaction.fees,
    status: transaction.status,
    exit_price: transaction.exitPrice,
    close_date: transaction.closeDate ?
      (transaction.closeDate instanceof Date ?
        transaction.closeDate.toISOString() :
        (typeof transaction.closeDate === 'string' ?
          new Date(transaction.closeDate).toISOString() :
          undefined)) :
      undefined,
    profit_loss: transaction.profitLoss,
    annualized_ror: transaction.annualizedROR,
    cash_reserve: transaction.cashReserve,
    margin_cash_reserve: transaction.marginCashReserve,
    cost_basis_per_share: transaction.costBasisPerShare,
    collateral_amount: transaction.collateralAmount,
  };
}

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
    const row = transactionToRow(updates, userId);

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
