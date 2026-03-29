const fs = require('fs');
const file = 'src/components/analytics/TransactionsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure correct React imports
content = content.replace(
  /import React, \{ useMemo \} from 'react';/,
  `import React, { useMemo, useState, KeyboardEvent } from 'react';`
);

// Inject AI State
const target = `const isMobile = useIsMobile();`;
const injection = `const isMobile = useIsMobile();

  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAiFilters, setActiveAiFilters] = useState<{ symbol?: string; type?: string; outcome?: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiSearch = async (e?: KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/parse-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      });

      if (!res.ok) {
        if (res.status === 503) {
          throw new Error("AI service is currently unavailable");
        }
        throw new Error("Failed to parse query");
      }

      const filters = await res.json();
      setActiveAiFilters(Object.keys(filters).length > 0 ? filters : null);
    } catch (err: any) {
      setAiError(err.message || "Something went wrong");
    } finally {
      setIsAiLoading(false);
    }
  };

  const clearAiFilters = () => {
    setActiveAiFilters(null);
    setAiQuery("");
    setAiError(null);
  };
`;

content = content.replace(target, injection);

// Fix displayTransactions UseMemo
const useMemoRegex = /const displayTransactions = useMemo\(\(\) => \{[\s\S]*?let sorted = \[...transactions\];/;
const newUseMemo = `const displayTransactions = useMemo(() => {
    let sorted = [...transactions];

    if (activeAiFilters) {
      sorted = sorted.filter(t => {
        if (activeAiFilters.symbol && t.symbol.toUpperCase() !== activeAiFilters.symbol.toUpperCase()) return false;
        if (activeAiFilters.type && t.type.toLowerCase() !== activeAiFilters.type.toLowerCase()) return false;

        if (activeAiFilters.outcome) {
          const pnl = getDisplayPnL(t);
          if (activeAiFilters.outcome === 'win' && pnl <= 0) return false;
          if (activeAiFilters.outcome === 'loss' && pnl >= 0) return false;
        }
        return true;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps`;

// Apply only if not already applied
if (!content.includes('if (activeAiFilters) {')) {
    // Actually the previous patch attempted this but failed because it used `let sorted = [...transactions]`, wait, this file didn't have sorting?
}

fs.writeFileSync(file, content);
