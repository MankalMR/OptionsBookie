// Options Trading Data Types
export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptionsTransaction {
  id: string;
  portfolioId: string;
  stockSymbol: string;
  tradeOpenDate: Date;
  expiryDate: Date;
  callOrPut: 'Call' | 'Put';
  buyOrSell: 'Buy' | 'Sell';
  stockPriceCurrent: number;
  daysToExpiry: number;
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
  daysHeld?: number;
  annualizedROR?: number;
  status: 'Open' | 'Closed' | 'Expired' | 'Assigned';
  createdAt: Date;
  updatedAt: Date;
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