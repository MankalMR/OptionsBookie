import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GeminiService } from "@/lib/gemini-service";
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

    try {
      const summary = await GeminiService.generatePortfolioSummary(totalPnL, winRate, topSymbols, totalRoC, timeframe);
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
