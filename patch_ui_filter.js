const fs = require('fs');
const file = 'src/components/analytics/TransactionsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `const displayTransactions = useMemo(() => transactions.filter(t => t.status !== 'Rolled'), [transactions]);`;
const injection = `const displayTransactions = useMemo(() => {
    let filtered = transactions.filter(t => t.status !== 'Rolled');

    if (activeAiFilters) {
      filtered = filtered.filter(t => {
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
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, activeAiFilters]);`;

content = content.replace(target, injection);

fs.writeFileSync(file, content);
