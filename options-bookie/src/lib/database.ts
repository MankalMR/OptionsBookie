import Database from 'better-sqlite3';
import { OptionsTransaction } from '@/types/options';
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
    stockSymbol TEXT NOT NULL,
    tradeOpenDate TEXT NOT NULL,
    expiryDate TEXT NOT NULL,
    callOrPut TEXT NOT NULL CHECK (callOrPut IN ('Call', 'Put')),
    buyOrSell TEXT NOT NULL CHECK (buyOrSell IN ('Buy', 'Sell')),
    stockPriceCurrent REAL NOT NULL,
    daysToExpiry INTEGER NOT NULL,
    breakEvenPrice REAL NOT NULL,
    strikePrice REAL NOT NULL,
    premium REAL NOT NULL,
    numberOfContracts INTEGER NOT NULL,
    fees REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Open', 'Closed', 'Rolled Forward')),
    exitPrice REAL,
    closeDate TEXT,
    profitLoss REAL NOT NULL DEFAULT 0,
    daysHeld INTEGER NOT NULL DEFAULT 0,
    annualizedROR REAL,
    cashReserve REAL,
    marginCashReserve REAL,
    costBasisPerShare REAL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

// Create indexes for better performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_transactions_stock_symbol ON transactions(stockSymbol);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_trade_open_date ON transactions(tradeOpenDate);
  CREATE INDEX IF NOT EXISTS idx_transactions_expiry_date ON transactions(expiryDate);
`);

// Prepared statements for better performance
const insertTransaction = db.prepare(`
  INSERT INTO transactions (
    id, stockSymbol, tradeOpenDate, expiryDate, callOrPut, buyOrSell,
    stockPriceCurrent, daysToExpiry, breakEvenPrice, strikePrice, premium,
    numberOfContracts, fees, status, exitPrice, closeDate, profitLoss,
    daysHeld, annualizedROR, cashReserve, marginCashReserve, costBasisPerShare,
    createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateTransaction = db.prepare(`
  UPDATE transactions SET
    stockSymbol = ?, tradeOpenDate = ?, expiryDate = ?, callOrPut = ?, buyOrSell = ?,
    stockPriceCurrent = ?, daysToExpiry = ?, breakEvenPrice = ?, strikePrice = ?, premium = ?,
    numberOfContracts = ?, fees = ?, status = ?, exitPrice = ?, closeDate = ?, profitLoss = ?,
    daysHeld = ?, annualizedROR = ?, cashReserve = ?, marginCashReserve = ?, costBasisPerShare = ?,
    updatedAt = ?
  WHERE id = ?
`);

const deleteTransaction = db.prepare('DELETE FROM transactions WHERE id = ?');
const getTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?');
const getAllTransactions = db.prepare('SELECT * FROM transactions ORDER BY tradeOpenDate DESC');

// Helper function to convert database row to OptionsTransaction
function rowToTransaction(row: any): OptionsTransaction {
  return {
    id: row.id,
    portfolioId: row.portfolioId || '',
    stockSymbol: row.stockSymbol,
    tradeOpenDate: new Date(row.tradeOpenDate),
    expiryDate: new Date(row.expiryDate),
    callOrPut: row.callOrPut,
    buyOrSell: row.buyOrSell,
    stockPriceCurrent: row.stockPriceCurrent,
    daysToExpiry: row.daysToExpiry,
    breakEvenPrice: row.breakEvenPrice,
    strikePrice: row.strikePrice,
    premium: row.premium,
    numberOfContracts: row.numberOfContracts,
    fees: row.fees,
    status: row.status,
    exitPrice: row.exitPrice,
    closeDate: row.closeDate ? new Date(row.closeDate) : undefined,
    profitLoss: row.profitLoss,
    daysHeld: row.daysHeld,
    annualizedROR: row.annualizedROR,
    cashReserve: row.cashReserve,
    marginCashReserve: row.marginCashReserve,
    costBasisPerShare: row.costBasisPerShare,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
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
    const expiryDate = transaction.expiryDate instanceof Date
      ? transaction.expiryDate
      : new Date(transaction.expiryDate);
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
      newTransaction.stockSymbol,
      newTransaction.tradeOpenDate.toISOString(),
      newTransaction.expiryDate.toISOString(),
      newTransaction.callOrPut,
      newTransaction.buyOrSell,
      newTransaction.stockPriceCurrent,
      newTransaction.daysToExpiry,
      newTransaction.breakEvenPrice,
      newTransaction.strikePrice,
      newTransaction.premium,
      newTransaction.numberOfContracts,
      newTransaction.fees,
      newTransaction.status,
      newTransaction.exitPrice,
      newTransaction.closeDate?.toISOString(),
      newTransaction.profitLoss,
      newTransaction.daysHeld,
      newTransaction.annualizedROR,
      newTransaction.cashReserve,
      newTransaction.marginCashReserve,
      newTransaction.costBasisPerShare,
      newTransaction.createdAt.toISOString(),
      newTransaction.updatedAt.toISOString()
    );

    return newTransaction;
  },

  // Update an existing transaction
  updateTransaction(id: string, updates: Partial<OptionsTransaction>): OptionsTransaction | null {
    const existing = getTransaction.get(id);
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
      updated.stockSymbol,
      updated.tradeOpenDate.toISOString(),
      updated.expiryDate.toISOString(),
      updated.callOrPut,
      updated.buyOrSell,
      updated.stockPriceCurrent,
      updated.daysToExpiry,
      updated.breakEvenPrice,
      updated.strikePrice,
      updated.premium,
      updated.numberOfContracts,
      updated.fees,
      updated.status,
      updated.exitPrice,
      updated.closeDate?.toISOString(),
      updated.profitLoss,
      updated.daysHeld,
      updated.annualizedROR,
      updated.cashReserve,
      updated.marginCashReserve,
      updated.costBasisPerShare,
      updated.updatedAt.toISOString(),
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
    const row = getTransaction.get(id);
    return row ? rowToTransaction(row) : null;
  },

  // Get all transactions
  getAllTransactions(): OptionsTransaction[] {
    const rows = getAllTransactions.all();
    return rows.map(rowToTransaction);
  },

  // Get transactions by status
  getTransactionsByStatus(status: 'Open' | 'Closed' | 'Rolled Forward'): OptionsTransaction[] {
    const stmt = db.prepare('SELECT * FROM transactions WHERE status = ? ORDER BY tradeOpenDate DESC');
    const rows = stmt.all(status);
    return rows.map(rowToTransaction);
  },

  // Get transactions by stock symbol
  getTransactionsBySymbol(symbol: string): OptionsTransaction[] {
    const stmt = db.prepare('SELECT * FROM transactions WHERE stockSymbol = ? ORDER BY tradeOpenDate DESC');
    const rows = stmt.all(symbol);
    return rows.map(rowToTransaction);
  },

  // Get transactions by date range
  getTransactionsByDateRange(startDate: Date, endDate: Date): OptionsTransaction[] {
    const stmt = db.prepare(`
      SELECT * FROM transactions
      WHERE tradeOpenDate >= ? AND tradeOpenDate <= ?
      ORDER BY tradeOpenDate DESC
    `);
    const rows = stmt.all(startDate.toISOString(), endDate.toISOString());
    return rows.map(rowToTransaction);
  },

  // Get database statistics
  getStats() {
    const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
    const openTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE status = "Open"').get() as { count: number };
    const closedTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE status = "Closed"').get() as { count: number };
    const totalProfitLoss = db.prepare('SELECT SUM(profitLoss) as total FROM transactions WHERE status = "Closed"').get() as { total: number };

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
