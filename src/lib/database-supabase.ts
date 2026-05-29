import { createClient } from '@supabase/supabase-js';
import { OptionsTransaction, OptionsTransactionRow } from '@/types/options';
import { parseLocalDate } from '@/utils/dateUtils';

// Create a service role client for server-side operations (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);


// Helper function to convert Supabase row to OptionsTransaction
function rowToTransaction(row: OptionsTransactionRow): OptionsTransaction {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
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
        (transaction.tradeOpenDate instanceof Date ?
          transaction.tradeOpenDate.toISOString() :
          (typeof transaction.tradeOpenDate === 'string' ?
            new Date(transaction.tradeOpenDate).toISOString() :
            undefined)) :
        null;
    }
    if (transaction.expiryDate !== undefined) {
      row.expiry_date = transaction.expiryDate ?
        (transaction.expiryDate instanceof Date ?
          transaction.expiryDate.toISOString() :
          (typeof transaction.expiryDate === 'string' ?
            new Date(transaction.expiryDate).toISOString() :
            undefined)) :
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
        (transaction.closeDate instanceof Date ?
          transaction.closeDate.toISOString() :
          (typeof transaction.closeDate === 'string' ?
            new Date(transaction.closeDate).toISOString() :
            undefined)) :
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
      (transaction.tradeOpenDate instanceof Date ?
        transaction.tradeOpenDate.toISOString() :
        (typeof transaction.tradeOpenDate === 'string' ?
          new Date(transaction.tradeOpenDate).toISOString() :
          undefined)) :
      undefined;
    row.expiry_date = transaction.expiryDate ?
      (transaction.expiryDate instanceof Date ?
        transaction.expiryDate.toISOString() :
        (typeof transaction.expiryDate === 'string' ?
          new Date(transaction.expiryDate).toISOString() :
          undefined)) :
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
      (transaction.closeDate instanceof Date ?
        transaction.closeDate.toISOString() :
        (typeof transaction.closeDate === 'string' ?
          new Date(transaction.closeDate).toISOString() :
          undefined)) :
      null;
    row.profit_loss = transaction.profitLoss || 0;
    row.annualized_ror = transaction.annualizedROR !== undefined ? transaction.annualizedROR : null;
    row.cash_reserve = transaction.cashReserve !== undefined ? transaction.cashReserve : null;
    row.margin_cash_reserve = transaction.marginCashReserve !== undefined ? transaction.marginCashReserve : null;
    row.cost_basis_per_share = transaction.costBasisPerShare !== undefined ? transaction.costBasisPerShare : null;
    row.collateral_amount = transaction.collateralAmount !== undefined ? transaction.collateralAmount : null;
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
