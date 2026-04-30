import { NextRequest, NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { etfCacheService } from '@/lib/etf-cache';
import { alphaVantageEtfProvider } from '@/lib/etf-provider-alphavantage';
import { logger } from "@/lib/logger";
import { GeminiService } from '@/lib/ai/gemini-service';
import { calculateTopTenConcentration } from '@/lib/etf-utils';
import type { EtfProfile } from '@/types/etf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();
    const userEmail = session.user.email;

    // Check cache
    const cached = await etfCacheService.getCachedEtf(ticker);

    let profile: EtfProfile | null = null;

    if (cached) {
      const row = cached.data;
      const topTenWeight = calculateTopTenConcentration(row.top_holdings);

      profile = {
        ticker: row.ticker,
        fundName: row.fund_name,
        issuer: row.issuer,
        netAssets: row.net_assets,
        netExpenseRatio: row.net_expense_ratio,
        dividendYield: row.dividend_yield,
        dividendFrequency: row.dividend_frequency,
        exDividendDate: row.ex_dividend_date,
        benchmarkIndex: row.benchmark_index,
        assetCategory: row.asset_category,
        inceptionDate: row.inception_date,
        portfolioTurnover: row.portfolio_turnover,
        leveraged: row.leveraged,
        topHoldings: row.top_holdings || [],
        topTenConcentration: (topTenWeight !== null && topTenWeight > 0) ? topTenWeight : null,
        sectorAllocation: row.sector_allocation || [],
        cachedAt: row.cached_at,
        isStale: cached.isStale,
        isSaved: false,
        isAiGenerated: row.provider === 'gemini',
      };

      // Trigger background repair if:
      // 1. Data is time-stale (isStale)
      // 2. Data is incomplete (has 'n/a' or missing symbols in holdings)
      // 3. Data is logically incorrect (negative yield or expense ratio)
      const needsRepair = cached.isStale || 
        profile.topHoldings?.some(h => !h.symbol || h.symbol.toLowerCase() === 'n/a') ||
        (profile.dividendYield !== null && profile.dividendYield < 0) ||
        (profile.netExpenseRatio !== null && profile.netExpenseRatio < 0);

      if (needsRepair) {
        after(async () => {
          try {
            let fresh = null;
            
            if (alphaVantageEtfProvider.isLimited()) {
              logger.info(`Alpha Vantage limited, skipping background refresh for ${ticker} to Gemini`);
              fresh = await GeminiService.generateEtfProfile(ticker);
            } else {
              fresh = await alphaVantageEtfProvider.getEtfProfile(ticker);
              if (fresh && !fresh.fundName) {
                const metadata = await GeminiService.recoverEtfMetadata(ticker);
                if (metadata) Object.assign(fresh, metadata);
              }
            }

            if (fresh) {
              // Check if any symbols are "n/a" or missing
              const needsEnrichment = fresh.topHoldings?.some(h => 
                !h.symbol || h.symbol.toLowerCase() === 'n/a'
              );
              
              if (needsEnrichment) {
                const enriched = await GeminiService.enrichEtfHoldings(ticker, fresh.topHoldings);
                if (enriched) fresh.topHoldings = enriched;
              }

              await etfCacheService.cacheEtf(ticker, fresh);
              logger.info(`Successfully refreshed stale ETF cache for ${ticker}`);
            }
          } catch (err) {
            logger.error({ error: err }, `Error refreshing stale ETF ${ticker}:`);
          }
        });
      }
    } else {
      // Not cached — fetch fresh
      if (alphaVantageEtfProvider.isLimited()) {
        logger.info(`Alpha Vantage limited, failing over to Gemini Shadow for ${ticker}`);
        profile = await GeminiService.generateEtfProfile(ticker);
      } else {
        profile = await alphaVantageEtfProvider.getEtfProfile(ticker);

        if (profile) {
          if (!profile.fundName) {
            const metadata = await GeminiService.recoverEtfMetadata(ticker);
            if (metadata) Object.assign(profile, metadata);
          }
          
          // Check if any symbols are "n/a" or missing
          const needsEnrichment = profile.topHoldings?.some(h => 
            !h.symbol || h.symbol.toLowerCase() === 'n/a'
          );
          
          if (needsEnrichment) {
            const enriched = await GeminiService.enrichEtfHoldings(ticker, profile.topHoldings);
            if (enriched) profile.topHoldings = enriched;
          }
        } else {
          logger.warn(`Primary provider failed for ${ticker}, generating shadow profile via Gemini`);
          profile = await GeminiService.generateEtfProfile(ticker);
        }
      }
      
      if (profile) {
        await etfCacheService.cacheEtf(ticker, profile);
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: `ETF profile not found for ${ticker}` },
        { status: 404 }
      );
    }

    // Check if user has saved this ticker
    const savedTickers = await etfCacheService.getUserSavedTickers(userEmail);
    profile.isSaved = savedTickers.includes(ticker);

    await etfCacheService.recordView(userEmail, ticker);
    return NextResponse.json(profile);
  } catch (error) {
    logger.error({ error }, 'Error fetching ETF profile:');
    return NextResponse.json(
      { error: 'Failed to fetch ETF profile' },
      { status: 500 }
    );
  }
}
