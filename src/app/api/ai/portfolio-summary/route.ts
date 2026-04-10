import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GeminiService } from "@/lib/ai/gemini-service";
import { isDemoEnabled } from "@/lib/demo-guards";

export async function POST(req: Request) {
  try {
    const { totalPnL, winRate, topSymbols, totalRoC, timeframe, isDemo } = await req.json();

    const session = await getServerSession(authOptions);
    const isSiteDemoEnabled = isDemoEnabled();

    // Logic: Use real AI if authenticated, else use mock if it's a demo request on a demo-enabled site.
    const useLlm = !!(session && session.user);
    const useMock = !useLlm && isDemo && isSiteDemoEnabled;

    if (!useLlm && !useMock) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const summary = await GeminiService.generatePortfolioSummary({
      totalPnL,
      winRate,
      topSymbols,
      totalRoC,
      timeframe,
      isDemo: useMock
    });

    return NextResponse.json({ summary });
  } catch (error: any) {
    logger.error({ err: error }, "Error in portfolio-summary API:");
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
