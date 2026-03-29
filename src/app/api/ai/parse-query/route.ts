import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { AIFilter } from '@/types/options';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
       logger.warn('GEMINI_API_KEY is not set. Returning unavailable status gracefully.');
       return NextResponse.json({ filter: { unavailable: true } });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `You are an options trading assistant. Parse the user's natural language query about their options trading history into a structured JSON filter object.
The JSON object must strictly adhere to this schema:
{
  "symbol": "string (optional, uppercase ticker symbol, e.g. AAPL)",
  "type": "string (optional, exactly 'Call' or 'Put')",
  "outcome": "string (optional, exactly 'win' or 'loss')",
  "action": "string (optional, exactly 'Buy' or 'Sell')",
  "status": "string (optional, exactly 'Open', 'Closed', 'Expired', 'Assigned', or 'Rolled')",
  "timeframe": "string (optional, e.g. 'this year', 'last month', '2025')",
  "strategy": "string (optional, e.g. 'iron condor', 'cash-secured put', 'covered call')"
}

Do not include markdown blocks, just return raw JSON. If a parameter is not specified or cannot be inferred from the query, omit it from the object.

Translate this user query about their options trading history into a structured filter object: "${query}"`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini API");
    }

    const object: AIFilter = JSON.parse(response.text);

    return NextResponse.json({ filter: object });
  } catch (error) {
    logger.error({ err: error }, 'Error in AI parse-query route');
    // Graceful fallback
    return NextResponse.json({ filter: { unavailable: true } });
  }
}
