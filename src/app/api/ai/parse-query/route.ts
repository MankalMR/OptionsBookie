import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GeminiService } from "@/lib/gemini-service";
import { isDemoEnabled } from "@/lib/demo-guards";

export async function POST(req: Request) {
  try {
    const { query, isDemo } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
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

      const qLower = query.toLowerCase();
      const filters: any = {};

      // Heuristic: Extract 3-5 letter uppercase words as symbols (e.g. "SOXX")
      const symbolMatch = query.match(/\b[A-Z]{3,5}\b/);
      if (symbolMatch) {
        filters.symbol = symbolMatch[0];
      } else {
        // Fallback for common tickers in lowercase
        const common = ["tsla", "aapl", "soxx", "spy", "qqq", "nvda"];
        const found = common.find(t => qLower.includes(t));
        if (found) filters.symbol = found.toUpperCase();
      }

      if (qLower.includes("put")) filters.type = "Put";
      if (qLower.includes("call")) filters.type = "Call";
      if (qLower.includes("win")) filters.outcome = "win";
      if (qLower.includes("loss")) filters.outcome = "loss";

      return NextResponse.json(filters);
    }

    try {
      const filters = await GeminiService.parseQuery(query);
      return NextResponse.json(filters);
    } catch (apiError: any) {
      logger.error({ err: apiError }, "Gemini API error:");
      return NextResponse.json({ error: "Failed to parse query" }, { status: 500 });
    }
  } catch (error) {
    logger.error({ err: error }, "Error in parse-query API:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
