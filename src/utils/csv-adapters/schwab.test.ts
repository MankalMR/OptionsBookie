import { test, expect } from '@jest/globals';
import { parseSchwabCSV } from './schwab';

const sampleCSV = `Date,Action,Symbol,Description,Quantity,Price,Fees & Comm,Amount
"04/21/2026","Buy to Open","SOXX","SOXX 01/21/2028 350.00 C",10,"5.00",-6.50,-5006.50
"04/22/2026","Sell to Close","SOXX","SOXX 01/21/2028 350.00 C",10,"6.00",-6.50,5993.50
"04/23/2026","Buy","AAPL","AAPL",100,"150.00",0,-15000.00
"04/24/2026","Expired","MSFT","MSFT 04/24/2026 300.00 P",1,"0.00",0,0.00`;

test('parses Schwab CSV options transactions', async () => {
    const transactions = await parseSchwabCSV(sampleCSV);
    expect(transactions.length).toBe(3); // AAPL is stock, skipped

    expect(transactions[0]).toMatchObject({
        stockSymbol: 'SOXX',
        callOrPut: 'Call',
        buyOrSell: 'Buy',
        numberOfContracts: 10,
        premium: 5.00,
        fees: 6.50,
        strikePrice: 350.00
    });

    expect(transactions[1]).toMatchObject({
        stockSymbol: 'SOXX',
        callOrPut: 'Call',
        buyOrSell: 'Sell',
        numberOfContracts: 10,
        premium: 6.00,
        fees: 6.50,
        strikePrice: 350.00
    });

    expect(transactions[2]).toMatchObject({
        stockSymbol: 'MSFT',
        callOrPut: 'Put',
        buyOrSell: 'Buy', // Defaulted to buy if not found, wait we should check
        status: 'Expired',
        numberOfContracts: 1,
        strikePrice: 300.00
    });
});
