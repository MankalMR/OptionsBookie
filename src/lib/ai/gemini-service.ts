import { GoogleGenAI } from "@google/genai";
import { logger } from "@/lib/logger";
import { calculateTopTenConcentration } from "@/lib/etf-utils";
import type { EtfProfile, EtfHolding } from "@/types/etf";
import { AI_PROMPTS } from "./prompts";

/**
 * Shared utility to get the configured Gemini client.
 */
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey });
};

export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Shared utility to strip markdown and handle potential parsing errors
 */
export const cleanJsonResponse = (text: string) => {
  try {
    // Standard cleaning for LLM outputs that might include markdown blocks
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    logger.error({ text, error: e }, "Failed to parse JSON from Gemini response");
    throw new Error("Invalid response format from AI");
  }
};

export class GeminiService {
  /**
   * Tracks active AI requests to prevent redundant parallel calls for the same key.
   */
  private static inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Internal helper to collapse multiple identical requests into one.
   */
  private static async withConcurrencyGuard<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const active = this.inFlightRequests.get(key);
    if (active) {
      logger.info({ key }, "Gemini AI: Re-using in-flight request for identical key");
      return active as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.inFlightRequests.delete(key);
    });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Recovers/enriches missing metadata for an existing ETF profile.
   */
  static async recoverEtfMetadata(ticker: string): Promise<Partial<EtfProfile> | null> {
    return this.withConcurrencyGuard(`recover-${ticker}`, async () => {
      try {
      logger.info({ ticker, model: DEFAULT_MODEL }, "Gemini AI: Recovering ETF metadata");
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.ETF_RECOVERY(ticker);
      logger.info({ ticker, prompt }, "Gemini AI: Sending prompt for metadata recovery");

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      logger.info({ ticker, response: response.text }, "Gemini AI: Received response for metadata recovery");

      if (!response.text) {
        logger.warn({ ticker }, "Gemini AI: No text returned for metadata recovery");
        return null;
      }

      const data = cleanJsonResponse(response.text);
      logger.info({ ticker }, "Gemini AI: Metadata recovered successfully");

      return {
        fundName: data.fundName || null,
        issuer: data.issuer || null,
        assetCategory: data.assetCategory || null,
        leveraged: data.leveraged === "YES" || data.leveraged === "NO" ? data.leveraged : null,
      };
      } catch (error) {
        logger.error({ error }, `Failed to recover metadata for ETF ${ticker} via Gemini`);
        return null;
      }
    });
  }

  /**
   * Generates a complete ETF profile when the primary provider fails.
   */
  static async generateEtfProfile(ticker: string): Promise<EtfProfile | null> {
    return this.withConcurrencyGuard(`profile-${ticker}`, async () => {
      try {
      logger.info({ ticker, model: DEFAULT_MODEL }, "Gemini AI: Generating shadow ETF profile");
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.ETF_SHADOW_GEN(ticker);
      logger.info({ ticker, prompt }, "Gemini AI: Sending prompt for shadow profile generation");

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      logger.info({ ticker, response: response.text }, "Gemini AI: Received response for shadow profile generation");

      if (!response.text) {
        logger.warn({ ticker }, "Gemini AI: No text returned for shadow profile generation");
        return null;
      }

      const parsed = cleanJsonResponse(response.text);
      logger.info({ ticker }, "Gemini AI: Shadow profile generated successfully");
      const topHoldings = Array.isArray(parsed.topHoldings) ? parsed.topHoldings : [];
      const topTenConcentration = calculateTopTenConcentration(topHoldings);

      return {
        ticker: ticker.toUpperCase(),
        fundName: parsed.fundName || null,
        issuer: parsed.issuer || null,
        netAssets: typeof parsed.netAssets === 'number' ? parsed.netAssets : null,
        netExpenseRatio: typeof parsed.netExpenseRatio === 'number' ? Math.max(0, parsed.netExpenseRatio) : null,
        dividendYield: typeof parsed.dividendYield === 'number' ? Math.max(0, parsed.dividendYield) : null,
        dividendFrequency: null,
        exDividendDate: null,
        benchmarkIndex: null,
        assetCategory: parsed.assetCategory || null,
        inceptionDate: null,
        portfolioTurnover: null,
        leveraged: parsed.leveraged === "YES" || parsed.leveraged === "NO" ? parsed.leveraged : null,
        topHoldings,
        topTenConcentration: (topTenConcentration !== null && topTenConcentration > 0) ? topTenConcentration : null,
        sectorAllocation: Array.isArray(parsed.sectorAllocation) ? parsed.sectorAllocation : [],
        cachedAt: new Date().toISOString(),
        isStale: false,
        isSaved: false,
        isAiGenerated: true,
      };
      } catch (error) {
        logger.error({ error }, `Failed to generate shadow profile for ETF ${ticker} via Gemini`);
        return null;
      }
    });
  }

  /**
   * Enriches a list of ETF holdings by filling in missing symbols (n/a).
   */
  static async enrichEtfHoldings(ticker: string, holdings: EtfHolding[]): Promise<EtfHolding[]> {
    return this.withConcurrencyGuard(`enrich-${ticker}`, async () => {
      try {
      logger.info({ ticker }, "Gemini AI: Enriching ETF holdings symbols");
      const ai = getGeminiClient();
      
      // Convert holdings to a condensed string for the prompt to save tokens
      const holdingsStr = JSON.stringify(holdings.map(h => ({
        symbol: h.symbol,
        description:h.description,
        weight: h.weight
      })));
      
      const prompt = AI_PROMPTS.ETF_HOLDINGS_ENRICHMENT(ticker, holdingsStr);
      logger.info({ ticker, prompt }, "Gemini AI: Sending prompt for holdings enrichment");

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      logger.info({ ticker, response: response.text }, "Gemini AI: Received response for holdings enrichment");

      if (!response.text) {
        logger.warn({ ticker }, "Gemini AI: No response text for holdings enrichment");
        return holdings;
      }

      const enriched = cleanJsonResponse(response.text);
      if (Array.isArray(enriched)) {
        logger.info({ ticker }, "Gemini AI: Successfully enriched ETF holdings");
        return enriched;
      }

      return holdings;
      } catch (error) {
        logger.error({ error, ticker }, "Error enriching ETF holdings via Gemini");
        return holdings; // Return original if AI fails
      }
    });
  }

  /**
   * Generates a concise summary of portfolio performance metrics.
   */
  static async generatePortfolioSummary(params: {
    totalPnL: number;
    winRate: number;
    topSymbols: string[];
    totalRoC?: number;
    timeframe: string;
    isDemo?: boolean;
  }): Promise<string> {
    const { totalPnL, winRate, topSymbols, totalRoC, timeframe, isDemo } = params;

    if (isDemo) {
      logger.info({ timeframe, totalPnL }, "Gemini AI: Generating demo portfolio summary");
      // Logic for demo mode mock
      await new Promise((resolve) => setTimeout(resolve, 800));
      const winRateFormatted = typeof winRate === "number" ? winRate.toFixed(1) : "N/A";

      if (totalPnL >= 0) {
        return `Your portfolio is performing well in the ${timeframe} timeframe with a win rate of ${winRateFormatted}%. You have generated a total P&L of $${totalPnL.toFixed(2)}, primarily driven by success in ${topSymbols?.join(", ") || "various tickers"}. Your RoC is a solid ${totalRoC?.toFixed(1) || "N/A"}%.`;
      } else {
        return `Your portfolio has faced some headwinds in the ${timeframe} timeframe, showing a total P&L of $${totalPnL.toFixed(2)}. Your win rate stands at ${winRateFormatted}%, with detractors in ${topSymbols?.join(", ") || "major positions"}. Consider reviewing these trades for strategy adjustments.`;
      }
    }

    try {
      logger.info({ timeframe, model: DEFAULT_MODEL }, "Gemini AI: Generating live portfolio summary");
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.PORTFOLIO_SUMMARY(timeframe, { totalPnL, winRate, topSymbols, totalRoC });
      logger.info({ timeframe, prompt }, "Gemini AI: Sending prompt for live portfolio summary");

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      logger.info({ timeframe, response: response.text }, "Gemini AI: Received response for portfolio summary");

      logger.info({ timeframe }, "Gemini AI: Portfolio summary generated successfully");
      return response.text?.trim() || "Unable to generate summary.";
    } catch (error) {
      logger.error({ error }, "Error generating AI portfolio summary");
      throw error;
    }
  }

  /**
   * Parses natural language into transaction filter objects.
   */
  static async parsePortfolioQuery(query: string, isDemo: boolean = false): Promise<any> {
    if (isDemo) {
      logger.info({ query }, "Gemini AI: Parsing portfolio query (Demo Mode)");
      await new Promise((resolve) => setTimeout(resolve, 600));
      const qLower = query.toLowerCase();
      const filters: any = {};
      const symbolMatch = query.match(/\b[A-Z]{3,5}\b/);
      if (symbolMatch) filters.symbol = symbolMatch[0];
      if (qLower.includes("put")) filters.type = "Put";
      if (qLower.includes("call")) filters.type = "Call";
      if (qLower.includes("win")) filters.outcome = "win";
      if (qLower.includes("loss")) filters.outcome = "loss";
      return filters;
    }

    try {
      logger.info({ query, model: DEFAULT_MODEL }, "Gemini AI: Parsing portfolio query (Live LLM)");
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.QUERY_PARSER(query);
      logger.info({ query, prompt }, "Gemini AI: Sending prompt for portfolio query");

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      logger.info({ query, response: response.text }, "Gemini AI: Received response for portfolio query");

      const filters = cleanJsonResponse(response.text || "{}");
      logger.info({ query, filters }, "Gemini AI: Query parsed successfully");
      return filters;
    } catch (error) {
      logger.error({ error }, "Error parsing AI portfolio query");
      throw error;
    }
  }
}
