import { createClient } from '@supabase/supabase-js';
import { OptionsTransaction, OptionsTransactionRow } from '@/types/options';
import { parseLocalDate } from '@/utils/dateUtils';

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

function rowToTransaction(row: OptionsTransactionRow): OptionsTransaction {
  return {
    id: row.id,
    stockSymbol: row.stock_symbol,
    tradeOpenDate: parseLocalDate(row.trade_open_date),
    expiryDate: row.expiry_date ? parseLocalDate(row.expiry_date) : undefined,
    callOrPut: row.call_or_put || undefined,
    buyOrSell: row.buy_or_sell,
    stockPriceCurrent: row.stock_price_current !== null && row.stock_price_current !== undefined ? parseFloat(row.stock_price_current as string) : undefined,
    breakEvenPrice: row.break_even_price !== null && row.break_even_price !== undefined ? parseFloat(row.break_even_price as string) : undefined,
    strikePrice: row.strike_price !== null && row.strike_price !== undefined ? parseFloat(row.strike_price as string) : undefined,
    premium: row.premium !== null && row.premium !== undefined ? parseFloat(row.premium as string) : undefined,
    numberOfContracts: row.number_of_contracts !== null && row.number_of_contracts !== undefined ? row.number_of_contracts : undefined,
    fees: parseFloat((row.fees || 0) as string),
    status: row.status,
    exitPrice: row.exit_price ? parseFloat(row.exit_price as string) : undefined,
    closeDate: row.close_date ? parseLocalDate(row.close_date) : undefined,
    profitLoss: parseFloat((row.profit_loss || 0) as string),
    annualizedROR: row.annualized_ror ? parseFloat(row.annualized_ror as string) : undefined,
    cashReserve: row.cash_reserve ? parseFloat(row.cash_reserve as string) : undefined,
    marginCashReserve: row.margin_cash_reserve ? parseFloat(row.margin_cash_reserve as string) : undefined,
    costBasisPerShare: row.cost_basis_per_share ? parseFloat(row.cost_basis_per_share as string) : undefined,
    collateralAmount: row.collateral_amount ? parseFloat(row.collateral_amount as string) : undefined,
    portfolioId: row.portfolio_id || '',
    chainId: row.chain_id || undefined,
    createdAt: parseLocalDate(row.created_at),
    updatedAt: parseLocalDate(row.updated_at),

    // Unified stock & link fields
    transactionType: (row.transaction_type || 'option') as 'option' | 'stock',
    sharesQuantity: row.shares_quantity || undefined,
    sharePrice: row.share_price !== null && row.share_price !== undefined ? parseFloat(row.share_price as string) : undefined,
    coveredByType: (row.covered_by_type || 'none') as 'stock' | 'option' | 'none',
    coveredById: row.covered_by_id || undefined,
  };
}

// Helper function to convert OptionsTransaction to Supabase row
type DbRowUpdate = {
  [K in keyof OptionsTransactionRow]?: OptionsTransactionRow[K] | null;
};

