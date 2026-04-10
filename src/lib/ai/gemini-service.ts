import { GoogleGenAI } from "@google/genai";
import { logger } from "@/lib/logger";
import { calculateTopTenConcentration } from "@/lib/etf-utils";
import type { EtfProfile } from "@/types/etf";
import { AI_PROMPTS } from "./prompts";

/**
 * Shared utility to get the configured Gemini client.
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey });
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Shared utility to strip markdown and handle potential parsing errors
 */
const cleanJsonResponse = (text: string) => {
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
   * Recovers/enriches missing metadata for an existing ETF profile.
   */
  static async recoverEtfMetadata(ticker: string): Promise<Partial<EtfProfile> | null> {
    try {
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.ETF_RECOVERY(ticker);

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      if (!response.text) return null;

      const data = cleanJsonResponse(response.text);

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
  }

  /**
   * Generates a complete ETF profile when the primary provider fails.
   */
  static async generateEtfProfile(ticker: string): Promise<EtfProfile | null> {
    try {
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.ETF_SHADOW_GEN(ticker);

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      if (!response.text) return null;

      const parsed = cleanJsonResponse(response.text);
      const topHoldings = Array.isArray(parsed.topHoldings) ? parsed.topHoldings : [];
      const topTenConcentration = calculateTopTenConcentration(topHoldings);

      return {
        ticker: ticker.toUpperCase(),
        fundName: parsed.fundName || null,
        issuer: parsed.issuer || null,
        netAssets: typeof parsed.netAssets === 'number' ? parsed.netAssets : null,
        netExpenseRatio: typeof parsed.netExpenseRatio === 'number' ? parsed.netExpenseRatio : null,
        dividendYield: typeof parsed.dividendYield === 'number' ? parsed.dividendYield : null,
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
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.PORTFOLIO_SUMMARY(timeframe, { totalPnL, winRate, topSymbols, totalRoC });

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

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
      const ai = getGeminiClient();
      const prompt = AI_PROMPTS.QUERY_PARSER(query);

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      return cleanJsonResponse(response.text || "{}");
    } catch (error) {
      logger.error({ error }, "Error parsing AI portfolio query");
      throw error;
    }
  }
}
