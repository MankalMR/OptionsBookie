import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const isDemoMode = process.env.ENABLE_DEMO_MODE === "1";

    if (!isDemoMode) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    if (isDemoMode) {
      // Mocked response for Demo Mode
      await new Promise((resolve) => setTimeout(resolve, 800));

      const qLower = query.toLowerCase();
      const filters: any = {};

      if (qLower.includes("tsla")) filters.symbol = "TSLA";
      if (qLower.includes("put")) filters.type = "Put";
      if (qLower.includes("win")) filters.outcome = "win";

      return NextResponse.json(filters);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY is not set.");
      return NextResponse.json({ error: "LLM Service Unavailable" }, { status: 503 });
    }

    const prompt = `You are a financial query parser for a stock options trade history dashboard.
    Extract the following optional filters from the user's natural language query.
    If a filter is not mentioned, omit it from the JSON.

    Fields:
    - symbol: The stock ticker (e.g. "AAPL", "TSLA"). Return as uppercase.
    - type: The options strategy type. Can be "Call" or "Put".
    - outcome: Whether the trade was a win or loss. Can be "win" or "loss".

    Return ONLY a valid JSON object. Do not include markdown formatting or backticks.

    Query: "${query}"`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("No text response from Gemini");
      }

      const text = response.text;

      // Attempt to clean JSON (remove markdown ticks if present despite prompt)
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const filters = JSON.parse(jsonStr);

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
