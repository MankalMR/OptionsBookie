// Options Trading Data Types
export interface AIFilter {
  symbol?: string;
  type?: 'Call' | 'Put';
  outcome?: 'win' | 'loss';
  action?: 'Buy' | 'Sell';
  status?: 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled';
  timeframe?: string;
  strategy?: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptionsTransactionRow {
  id: string;
  user_id: string;
  portfolio_id: string;
  stock_symbol: string;
  trade_open_date: string;
  expiry_date: string;
  call_or_put: 'Call' | 'Put';
  buy_or_sell: 'Buy' | 'Sell';
  stock_price_current: number | string;
  break_even_price: number | string;
  strike_price: number | string;
  premium: number | string;
  number_of_contracts: number;
  fees?: number | string;
  status: 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled';
  exit_price?: number | string;
  close_date?: string;
  profit_loss?: number | string;
  annualized_ror?: number | string;
  cash_reserve?: number | string;
  margin_cash_reserve?: number | string;
  cost_basis_per_share?: number | string;
  chain_id?: string;
  collateral_amount?: number | string;
  created_at: string;
  updated_at: string;
}

export interface OptionsTransaction {
  id: string;
  portfolioId: string;
  stockSymbol: string;
  tradeOpenDate: Date;
  expiryDate: Date;
  callOrPut: 'Call' | 'Put';
  buyOrSell: 'Buy' | 'Sell';
  stockPriceCurrent?: number;
  breakEvenPrice: number;
  strikePrice: number;
  premium: number;
  numberOfContracts: number;
  cashReserve?: number;
  marginCashReserve?: number;
  costBasisPerShare?: number;
  fees: number;
  exitPrice?: number;
  closeDate?: Date;
  profitLoss?: number;
  annualizedROR?: number;
  status: 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled';
  chainId?: string; // NEW: Link to trade chain
  collateralAmount?: number; // Manual override for collateral amount (for accurate RoR in complex strategies)
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeChain {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  optionType: 'Call' | 'Put';
  originalStrikePrice: number;
  originalOpenDate: Date;
  chainStatus: 'Active' | 'Closed';
  totalChainPnl: number;
  createdAt: Date;
  updatedAt: Date;
  transactions?: OptionsTransaction[]; // Related transactions
}

export interface PortfolioSummary {
  totalOpenPositions: number;
  totalClosedPositions: number;
  totalProfitLoss: number;
  unrealizedPnL: number;
  totalFees: number;
  winRate: number;
  averageDaysHeld: number;
  monthlyPnL: MonthlyPnL[];
}

export interface MonthlyPnL {
  year: number;
  month: number;
  monthName: string;
  profitLoss: number;
  numberOfTrades: number;
  winRate: number;
}

export interface OptionsGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  lastUpdated: Date;
}

export interface OptionsChain {
  symbol: string;
  expirationDate: Date;
  calls: OptionsContract[];
  puts: OptionsContract[];
  lastUpdated: Date;
}

export interface OptionsContract {
  symbol: string;
  strike: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface SchwabAPIConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountId?: string;
}