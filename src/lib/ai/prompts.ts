/**
 * Centralized LLM prompts for the OptionsBookie AI Subsystem.
 * Keeping these here makes it easy to refine, version, and A/B test AI behavior.
 */
export const AI_PROMPTS = {
  /**
   * Used to recover missing metadata for an ETF.
   */
  ETF_RECOVERY: (ticker: string) => `
    You are a strict financial data API. Return missing metadata for the ETF ticker "${ticker}".
      
    Return ONLY valid JSON with exactly these fields (omit if unknown):
    - fundName: The full name of the ETF (e.g. "Invesco QQQ Trust").
    - issuer: The issuer/provider (e.g. "Invesco", "Vanguard").
    - assetCategory: The asset category (e.g. "Equity", "Fixed Income").
    - leveraged: "YES" if it is a leveraged or inverse ETF, "NO" otherwise.
    
    Do not include markdown or backticks.
  `,

  /**
   * Used to generate a full ETF profile estimate when primary source is down.
   */
  ETF_SHADOW_GEN: (ticker: string) => `
    You are a financial data API. The primary data source is down. 
    Generate a complete profile estimate for the ETF with ticker symbol "${ticker}".
    Provide your best estimates based on your training data. For holdings, estimate the top 10 positions.
    
    Return ONLY valid JSON matching this structure:
    {
      "fundName": "string",
      "issuer": "string",
      "netAssets": number (in dollars),
      "netExpenseRatio": number (decimal, e.g. 0.0009),
      "dividendYield": number (decimal, e.g. 0.015),
      "assetCategory": "string",
      "leveraged": "YES" or "NO",
      "topHoldings": [
        { "symbol": "string", "description": "string", "weight": number (decimal) }
      ],
      "sectorAllocation": [
        { "sector": "string", "weight": number (decimal) }
      ]
    }
    
    Do not include markdown or backticks.
  `,

  /**
   * Used to fill in missing ticker symbols (n/a) in ETF holdings.
   */
  ETF_HOLDINGS_ENRICHMENT: (ticker: string, holdings: string) => `
    You are a strict financial data API. The ETF "${ticker}" has a list of top holdings, but some ticker symbols are missing (marked as "n/a").
    
    Current Holdings Data:
    ${holdings}
    
    Task:
    1. Identify the correct ticker symbols for any "n/a" entries based on their company description.
    2. Maintain the exact same order and weights.
    3. Return ONLY a valid JSON array of objects with "symbol", "description", and "weight".
    
    Example Input Format:
    [{"symbol": "n/a", "description": "CAMECO CORP", "weight": 0.23}]
    
    Example Output Format:
    [{"symbol": "CCJ", "description": "CAMECO CORP", "weight": 0.23}]
    
    Return ONLY the JSON array. Do not include markdown or backticks.
  `,

  /**
   * Used for generating the performance narrative in the History & Analytics tab.
   */
  PORTFOLIO_SUMMARY: (timeframe: string, metrics: { totalPnL: number; winRate: number; topSymbols: string[]; totalRoC?: number }) => `
    You are a professional financial trading assistant. 
    Provide a brief, plain-English narrative summary (2-3 sentences max) of a user's options trading portfolio performance.

    Here are the metrics for the timeframe: "${timeframe}"
    - Total P&L: $${metrics.totalPnL}
    - Win Rate: ${metrics.winRate}%
    - Top Traded Symbols: ${metrics.topSymbols?.join(', ') || 'None'}
    - Total Return on Capital (RoC): ${metrics.totalRoC}%

    Draft a concise, natural language summary. Do not include introductory filler like "Here is a summary". Just return the summary text.
  `,

  /**
   * Used to parse natural language queries into UI filters.
   */
  QUERY_PARSER: (query: string) => `
    You are a financial query parser for a stock options trade history dashboard.
    Extract the following optional filters from the user's natural language query: "${query}"
    
    Fields:
    - symbol: The stock ticker or ETF symbol. Always return as uppercase.
    - type: The options strategy type. Can be "Call" or "Put".
    - outcome: Whether the trade was a win or loss. Can be "win" or "loss".

    Return ONLY a valid JSON object. Do not include markdown formatting or backticks.
  `,

  /**
   * Used to generate a stock price fallback using Gemini.
   */
  STOCK_PRICE_FALLBACK: (symbol: string) => `
    Get the current stock price, change, and change percentage for ${symbol}. Return the response in strictly valid JSON format conforming to the schema.
  `,

  /**
   * Used to generate multiple stock price fallbacks using Gemini.
   */
  MULTIPLE_STOCK_PRICE_FALLBACK: (symbols: string) => `
    Get the current stock price, change, and change percentage for the following symbols: ${symbols}. Return the response in strictly valid JSON format conforming to the schema.
  `
};
