import Database from 'better-sqlite3';
import { OptionsTransaction, OptionsTransactionRow } from '@/types/options';
import path from 'path';

// Database file path - will be in the project root
const DB_PATH = path.join(process.cwd(), 'trades.db');

// Initialize database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create transactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT,
    stock_symbol TEXT NOT NULL,
    trade_open_date TEXT NOT NULL,
    expiry_date TEXT,
    call_or_put TEXT CHECK (call_or_put IN ('Call', 'Put')),
    buy_or_sell TEXT NOT NULL CHECK (buy_or_sell IN ('Buy', 'Sell')),
    stock_price_current REAL,
    break_even_price REAL,
    strike_price REAL,
    premium REAL,
    number_of_contracts INTEGER,
    fees REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Open', 'Closed', 'Expired', 'Assigned', 'Rolled')),
    exit_price REAL,
    close_date TEXT,
    profit_loss REAL NOT NULL DEFAULT 0,
    annualized_ror REAL,
    cash_reserve REAL,
    margin_cash_reserve REAL,
    cost_basis_per_share REAL,
    collateral_amount REAL,
    chain_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'option' CHECK (transaction_type IN ('option', 'stock')),
    shares_quantity INTEGER,
    share_price REAL,
    covered_by_type TEXT NOT NULL DEFAULT 'none' CHECK (covered_by_type IN ('stock', 'option', 'none')),
    covered_by_id TEXT
  )
`);

// Migrate existing local database schemas if they exist
try {
  db.exec("ALTER TABLE transactions ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'option'");
} catch (_) {}
try {
  db.exec("ALTER TABLE transactions ADD COLUMN shares_quantity INTEGER");
} catch (_) {}
try {
  db.exec("ALTER TABLE transactions ADD COLUMN share_price REAL");
} catch (_) {}
try {
  db.exec("ALTER TABLE transactions ADD COLUMN covered_by_type TEXT NOT NULL DEFAULT 'none'");
} catch (_) {}
try {
  db.exec("ALTER TABLE transactions ADD COLUMN covered_by_id TEXT");
} catch (_) {}

// Create indexes for better performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_transactions_stock_symbol ON transactions(stock_symbol);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_trade_open_date ON transactions(trade_open_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_expiry_date ON transactions(expiry_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
`);

