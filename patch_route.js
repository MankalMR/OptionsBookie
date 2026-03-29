const fs = require('fs');

const path = 'src/app/api/ai/parse-query/route.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace standard imports + auth check with the new SDK import
code = code.replace(
  `import { NextResponse } from "next/server";`,
  `import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";`
);

const fetchRegex = /const response = await fetch\([\s\S]+?\}\);/m;
const textRegex = /const data = await response\.json\(\);[\s\S]+?const text = candidates\[0\]\.content\.parts\[0\]\.text;/m;

const newSdkCode = `const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("No text response from Gemini");
      }
      const text = response.text;`;

code = code.replace(fetchRegex, newSdkCode);
code = code.replace(
  `const data = await response.json();

      if (!response.ok) {
        logger.error("Gemini API error:", data);
        return NextResponse.json({ error: "LLM Service Unavailable" }, { status: 503 });
      }

      const candidates = data.candidates;
      if (!candidates || candidates.length === 0 || !candidates[0].content || !candidates[0].content.parts || candidates[0].content.parts.length === 0) {
          logger.error("Unexpected Gemini response structure:", data);
          return NextResponse.json({ error: "Failed to parse query" }, { status: 500 });
      }

      const text = candidates[0].content.parts[0].text;`,
  ``
);

fs.writeFileSync(path, code);
