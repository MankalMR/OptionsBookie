import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { secureDb } from '@/lib/database-secure';
import { alphaVantageStockService } from '@/lib/stock-price-alphavantage';
import { calculatePortfolioRoR, getRealizedTransactions } from '@/utils/optionsCalculations';
import type { OptionsTransaction } from '@/types/options';
import { historicalDataCache } from '@/lib/historical-data-cache';

interface BenchmarkDataPoint {
  date: string;
  portfolioReturn: number;
  sp500Return: number;
  cumulativePortfolio: number;
  cumulativeSP500: number;
}

interface BenchmarkResponse {
  success: boolean;
  data?: BenchmarkDataPoint[];
  error?: string;
  metadata?: {
    totalMonths: number;
    portfolioTotalReturn: number;
    sp500TotalReturn: number;
    correlation?: number;
    alpha?: number;
    beta?: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BenchmarkResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get query parameters
    const { months = '24', portfolioId } = req.query;
    const monthsToFetch = parseInt(months as string, 10);

    if (monthsToFetch < 1 || monthsToFetch > 60) {
      return res.status(400).json({
        success: false,
        error: 'Months parameter must be between 1 and 60'
      });
    }

    // Try to get S&P 500 data from cache first
    console.log('Checking cache for S&P 500 historical data...');
    let sp500Data = await historicalDataCache.getCachedData('SPY');

    if (!sp500Data) {
      // Cache miss - fetch from Alpha Vantage
      console.log(`Cache miss - fetching ${monthsToFetch} months of S&P 500 data from Alpha Vantage...`);
      const freshData = await alphaVantageStockService.getHistoricalMonthlyData('SPY', monthsToFetch);

      if (freshData && freshData.length > 0) {
        // Cache the data for 30 days (freshData is already in the correct format)
        await historicalDataCache.cacheData('SPY', freshData);
        sp500Data = freshData;
      }
    } else {
      console.log(`Cache hit - using cached S&P 500 data (${sp500Data.length} data points)`);
    }

    // Fallback to static data if both cache and Alpha Vantage fail
    if (!sp500Data || sp500Data.length === 0) {
      console.log('Both cache and Alpha Vantage failed, using fallback S&P 500 data');
      sp500Data = [
        {
          date: '2025-09-30',
          close: 666.18
        },
        {
          date: '2025-10-22', // Current date from your earlier data
          close: 667.80
        }
      ];
    }

    // Sort data chronologically first (Alpha Vantage returns newest first)
    sp500Data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('S&P 500 data after initial sort:', sp500Data.map(p => p.date));

    // Calculate monthly returns for the data (whether from cache or fresh)
    const sp500DataWithReturns = sp500Data.map((point, index) => {
      let monthlyReturn = 0;
      if (index > 0) {
        const prevClose = sp500Data[index - 1].close;
        monthlyReturn = ((point.close - prevClose) / prevClose) * 100;
      }
      return {
        ...point,
        monthlyReturn
      };
    });

    // Fetch user's portfolio transactions using the reusable secure database method
    const allTransactions = await secureDb.getTransactions(session.user.email);

    if (!allTransactions || allTransactions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No transactions found for portfolio'
      });
    }

    // Filter by portfolio if specified
    const transactions = portfolioId
      ? allTransactions.filter(t => t.portfolioId === portfolioId)
      : allTransactions;

    // Use the reusable method to get realized transactions
    const realizedTransactions = getRealizedTransactions(transactions);

    if (realizedTransactions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No realized transactions found for portfolio'
      });
    }

    // Find portfolio start date (earliest close date)
    const portfolioStartDate = new Date(Math.min(...realizedTransactions
      .filter(t => t.closeDate)
      .map(t => t.closeDate!.getTime())
    ));

    // Debug info (can be removed in production)
    console.log(`Portfolio start date: ${portfolioStartDate.toISOString()}`);
    console.log(`Found ${realizedTransactions.length} realized transactions`);

    // Group realized transactions by month when they were closed
    const monthlyPortfolioReturns = new Map<string, number>();
    const transactionsByMonth = new Map<string, OptionsTransaction[]>();

    realizedTransactions.forEach(transaction => {
      if (!transaction.closeDate) return;

      const date = transaction.closeDate;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!transactionsByMonth.has(monthKey)) {
        transactionsByMonth.set(monthKey, []);
      }
      transactionsByMonth.get(monthKey)!.push(transaction);
    });

    // Calculate portfolio returns for each month using the reusable method
    transactionsByMonth.forEach((monthTransactions, monthKey) => {
      const monthlyRoR = calculatePortfolioRoR(monthTransactions);
      monthlyPortfolioReturns.set(monthKey, monthlyRoR);
    });

    // Filter S&P 500 data to start from portfolio start date
    const sortedSP500Data = sp500DataWithReturns
      .filter(point => new Date(point.date) >= portfolioStartDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`S&P 500 data points after filtering: ${sortedSP500Data.length}`);

    if (sortedSP500Data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No S&P 500 data available for portfolio timeframe'
      });
    }

    // Align data by matching months
    const benchmarkData: BenchmarkDataPoint[] = [];
    let cumulativePortfolio = 100; // Start with $100 base
    let cumulativeSP500 = 100;

    sortedSP500Data.forEach(sp500Point => {
      const sp500Date = new Date(sp500Point.date);
      const monthKey = `${sp500Date.getFullYear()}-${String(sp500Date.getMonth() + 1).padStart(2, '0')}`;

      const portfolioReturn = monthlyPortfolioReturns.get(monthKey) || 0;
      const sp500Return = sp500Point.monthlyReturn || 0;

      console.log(`S&P 500 point: ${sp500Point.date} (${monthKey}) - Portfolio: ${portfolioReturn.toFixed(2)}%, S&P: ${sp500Return.toFixed(2)}%`);

      // Calculate cumulative returns
      cumulativePortfolio *= (1 + portfolioReturn / 100);
      cumulativeSP500 *= (1 + sp500Return / 100);

      benchmarkData.push({
        date: sp500Point.date,
        portfolioReturn,
        sp500Return,
        cumulativePortfolio,
        cumulativeSP500
      });
    });

    console.log(`Final benchmark data points: ${benchmarkData.length}`);
    console.log('Final benchmark data order:', benchmarkData.map(d => d.date));

    // Calculate performance metrics
    const portfolioReturns = benchmarkData.map(d => d.portfolioReturn);
    const sp500Returns = benchmarkData.map(d => d.sp500Return);

    const portfolioTotalReturn = ((cumulativePortfolio - 100) / 100) * 100;
    const sp500TotalReturn = ((cumulativeSP500 - 100) / 100) * 100;

    // Calculate correlation
    const correlation = calculateCorrelation(portfolioReturns, sp500Returns);

    // Calculate beta (portfolio volatility relative to market)
    const beta = calculateBeta(portfolioReturns, sp500Returns);

    // Calculate alpha (excess return over market)
    const alpha = portfolioTotalReturn - sp500TotalReturn;

    // Return data in reverse chronological order (most recent first)
    const responseData = benchmarkData.reverse();

    res.status(200).json({
      success: true,
      data: responseData,
      metadata: {
        totalMonths: responseData.length,
        portfolioTotalReturn,
        sp500TotalReturn,
        correlation,
        alpha,
        beta
      }
    });

  } catch (error) {
    console.error('Benchmark comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Helper function to calculate correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

// Helper function to calculate beta (systematic risk)
function calculateBeta(portfolioReturns: number[], marketReturns: number[]): number {
  if (portfolioReturns.length !== marketReturns.length || portfolioReturns.length === 0) return 1;

  const n = portfolioReturns.length;
  const meanPortfolio = portfolioReturns.reduce((a, b) => a + b, 0) / n;
  const meanMarket = marketReturns.reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < n; i++) {
    const portfolioDiff = portfolioReturns[i] - meanPortfolio;
    const marketDiff = marketReturns[i] - meanMarket;

    covariance += portfolioDiff * marketDiff;
    marketVariance += marketDiff * marketDiff;
  }

  covariance /= (n - 1);
  marketVariance /= (n - 1);

  return marketVariance === 0 ? 1 : covariance / marketVariance;
}
