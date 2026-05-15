import { OptionsTransaction } from '@/types/options';
import { parseSchwabCSV } from './csv-adapters/schwab';

export type BrokerType = 'schwab' | 'robinhood' | 'moomoo';

export interface BrokerAdapter {
  parse: (fileContent: string) => Promise<Partial<OptionsTransaction>[]>;
}

export const CsvImporters: Record<BrokerType, BrokerAdapter> = {
  schwab: { parse: parseSchwabCSV },
  robinhood: { parse: async () => { throw new Error('Robinhood not implemented'); } },
  moomoo: { parse: async () => { throw new Error('Moomoo not implemented'); } }
};
