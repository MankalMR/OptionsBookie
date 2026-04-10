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

    if (!q || !q.trim()) {
      return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    const query = q.trim().toUpperCase();
    const userEmail = session.user.email;

    // Search the cache first
    const cacheResults = await etfCacheService.searchCache(query);

    let results: EtfSearchResult[] = [];

    if (cacheResults.length > 0) {
      const savedTickers = await etfCacheService.getUserSavedTickers(userEmail);
      const savedSet = new Set(savedTickers);

      results = cacheResults.map(row => ({
        ticker: row.ticker,
        fundName: row.fund_name,
        isCached: true,
        isSaved: savedSet.has(row.ticker),
      }));
    } else {
      // No cache results — try fetching exact ticker match from Alpha Vantage
      let profile = await alphaVantageEtfProvider.getEtfProfile(query);
      if (profile) {
        if (!profile.fundName) {
          const metadata = await GeminiService.recoverEtfMetadata(query);
          if (metadata) Object.assign(profile, metadata);
        }
      } else {
        profile = await GeminiService.generateEtfProfile(query);
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
