import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        symbol: z.string().optional().describe('The stock ticker symbol (e.g., AAPL)'),
        type: z.enum(['Call', 'Put']).optional().describe('The option type (Call or Put)'),
        action: z.enum(['Buy', 'Sell']).optional().describe('The trade action (Buy or Sell)'),
        outcome: z.enum(['win', 'loss']).optional().describe('Whether the trade was a win (profit > 0) or loss (profit <= 0)'),
        timeframe: z.string().optional().describe('The timeframe mentioned (e.g., last month, this year)'),
      }),
      prompt: `Parse the following natural language query for filtering options trades into structured parameters. Ignore parameters that are not specified.\n\nQuery: "${query}"`,
    });

    return NextResponse.json({ filter: object });
  } catch (error: any) {
    console.error('Error parsing query:', error);
    return NextResponse.json({ error: 'Failed to parse query' }, { status: 500 });
  }
}