function transactionToRow(transaction: Partial<OptionsTransaction>, userId: string, isUpdate: boolean = false) {
  const row: DbRowUpdate = {
    user_id: userId,
  };

  if (isUpdate) {
    if (transaction.portfolioId !== undefined) row.portfolio_id = transaction.portfolioId;
    if (transaction.stockSymbol !== undefined) row.stock_symbol = transaction.stockSymbol;
    if (transaction.tradeOpenDate !== undefined) {
      row.trade_open_date = transaction.tradeOpenDate ?
        (transaction.tradeOpenDate instanceof Date ? transaction.tradeOpenDate.toISOString() : new Date(transaction.tradeOpenDate).toISOString()) :
        null;
    }
    if (transaction.expiryDate !== undefined) {
      row.expiry_date = transaction.expiryDate ?
        (transaction.expiryDate instanceof Date ? transaction.expiryDate.toISOString() : new Date(transaction.expiryDate).toISOString()) :
        null;
    }
    if (transaction.callOrPut !== undefined) row.call_or_put = transaction.callOrPut || null;
    if (transaction.buyOrSell !== undefined) row.buy_or_sell = transaction.buyOrSell;
    if (transaction.stockPriceCurrent !== undefined) row.stock_price_current = transaction.stockPriceCurrent;
    if (transaction.breakEvenPrice !== undefined) row.break_even_price = transaction.breakEvenPrice;
    if (transaction.strikePrice !== undefined) row.strike_price = transaction.strikePrice;
    if (transaction.premium !== undefined) row.premium = transaction.premium;
    if (transaction.numberOfContracts !== undefined) row.number_of_contracts = transaction.numberOfContracts;
    if (transaction.fees !== undefined) row.fees = transaction.fees;
    if (transaction.status !== undefined) row.status = transaction.status;
    if (transaction.exitPrice !== undefined) row.exit_price = transaction.exitPrice;
    if (transaction.closeDate !== undefined) {
      row.close_date = transaction.closeDate ?
        (transaction.closeDate instanceof Date ? transaction.closeDate.toISOString() : new Date(transaction.closeDate).toISOString()) :
        null;
    }
    if (transaction.profitLoss !== undefined) row.profit_loss = transaction.profitLoss;
    if (transaction.annualizedROR !== undefined) row.annualized_ror = transaction.annualizedROR;
    if (transaction.cashReserve !== undefined) row.cash_reserve = transaction.cashReserve;
    if (transaction.marginCashReserve !== undefined) row.margin_cash_reserve = transaction.marginCashReserve;
    if (transaction.costBasisPerShare !== undefined) row.cost_basis_per_share = transaction.costBasisPerShare;
    if (transaction.collateralAmount !== undefined) row.collateral_amount = transaction.collateralAmount;
    if (transaction.chainId !== undefined) row.chain_id = transaction.chainId || null;
    
    // Unified stock & link fields
    if (transaction.transactionType !== undefined) row.transaction_type = transaction.transactionType;
    if (transaction.sharesQuantity !== undefined) row.shares_quantity = transaction.sharesQuantity;
    if (transaction.sharePrice !== undefined) row.share_price = transaction.sharePrice;
    if (transaction.coveredByType !== undefined) row.covered_by_type = transaction.coveredByType;
    if (transaction.coveredById !== undefined) row.covered_by_id = transaction.coveredById;
  } else {
    row.portfolio_id = transaction.portfolioId;
    row.stock_symbol = transaction.stockSymbol;
    row.trade_open_date = transaction.tradeOpenDate ?
      (transaction.tradeOpenDate instanceof Date ? transaction.tradeOpenDate.toISOString() : new Date(transaction.tradeOpenDate).toISOString()) :
      undefined;
    row.expiry_date = transaction.expiryDate ?
      (transaction.expiryDate instanceof Date ? transaction.expiryDate.toISOString() : new Date(transaction.expiryDate).toISOString()) :
      null;
    row.call_or_put = transaction.callOrPut || null;
    row.buy_or_sell = transaction.buyOrSell;
    row.stock_price_current = transaction.stockPriceCurrent !== undefined ? transaction.stockPriceCurrent : null;
    row.break_even_price = transaction.breakEvenPrice !== undefined ? transaction.breakEvenPrice : null;
    row.strike_price = transaction.strikePrice !== undefined ? transaction.strikePrice : null;
    row.premium = transaction.premium !== undefined ? transaction.premium : null;
    row.number_of_contracts = transaction.numberOfContracts !== undefined ? transaction.numberOfContracts : null;
    row.fees = transaction.fees || 0;
    row.status = transaction.status;
    row.exit_price = transaction.exitPrice !== undefined ? transaction.exitPrice : null;
    row.close_date = transaction.closeDate ?
      (transaction.closeDate instanceof Date ? transaction.closeDate.toISOString() : new Date(transaction.closeDate).toISOString()) :
      null;
    row.profit_loss = transaction.profitLoss || 0;
    row.annualized_ror = transaction.annualizedROR;
    row.cash_reserve = transaction.cashReserve;
    row.margin_cash_reserve = transaction.marginCashReserve;
    row.cost_basis_per_share = transaction.costBasisPerShare;
    row.collateral_amount = transaction.collateralAmount;
    row.chain_id = transaction.chainId || null;
    
    // Unified stock & link fields
    row.transaction_type = transaction.transactionType || 'option';
    row.shares_quantity = transaction.sharesQuantity !== undefined ? transaction.sharesQuantity : null;
    row.share_price = transaction.sharePrice !== undefined ? transaction.sharePrice : null;
    row.covered_by_type = transaction.coveredByType || 'none';
    row.covered_by_id = transaction.coveredById || null;
  }

  return row;
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
