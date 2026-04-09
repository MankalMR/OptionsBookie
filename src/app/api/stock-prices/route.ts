import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StockPriceFactory } from '@/lib/stock-price-factory';
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');
    const activeSymbolsParam = searchParams.get('activeSymbols');
    const activeSymbols = activeSymbolsParam ? activeSymbolsParam.split(',').map(s => s.trim().toUpperCase()) : [];

    if (!symbols) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());

    // Debug: Check if API keys are available
    logger.info({ data0: !!process.env.ALPHA_VANTAGE_KEY }, 'ALPHA_VANTAGE_KEY available:');
    logger.info({ data0: !!process.env.FINNHUB_API_KEY }, 'FINNHUB_API_KEY available:');
    logger.info({ data0: StockPriceFactory.getAvailableProviders() }, 'Available providers:');

    // Use cached service (which handles Alpha Vantage -> Finnhub -> Stale Cache fallbacks internally)
    const stockService = StockPriceFactory.initialize('cached');

    let result;
    let hasErrors = false;

    if (symbolList.length === 1) {
      // Single symbol
      result = await stockService.getStockPrice(symbolList[0], activeSymbols);
      
      if (!result) {
        hasErrors = true;
      }

      return NextResponse.json({
        [symbolList[0]]: result,
        _status: hasErrors ? 'unavailable' : 'available'
      });
    } else {
      // Multiple symbols
      result = await stockService.getMultipleStockPrices(symbolList, activeSymbols);

      // Check if we got NO data back for ANY requested symbol (even stale cache)
      const hasAnyResults = Object.values(result).some(price => price !== null);
      if (!hasAnyResults) {
        hasErrors = true;
      }

      return NextResponse.json({
        ...result,
        _status: hasErrors ? 'unavailable' : 'available'
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching stock prices:');
    return NextResponse.json(
      { error: 'Failed to fetch stock prices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    // Use cached service (which falls back to Alpha Vantage internally)
    const stockService = StockPriceFactory.initialize('cached');
    const prices = await stockService.getMultipleStockPrices(symbols);
    return NextResponse.json(prices);
  } catch (error) {
    logger.error({ error }, 'Error fetching stock prices:');
    return NextResponse.json(
      { error: 'Failed to fetch stock prices' },
      { status: 500 }
    );
  }
}
