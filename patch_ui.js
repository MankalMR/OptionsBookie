const fs = require('fs');

const file = 'src/components/analytics/TransactionsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add Sparkles import
content = content.replace(
  `import { ArrowUpDown } from 'lucide-react';`,
  `import { ArrowUpDown, Sparkles } from 'lucide-react';`
);

// Add React hooks to imports
content = content.replace(
  `import React, { useState, useMemo } from 'react';`,
  `import React, { useState, useMemo, KeyboardEvent } from 'react';`
);

// Add AI State
const stateRegex = /const \[sortConfig, setSortConfig\] = useState<\{ key: SortKey; direction: 'asc' \| 'desc' \} \| null>\(null\);/;
const newState = `const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

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
  };`;
content = content.replace(stateRegex, newState);

// Update useMemo to use activeAiFilters
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
content = content.replace(useMemoRegex, newUseMemo);

// Add AI UI above the table
const tableStartRegex = /<div className="overflow-x-auto">/;
const aiUi = `<div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Sparkles className={\`h-4 w-4 \${isAiLoading ? 'text-purple-500 animate-pulse' : 'text-purple-400'}\`} />
          </div>
          <input
            type="text"
            placeholder="Ask AI to filter... (e.g. 'Show me winning TSLA puts')"
            className="block w-full sm:w-1/2 pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring sm:text-sm"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={handleAiSearch}
            disabled={isAiLoading}
          />
        </div>

        {aiError && (
          <p className="mt-2 text-sm text-destructive">{aiError}</p>
        )}

        {activeAiFilters && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">AI Filters applied:</span>
            {Object.entries(activeAiFilters).map(([key, value]) => (
              <span key={key} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium dark:bg-purple-900/30 dark:text-purple-300">
                {key.charAt(0).toUpperCase() + key.slice(1)}: {value as string}
              </span>
            ))}
            <button
              onClick={clearAiFilters}
              className="ml-2 text-muted-foreground hover:text-foreground text-xs underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">`;
content = content.replace(tableStartRegex, aiUi);

fs.writeFileSync(file, content);
