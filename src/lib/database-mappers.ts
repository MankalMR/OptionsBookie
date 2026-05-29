import { OptionsTransaction, OptionsTransactionRow } from '@/types/options';
import { parseLocalDate } from '@/utils/dateUtils';

// Helper type to map database rows for partial updates, allowing null values
export type DbRowUpdate = {
  [K in keyof OptionsTransactionRow]?: OptionsTransactionRow[K] | null;
};

/**
 * Converts a database row to an OptionsTransaction domain object
 */
export function rowToTransaction(row: OptionsTransactionRow): OptionsTransaction {
  return {
    id: row.id,
    portfolioId: row.portfolio_id || '',
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

/**
 * Converts a domain object to a database row update/insert payload
 */
export function transactionToRow(transaction: Partial<OptionsTransaction>, userId: string, isUpdate: boolean = false): DbRowUpdate {
  const row: DbRowUpdate = {
    user_id: userId,
  };

  // Helper function to safely format dates to ISO string
  const formatISO = (val: Date | string | undefined) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString();
    return new Date(val).toISOString();
  };

  if (isUpdate) {
    if (transaction.portfolioId !== undefined) row.portfolio_id = transaction.portfolioId;
    if (transaction.stockSymbol !== undefined) row.stock_symbol = transaction.stockSymbol;
    if (transaction.tradeOpenDate !== undefined) {
      row.trade_open_date = transaction.tradeOpenDate ? formatISO(transaction.tradeOpenDate) : null;
    }
    if (transaction.expiryDate !== undefined) {
      row.expiry_date = transaction.expiryDate ? formatISO(transaction.expiryDate) : null;
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
      row.close_date = transaction.closeDate ? formatISO(transaction.closeDate) : null;
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
    row.trade_open_date = transaction.tradeOpenDate ? formatISO(transaction.tradeOpenDate) || undefined : undefined;
    row.expiry_date = transaction.expiryDate ? formatISO(transaction.expiryDate) : null;
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
    row.close_date = transaction.closeDate ? formatISO(transaction.closeDate) : null;
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
