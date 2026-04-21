#!/bin/bash
cat << 'INNER_EOF' >> src/lib/ai/prompts.ts

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
INNER_EOF

# Fix the extra brace
sed -i 's/  \`\n};/  \`\n/g' src/lib/ai/prompts.ts
