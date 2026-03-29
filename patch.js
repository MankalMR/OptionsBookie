const fs = require('fs');
const file = 'src/app/api/ai/parse-query/route.ts';
let data = fs.readFileSync(file, 'utf8');
data = data.replace('logger.error("Error in parse-query API:", error);', 'logger.error({ err: error }, "Error in parse-query API:");');
data = data.replace('logger.error("Gemini API error:", apiError);', 'logger.error({ err: apiError }, "Gemini API error:");');
fs.writeFileSync(file, data);
