import { GoogleGenAI } from "@google/genai";
import { logger } from "@/lib/logger";
import { calculateTopTenConcentration } from "@/lib/etf-utils";
import type { EtfProfile } from "@/types/etf";

// Helper to get configured client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey });
};

export class GeminiService {
  /**
   * Parses natural language query into filter parameters.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async parseQuery(query: string): Promise<any> {
    try {
      const ai = getGeminiClient();

      const prompt = `You are a financial query parser for a stock options trade history dashboard.
      Extract the following optional filters from the user's natural language query.
      If a filter is not mentioned, omit it from the JSON.

      Fields:
      - symbol: The stock ticker or ETF symbol (e.g. "AAPL", "TSLA", "SOXX", "SPY"). Always return as uppercase.
      - type: The options strategy type. Can be "Call" or "Put".
      - outcome: Whether the trade was a win or loss. Can be "win" or "loss".

      Examples:
      1. "Show me winning SOXX trades" -> {"symbol": "SOXX", "outcome": "win"}
      2. "Losing TSLA puts" -> {"symbol": "TSLA", "type": "Put", "outcome": "loss"}
      3. "All calls" -> {"type": "Call"}

      Return ONLY a valid JSON object. Do not include markdown formatting, backticks, or any explanation.

      Query: "${query}"`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("No text response from Gemini");
      }

      const text = response.text;
      logger.info({ text }, "Gemini API parsed query:");

      // Attempt to clean JSON (remove markdown ticks if present despite prompt)
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error({ error }, `Failed to parse query via Gemini`);
      throw error;
    }
  }

  /**
   * Generates a plain-English narrative summary of portfolio performance.
   */
  static async generatePortfolioSummary(totalPnL: number, winRate: number, topSymbols: string[], totalRoC?: number, timeframe: string = "All Time"): Promise<string> {
    try {
      const ai = getGeminiClient();

      const prompt = `You are a helpful and professional financial trading assistant.
      Provide a brief, plain-English narrative summary (2-3 sentences max) of a user's options trading portfolio performance.

      Here are the metrics for the timeframe: "${timeframe}"
      - Total P&L: $${totalPnL}
      - Win Rate: ${winRate}%
      - Top Traded Symbols: ${topSymbols?.join(', ') || 'None'}
      - Total Return on Capital (RoC): ${totalRoC}%

      Draft a concise, natural language summary. Do not include introductory filler like "Here is a summary". Just return the summary text.`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("No text response from Gemini");
      }

      return response.text.trim();
    } catch (error) {
      logger.error({ error }, `Failed to generate portfolio summary via Gemini`);
      throw error;
    }
  }

  /**
   * Recovers/enriches missing metadata for an existing ETF profile (Hybrid Flow).
   */
  static async recoverEtfMetadata(ticker: string): Promise<Partial<EtfProfile> | null> {
    try {
      const ai = getGeminiClient();

      const prompt = `You are a strict financial data API. Return missing metadata for the ETF ticker "${ticker}".

      Return ONLY valid JSON with exactly these fields (omit if unknown):
      - fundName: The full name of the ETF (e.g. "Invesco QQQ Trust").
      - issuer: The issuer/provider (e.g. "Invesco", "Vanguard").
      - assetCategory: The asset category (e.g. "Equity", "Fixed Income").
      - leveraged: "YES" if it is a leveraged or inverse ETF, "NO" otherwise.

      Do not include markdown or backticks.`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) return null;

      const jsonStr = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(jsonStr);

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
   * Generates a complete ETF profile when the primary provider fails (Shadow Flow).
   */
  static async generateEtfProfile(ticker: string): Promise<EtfProfile | null> {
    try {
      const ai = getGeminiClient();

      const prompt = `You are a financial data API. The primary data source is down.
      Generate a complete profile estimate for the ETF with ticker symbol "${ticker}".
      Provide your best estimates based on your training data. For holdings, estimate the top 10 positions.

      Return ONLY valid JSON matching this structure:
      {
        "fundName": "string",
        "issuer": "string",
        "netAssets": number (in dollars, e.g. 500000000000),
        "netExpenseRatio": number (decimal, e.g. 0.0009 for 0.09%),
        "dividendYield": number (decimal, e.g. 0.015 for 1.5%),
        "assetCategory": "string",
        "leveraged": "YES" or "NO",
        "topHoldings": [
          { "symbol": "string", "description": "string", "weight": number (decimal) }
        ],
        "sectorAllocation": [
          { "sector": "string", "weight": number (decimal) }
        ]
      }

      Do not include markdown or backticks.`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) return null;

      const jsonStr = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);

      const topHoldings = Array.isArray(parsed.topHoldings) ? parsed.topHoldings : [];
      const topTenConcentration = calculateTopTenConcentration(topHoldings);

      const profile: EtfProfile = {
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

      return profile;
    } catch (error) {
      logger.error({ error }, `Failed to generate shadow profile for ETF ${ticker} via Gemini`);
      return null;
    }
  }
}
