import { NextRequest, NextResponse } from 'next/server';
import { StockPriceFactory } from '@/lib/stock-price-factory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');

    if (!symbols) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());

    // Debug: Check if API keys are available
    console.log('ALPHA_VANTAGE_KEY available:', !!process.env.ALPHA_VANTAGE_KEY);
    console.log('FINNHUB_API_KEY available:', !!process.env.FINNHUB_API_KEY);
    console.log('Available providers:', StockPriceFactory.getAvailableProviders());

    // Try cached first (which will fall back to Alpha Vantage if cache miss)
    let stockService = StockPriceFactory.initialize('cached');

    let result;
    let hasErrors = false;

    if (symbolList.length === 1) {
      // Single symbol
      result = await stockService.getStockPrice(symbolList[0]);

      // If cached service failed (returned null), try pure Finnhub as last resort
      if (!result) {
        console.log('Cached service failed, trying pure Finnhub as last resort');
        stockService = StockPriceFactory.initialize('finnhub');
        result = await stockService.getStockPrice(symbolList[0]);

        // If pure Finnhub also fails, mark as unavailable
        if (!result) {
          hasErrors = true;
        }
      }

      return NextResponse.json({
        [symbolList[0]]: result,
        _status: hasErrors ? 'unavailable' : 'available'
      });
    } else {
      // Multiple symbols
      result = await stockService.getMultipleStockPrices(symbolList);

      // If cached service failed for all symbols, try pure Finnhub as last resort
      const hasAnyResults = Object.values(result).some(price => price !== null);
      if (!hasAnyResults) {
        console.log('Cached service failed for all symbols, trying pure Finnhub as last resort');
        stockService = StockPriceFactory.initialize('finnhub');
        result = await stockService.getMultipleStockPrices(symbolList);

        // If pure Finnhub also fails, mark as unavailable
        const hasAnyFinnhubResults = Object.values(result).some(price => price !== null);
        if (!hasAnyFinnhubResults) {
          hasErrors = true;
        }
      }

      return NextResponse.json({
        ...result,
        _status: hasErrors ? 'unavailable' : 'available'
      });
    }
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock prices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    console.error('Error fetching stock prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock prices' },
      { status: 500 }
    );
  }
}
