import Papa from 'papaparse';
import { OptionsTransaction } from '@/types/options';

// Format: MM/DD/YYYY
const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

export const parseSchwabCSV = async (fileContent: string): Promise<Partial<OptionsTransaction>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: Partial<OptionsTransaction>[] = [];
        const rows = results.data as Record<string, string>[];

        for (const row of rows) {
          const description = row.Description || '';

          // Basic check for options format: SYMBOL MM/DD/YYYY STRIKE C/P
          // E.g., SOXX 01/21/2028 350.00 C
          const optRegex = /^([A-Z]+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+)\s+([CP])$/i;
          const match = description.match(optRegex);

          if (!match) continue; // Not an option or unrecognized format

          const [, sym, expiryStr, strikeStr, cpStr] = match;
          const symbol = sym;
          const expiryDate = parseDate(expiryStr);
          const strikePrice = parseFloat(strikeStr);
          const callOrPut = cpStr.toUpperCase() === 'C' ? 'Call' : 'Put';

          const tradeDate = parseDate(row.Date);

          const action = row.Action || '';
          let buyOrSell: 'Buy' | 'Sell' = 'Buy';
          let status: 'Open' | 'Closed' | 'Expired' | 'Assigned' = 'Open';

          if (action.includes('Buy')) buyOrSell = 'Buy';
          if (action.includes('Sell')) buyOrSell = 'Sell';

          // Action could be "Expired", "Assigned", "Buy to Open", "Sell to Close" etc.
          if (action.toLowerCase().includes('expired')) {
             status = 'Expired';
          } else if (action.toLowerCase().includes('assigned')) {
             status = 'Assigned';
          } else if (action.toLowerCase().includes('close')) {
             status = 'Closed'; // If it's a closing transaction, maybe we leave it as Open here, and the Deduplication Engine will link it and set the original to closed?
             // Actually, a transaction itself doesn't have "Closed" status if it's the closing leg. The *chain* is closed.
             // Wait, the interface says: status: 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled';
             // If it's a Sell to Close, the status of this individual log shouldn't matter as much, or maybe it should be 'Closed'. We'll use 'Open' by default and let logic decide.
          }

          const quantity = Math.abs(parseInt(row.Quantity || '0', 10));
          const price = parseFloat(row.Price || '0');
          const fees = Math.abs(parseFloat(row['Fees & Comm'] || '0'));

          transactions.push({
            stockSymbol: symbol,
            tradeOpenDate: tradeDate,
            expiryDate: expiryDate,
            strikePrice,
            callOrPut,
            buyOrSell,
            numberOfContracts: quantity,
            premium: price,
            fees,
            status,
            // We cannot assign portfolioId or id here reliably, we'll do that before DB insertion.
          });
        }

        resolve(transactions);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};
