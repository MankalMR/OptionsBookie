import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GeminiService } from "@/lib/ai/gemini-service";
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

    const filters = await GeminiService.parsePortfolioQuery(query, useMock);
    return NextResponse.json(filters);
  } catch (error) {
    logger.error({ err: error }, "Error in parse-query API:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
