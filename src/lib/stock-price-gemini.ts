import { GoogleGenAI, Type } from "@google/genai";
import { logger } from "@/lib/logger";
import { StockPriceResponse, StockPriceService } from "./stock-price-factory";

export class GeminiStockService implements StockPriceService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ''
    });
  }

  async getStockPrice(symbol: string, _activeSymbols?: string[]): Promise<StockPriceResponse | null> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY not configured. Gemini stock prices will not be available.');
        return null;
      }

      const prompt = `Get the current stock price, change, and change percentage for ${symbol}. Return the response in strictly valid JSON format conforming to the schema.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              price: { type: Type.NUMBER },
              change: { type: Type.NUMBER },
              changePercent: { type: Type.NUMBER }
            },
            required: ["symbol", "price", "change", "changePercent"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        logger.error('Gemini API returned empty response for stock price');
        return null;
      }

      const data = JSON.parse(text);

      return {
        symbol: data.symbol.toUpperCase(),
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        timestamp: new Date().toISOString(),
        isAiGenerated: true
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching stock price from Gemini:');
      return null;
    }
  }

  async getMultipleStockPrices(symbols: string[], _activeSymbols?: string[]): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};

    if (!process.env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not configured. Gemini stock prices will not be available.');
      symbols.forEach(s => results[s] = null);
      return results;
    }

    try {
      const prompt = `Get the current stock price, change, and change percentage for the following symbols: ${symbols.join(', ')}. Return the response in strictly valid JSON format conforming to the schema.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                price: { type: Type.NUMBER },
                change: { type: Type.NUMBER },
                changePercent: { type: Type.NUMBER }
              },
              required: ["symbol", "price", "change", "changePercent"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        logger.error('Gemini API returned empty response for multiple stock prices');
        symbols.forEach(s => results[s] = null);
        return results;
      }

      const dataArray = JSON.parse(text);

      symbols.forEach(symbol => {
        results[symbol] = null;
      });

      if (Array.isArray(dataArray)) {
        dataArray.forEach((data: { symbol?: string; price?: number; change?: number; changePercent?: number; }) => {
          if (data && data.symbol && typeof data.price === 'number') {
            const symbol = data.symbol.toUpperCase();
            results[symbol] = {
              symbol,
              price: data.price,
              change: data.change || 0,
              changePercent: data.changePercent || 0,
              timestamp: new Date().toISOString(),
              isAiGenerated: true
            };
          }
        });
      }

      return results;
    } catch (error) {
      logger.error({ error }, 'Error fetching multiple stock prices from Gemini:');
      symbols.forEach(s => results[s] = null);
      return results;
    }
  }

  getPriceComparison(currentPrice: number, strikePrice: number) {
    const difference = currentPrice - strikePrice;
    const percentDifference = (difference / strikePrice) * 100;

    return {
      difference,
      percentDifference,
      isInTheMoney: difference > 0,
      isOutOfTheMoney: difference < 0,
      isAtTheMoney: Math.abs(difference) < (strikePrice * 0.01) // Within 1%
    };
  }
}

export const geminiStockService = new GeminiStockService();
