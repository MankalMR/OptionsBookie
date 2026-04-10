import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { etfCacheService } from '@/lib/etf-cache';
import { alphaVantageEtfProvider } from '@/lib/etf-provider-alphavantage';
import { GeminiService } from '@/lib/ai/gemini-service';
import { logger } from "@/lib/logger";
import type { EtfSearchResult } from '@/types/etf';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const localOnly = searchParams.get('localOnly') === 'true';

    if (!q || !q.trim()) {
      return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    const query = q.trim().toUpperCase();
    const userEmail = session.user.email;

    // Search the cache first
    const cacheResults = await etfCacheService.searchCache(query);

    let results: EtfSearchResult[] = [];

    // Always prioritize cache results if available
    if (cacheResults.length > 0) {
      const savedTickers = await etfCacheService.getUserSavedTickers(userEmail);
      const savedSet = new Set(savedTickers);

      results = cacheResults.map(row => ({
        ticker: row.ticker,
        fundName: row.fund_name,
        isCached: true,
        isSaved: savedSet.has(row.ticker),
      }));
    } 
    
    // If no cache results and we only want local lookup, stop here
    if (results.length === 0 && localOnly) {
      return NextResponse.json([]);
    }

    // fallback to remote if no cache results found and localOnly is false
    if (results.length === 0) {
      logger.info({ query }, "Search API: No cache results, falling back to remote providers");
      
      let profile = null;

      // Failover logic: If Alpha Vantage is rate-limited, skip straight to Gemini
      if (alphaVantageEtfProvider.isLimited()) {
        logger.info({ query }, "Search API: Alpha Vantage is rate-limited, skipping to Gemini shadow profile");
        profile = await GeminiService.generateEtfProfile(query);
      } else {
        profile = await alphaVantageEtfProvider.getEtfProfile(query);
        
        if (profile) {
          if (!profile.fundName) {
            const metadata = await GeminiService.recoverEtfMetadata(query);
            if (metadata) Object.assign(profile, metadata);
          }

          // Trigger enrichment if any symbols are "n/a" or missing
          const needsEnrichment = profile.topHoldings?.some(h => 
            !h.symbol || h.symbol.toLowerCase() === 'n/a'
          );
          
          if (needsEnrichment) {
            const enriched = await GeminiService.enrichEtfHoldings(query, profile.topHoldings);
            if (enriched) profile.topHoldings = enriched;
          }
        } else {
          logger.info({ query }, "Search API: Alpha Vantage found nothing, falling back to Gemini");
          profile = await GeminiService.generateEtfProfile(query);
        }
      }

      if (profile) {
        // Cache the result
        await etfCacheService.cacheEtf(query, profile);

        const savedTickers = await etfCacheService.getUserSavedTickers(userEmail);
        results = [{
          ticker: profile.ticker,
          fundName: profile.fundName,
          isCached: true,
          isSaved: savedTickers.includes(profile.ticker),
        }];
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    logger.error({ error }, 'Error searching ETFs:');
    return NextResponse.json(
      { error: 'Failed to search ETFs' },
      { status: 500 }
    );
  }
}