// Prepared statements for better performance
const insertTransaction = db.prepare(`
  INSERT INTO transactions (
    id, portfolio_id, stock_symbol, trade_open_date, expiry_date, call_or_put, buy_or_sell,
    stock_price_current, break_even_price, strike_price, premium,
    number_of_contracts, fees, status, exit_price, close_date, profit_loss,
    annualized_ror, cash_reserve, margin_cash_reserve, cost_basis_per_share,
    collateral_amount, chain_id, created_at, updated_at,
    transaction_type, shares_quantity, share_price, covered_by_type, covered_by_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateTransaction = db.prepare(`
  UPDATE transactions SET
    portfolio_id = ?, stock_symbol = ?, trade_open_date = ?, expiry_date = ?, call_or_put = ?, buy_or_sell = ?,
    stock_price_current = ?, break_even_price = ?, strike_price = ?, premium = ?,
    number_of_contracts = ?, fees = ?, status = ?, exit_price = ?, close_date = ?, profit_loss = ?,
    annualized_ror = ?, cash_reserve = ?, margin_cash_reserve = ?, cost_basis_per_share = ?,
    collateral_amount = ?, chain_id = ?, updated_at = ?,
    transaction_type = ?, shares_quantity = ?, share_price = ?, covered_by_type = ?, covered_by_id = ?
  WHERE id = ?
`);

const deleteTransaction = db.prepare('DELETE FROM transactions WHERE id = ?');
const getTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?');
const getAllTransactions = db.prepare('SELECT * FROM transactions ORDER BY trade_open_date DESC');

// Helper function to convert database row to OptionsTransaction
function rowToTransaction(row: OptionsTransactionRow): OptionsTransaction {
  return {
    id: row.id,
    portfolioId: row.portfolio_id || '',
    stockSymbol: row.stock_symbol,
    tradeOpenDate: new Date(row.trade_open_date),
    expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
    callOrPut: row.call_or_put || undefined,
    buyOrSell: row.buy_or_sell,
    stockPriceCurrent: row.stock_price_current !== null && row.stock_price_current !== undefined ? (typeof row.stock_price_current === 'string' ? parseFloat(row.stock_price_current) : row.stock_price_current) : undefined,
    breakEvenPrice: row.break_even_price !== null && row.break_even_price !== undefined ? (typeof row.break_even_price === 'string' ? parseFloat(row.break_even_price) : row.break_even_price) : undefined,
    strikePrice: row.strike_price !== null && row.strike_price !== undefined ? (typeof row.strike_price === 'string' ? parseFloat(row.strike_price) : row.strike_price) : undefined,
    premium: row.premium !== null && row.premium !== undefined ? (typeof row.premium === 'string' ? parseFloat(row.premium) : row.premium) : undefined,
    numberOfContracts: row.number_of_contracts !== null && row.number_of_contracts !== undefined ? row.number_of_contracts : undefined,
    fees: typeof row.fees === 'string' ? parseFloat(row.fees) : (row.fees || 0),
    status: row.status as 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled',
    exitPrice: row.exit_price ? (typeof row.exit_price === 'string' ? parseFloat(row.exit_price) : row.exit_price) : undefined,
    closeDate: row.close_date ? new Date(row.close_date) : undefined,
    profitLoss: row.profit_loss ? (typeof row.profit_loss === 'string' ? parseFloat(row.profit_loss) : row.profit_loss) : 0,
    annualizedROR: row.annualized_ror ? (typeof row.annualized_ror === 'string' ? parseFloat(row.annualized_ror) : row.annualized_ror) : undefined,
    cashReserve: row.cash_reserve ? (typeof row.cash_reserve === 'string' ? parseFloat(row.cash_reserve) : row.cash_reserve) : undefined,
    marginCashReserve: row.margin_cash_reserve ? (typeof row.margin_cash_reserve === 'string' ? parseFloat(row.margin_cash_reserve) : row.margin_cash_reserve) : undefined,
    costBasisPerShare: row.cost_basis_per_share ? (typeof row.cost_basis_per_share === 'string' ? parseFloat(row.cost_basis_per_share) : row.cost_basis_per_share) : undefined,
    collateralAmount: row.collateral_amount ? (typeof row.collateral_amount === 'string' ? parseFloat(row.collateral_amount) : row.collateral_amount) : undefined,
    chainId: row.chain_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    
    // Unified stock & link fields
    transactionType: (row.transaction_type || 'option') as 'option' | 'stock',
    sharesQuantity: row.shares_quantity || undefined,
    sharePrice: row.share_price !== null && row.share_price !== undefined ? (typeof row.share_price === 'string' ? parseFloat(row.share_price) : row.share_price) : undefined,
    coveredByType: (row.covered_by_type || 'none') as 'stock' | 'option' | 'none',
    coveredById: row.covered_by_id || undefined,
  };
}

// Database operations
export const dbOperations = {
  // Create a new transaction
  createTransaction(transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>): OptionsTransaction {
    const id = Date.now().toString();
    const now = new Date().toISOString();

    // Ensure dates are Date objects
    const tradeOpenDate = transaction.tradeOpenDate instanceof Date
      ? transaction.tradeOpenDate
      : new Date(transaction.tradeOpenDate);
    const expiryDate = transaction.expiryDate
      ? (transaction.expiryDate instanceof Date ? transaction.expiryDate : new Date(transaction.expiryDate))
      : undefined;
    const closeDate = transaction.closeDate
      ? (transaction.closeDate instanceof Date ? transaction.closeDate : new Date(transaction.closeDate))
      : undefined;

    const newTransaction: OptionsTransaction = {
      ...transaction,
      tradeOpenDate,
      expiryDate,
      closeDate,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    insertTransaction.run(
      newTransaction.id,
      newTransaction.portfolioId,
      newTransaction.stockSymbol,
      newTransaction.tradeOpenDate.toISOString(),
      newTransaction.expiryDate?.toISOString() || null,
      newTransaction.callOrPut || null,
      newTransaction.buyOrSell,
      newTransaction.stockPriceCurrent !== undefined ? newTransaction.stockPriceCurrent : null,
      newTransaction.breakEvenPrice !== undefined ? newTransaction.breakEvenPrice : null,
      newTransaction.strikePrice !== undefined ? newTransaction.strikePrice : null,
      newTransaction.premium !== undefined ? newTransaction.premium : null,
      newTransaction.numberOfContracts !== undefined ? newTransaction.numberOfContracts : null,
      newTransaction.fees,
      newTransaction.status,
      newTransaction.exitPrice !== undefined ? newTransaction.exitPrice : null,
      newTransaction.closeDate?.toISOString() || null,
      newTransaction.profitLoss || 0,
      newTransaction.annualizedROR !== undefined ? newTransaction.annualizedROR : null,
      newTransaction.cashReserve !== undefined ? newTransaction.cashReserve : null,
      newTransaction.marginCashReserve !== undefined ? newTransaction.marginCashReserve : null,
      newTransaction.costBasisPerShare !== undefined ? newTransaction.costBasisPerShare : null,
      newTransaction.collateralAmount !== undefined ? newTransaction.collateralAmount : null,
      newTransaction.chainId || null,
      newTransaction.createdAt.toISOString(),
      newTransaction.updatedAt.toISOString(),
      newTransaction.transactionType || 'option',
      newTransaction.sharesQuantity !== undefined ? newTransaction.sharesQuantity : null,
      newTransaction.sharePrice !== undefined ? newTransaction.sharePrice : null,
      newTransaction.coveredByType || 'none',
      newTransaction.coveredById || null
    );

    return newTransaction;
  },

  // Update an existing transaction
  updateTransaction(id: string, updates: Partial<OptionsTransaction>): OptionsTransaction | null {
    const existing = getTransaction.get(id) as OptionsTransactionRow | undefined;
    if (!existing) return null;

    // Convert date strings to Date objects if needed
    const processedUpdates = { ...updates };
    if (processedUpdates.tradeOpenDate && typeof processedUpdates.tradeOpenDate === 'string') {
      processedUpdates.tradeOpenDate = new Date(processedUpdates.tradeOpenDate);
    }
    if (processedUpdates.expiryDate && typeof processedUpdates.expiryDate === 'string') {
      processedUpdates.expiryDate = new Date(processedUpdates.expiryDate);
    }
    if (processedUpdates.closeDate && typeof processedUpdates.closeDate === 'string') {
      processedUpdates.closeDate = new Date(processedUpdates.closeDate);
    }

    const updated = { ...rowToTransaction(existing), ...processedUpdates, updatedAt: new Date() };

    updateTransaction.run(
      updated.portfolioId,
      updated.stockSymbol,
      updated.tradeOpenDate.toISOString(),
      updated.expiryDate?.toISOString() || null,
      updated.callOrPut || null,
      updated.buyOrSell,
      updated.stockPriceCurrent !== undefined ? updated.stockPriceCurrent : null,
      updated.breakEvenPrice !== undefined ? updated.breakEvenPrice : null,
      updated.strikePrice !== undefined ? updated.strikePrice : null,
      updated.premium !== undefined ? updated.premium : null,
      updated.numberOfContracts !== undefined ? updated.numberOfContracts : null,
      updated.fees,
      updated.status,
      updated.exitPrice !== undefined ? updated.exitPrice : null,
      updated.closeDate?.toISOString() || null,
      updated.profitLoss || 0,
      updated.annualizedROR !== undefined ? updated.annualizedROR : null,
      updated.cashReserve !== undefined ? updated.cashReserve : null,
      updated.marginCashReserve !== undefined ? updated.marginCashReserve : null,
      updated.costBasisPerShare !== undefined ? updated.costBasisPerShare : null,
      updated.collateralAmount !== undefined ? updated.collateralAmount : null,
      updated.chainId || null,
      updated.updatedAt.toISOString(),
      updated.transactionType || 'option',
      updated.sharesQuantity !== undefined ? updated.sharesQuantity : null,
      updated.sharePrice !== undefined ? updated.sharePrice : null,
      updated.coveredByType || 'none',
      updated.coveredById || null,
      id
    );

    return updated;
  },

  // Delete a transaction
  deleteTransaction(id: string): boolean {
    const result = deleteTransaction.run(id);
    return result.changes > 0;
  },

  // Get a single transaction
  getTransaction(id: string): OptionsTransaction | null {
    const row = getTransaction.get(id) as OptionsTransactionRow | undefined;
    return row ? rowToTransaction(row) : null;
  },

  // Get all transactions
  getAllTransactions(): OptionsTransaction[] {
    const rows = getAllTransactions.all() as OptionsTransactionRow[];
    return rows.map(rowToTransaction);
  },

  // Get transactions by status
  getTransactionsByStatus(status: 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled'): OptionsTransaction[] {
    const stmt = db.prepare('SELECT * FROM transactions WHERE status = ? ORDER BY trade_open_date DESC');
    const rows = stmt.all(status) as OptionsTransactionRow[];
    return rows.map(rowToTransaction);
  },

  // Get transactions by stock symbol
  getTransactionsBySymbol(symbol: string): OptionsTransaction[] {
    const stmt = db.prepare('SELECT * FROM transactions WHERE stock_symbol = ? ORDER BY trade_open_date DESC');
    const rows = stmt.all(symbol) as OptionsTransactionRow[];
    return rows.map(rowToTransaction);
  },

  // Get transactions by date range
  getTransactionsByDateRange(startDate: Date, endDate: Date): OptionsTransaction[] {
    const stmt = db.prepare(`
      SELECT * FROM transactions
      WHERE trade_open_date >= ? AND trade_open_date <= ?
      ORDER BY trade_open_date DESC
    `);
    const rows = stmt.all(startDate.toISOString(), endDate.toISOString()) as OptionsTransactionRow[];
    return rows.map(rowToTransaction);
  },

  // Get database statistics
  getStats() {
    const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
    const openTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE status = "Open"').get() as { count: number };
    const closedTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE status = "Closed"').get() as { count: number };
    const totalProfitLoss = db.prepare('SELECT SUM(profit_loss) as total FROM transactions WHERE status = "Closed"').get() as { total: number };

    return {
      totalTransactions: totalTransactions.count,
      openTransactions: openTransactions.count,
      closedTransactions: closedTransactions.count,
      totalProfitLoss: totalProfitLoss.total || 0,
    };
  },

  // Close database connection (for cleanup)
  close() {
    db.close();
  }
};

export default db;
