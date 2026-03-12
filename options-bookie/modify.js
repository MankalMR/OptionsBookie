const fs = require('fs');
let content = fs.readFileSync('src/components/SummaryView.tsx', 'utf8');

const memoCode = `  // Memoize all realized transactions once for the entire component
  const allRealizedTransactions = useMemo(() => {
    return getRealizedTransactions(transactions, chains);
  }, [transactions, chains]);

`;

if (!content.includes('allRealizedTransactions')) {
  content = content.replace('  const isMobile = useIsMobile();\n  const yearlySummaries = useMemo(() => {', memoCode + '  const isMobile = useIsMobile();\n  const yearlySummaries = useMemo(() => {');

  // Update yearlySummaries
  content = content.replace(
    'const completedTransactions = getRealizedTransactions(transactions, chains).filter(t =>',
    'const completedTransactions = allRealizedTransactions.filter(t =>'
  );

  // Update overallStats
  content = content.replace(
    'const realizedTransactions = getRealizedTransactions(transactions, chains);',
    'const realizedTransactions = allRealizedTransactions;'
  );

  // Update bestStocks
  content = content.replace(
    'const realizedTransactions = getRealizedTransactions(transactions);',
    'const realizedTransactions = allRealizedTransactions;'
  );

  // Update getChartDataForYear (the heavy one)
  const oldGetChartDataForYear = `  const getChartDataForYear = (year: number) => {
    const yearSummary = yearlySummaries.find(y => y.year === year);
    if (!yearSummary) return [];

    return yearSummary.monthlyBreakdown.map(month => {
      // Calculate RoR for this month by getting all transactions for this month
      const monthTransactions = getRealizedTransactions(transactions, chains).filter(t => {
        if (!t.closeDate) return false;
        const effectiveCloseDate = getEffectiveCloseDate(t, getRealizedTransactions(transactions, chains), chains);
        return effectiveCloseDate.getFullYear() === year && effectiveCloseDate.getMonth() === month.month;
      });`;

  const newGetChartDataForYear = `  const getChartDataForYear = (year: number) => {
    const yearSummary = yearlySummaries.find(y => y.year === year);
    if (!yearSummary) return [];

    return yearSummary.monthlyBreakdown.map(month => {
      // Calculate RoR for this month by getting all transactions for this month
      const monthTransactions = allRealizedTransactions.filter(t => {
        if (!t.closeDate) return false;
        const effectiveCloseDate = getEffectiveCloseDate(t, allRealizedTransactions, chains);
        return effectiveCloseDate.getFullYear() === year && effectiveCloseDate.getMonth() === month.month;
      });`;

  content = content.replace(oldGetChartDataForYear, newGetChartDataForYear);

  // Update getAllTickersForYear (the other heavy one)
  const oldGetAllTickersForYear = `  const getAllTickersForYear = (year: number) => {
    const realizedTransactions = getRealizedTransactions(transactions, chains).filter(t => {
      if (!t.closeDate) return false;
      const closeDate = parseLocalDate(t.closeDate);
      return closeDate.getFullYear() === year;
    });`;

  const newGetAllTickersForYear = `  const getAllTickersForYear = (year: number) => {
    const realizedTransactions = allRealizedTransactions.filter(t => {
      if (!t.closeDate) return false;
      const closeDate = parseLocalDate(t.closeDate);
      return closeDate.getFullYear() === year;
    });`;

  content = content.replace(oldGetAllTickersForYear, newGetAllTickersForYear);

  fs.writeFileSync('src/components/SummaryView.tsx', content);
  console.log('Successfully updated SummaryView.tsx');
} else {
  console.log('Already updated');
}
