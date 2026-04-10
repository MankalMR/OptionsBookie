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
