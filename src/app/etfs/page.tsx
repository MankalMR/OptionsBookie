import { Metadata } from 'next';
import AnalyzeEtfsPage from './AnalyzeEtfsPage';

export const metadata: Metadata = {
  title: 'ETF Intelligence & Holdings Analysis | OptionsBookie',
  description: 'Deep dive into ETF holdings, performance metrics, and concentration risk to inform your options trading strategies.',
};

export default function Page() {
  return <AnalyzeEtfsPage />;
}
