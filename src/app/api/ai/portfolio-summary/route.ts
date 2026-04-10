import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GoogleGenAI } from "@google/genai";
import { isDemoEnabled } from "@/lib/demo-guards";

export async function POST(req: Request) {
  try {
    const { totalPnL, winRate, topSymbols, totalRoC, timeframe, isDemo } = await req.json();

    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      logger.error({ err: e }, "Failed to get server session");
    }
    const isSiteDemoEnabled = isDemoEnabled();

    // Logic: Use real AI if authenticated, else use mock if it's a demo request on a demo-enabled site.
    const useLlm = !!(session && session.user);
    const useMock = !useLlm && isDemo && isSiteDemoEnabled;

    if (!useLlm && !useMock) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (useMock) {
      // Mocked response for Demo Mode
      await new Promise((resolve) => setTimeout(resolve, 800));

      const isPositive = totalPnL >= 0;
      const winRateFormatted = typeof winRate === 'number' ? winRate.toFixed(1) : 'N/A';

      let summary = "";
      if (isPositive) {
        summary = `Your portfolio is performing well in the ${timeframe} timeframe with a win rate of ${winRateFormatted}%. `;
        summary += `You have generated a total P&L of $${totalPnL.toFixed(2)}, primarily driven by successful trades in ${topSymbols?.join(', ') || 'your top tickers'}. `;
        summary += `Your return on capital is a solid ${totalRoC?.toFixed(1) || 'N/A'}%. Keep up the good work!`;
      } else {
         summary = `Your portfolio has faced some headwinds in the ${timeframe} timeframe, showing a total P&L of $${totalPnL.toFixed(2)}. `;
         summary += `Your win rate stands at ${winRateFormatted}%, and the main detractors were trades in ${topSymbols?.join(', ') || 'your top tickers'}. `;
         summary += `Consider reviewing these trades to see if adjustments to your strategy are needed.`;
      }

      return NextResponse.json({ summary });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY is not set.");
      return NextResponse.json({ error: "LLM Service Unavailable" }, { status: 503 });
    }

    const prompt = `You are a helpful and professional financial trading assistant.
    Provide a brief, plain-English narrative summary (2-3 sentences max) of a user's options trading portfolio performance.

    Here are the metrics for the timeframe: "${timeframe}"
    - Total P&L: $${totalPnL}
    - Win Rate: ${winRate}%
    - Top Traded Symbols: ${topSymbols?.join(', ') || 'None'}
    - Total Return on Capital (RoC): ${totalRoC}%

    Draft a concise, natural language summary. Do not include introductory filler like "Here is a summary". Just return the summary text.`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("No text response from Gemini");
      }

      const summary = response.text.trim();
      return NextResponse.json({ summary });
    } catch (apiError: any) {
      logger.error({ err: apiError }, "Gemini API error:");
      return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }
  } catch (error) {
    logger.error({ err: error }, "Error in portfolio-summary API:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
