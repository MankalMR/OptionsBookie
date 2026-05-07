import { Metadata } from 'next';
import CotAnalysisPage from './CotAnalysisPage';
import { fetchCotData } from '@/lib/cftcApi';

export const metadata: Metadata = {
  title: 'COT Producer Positioning & Buy Signals | OptionsBookie',
  description: 'Identify institutional bottoms using CFTC Commitment of Traders (COT) data. Track producer net positions and insider sentiment for high-probability options setups.',
  alternates: {
    canonical: '/cot-analysis',
  },
};

export default async function Page() {
  // Initial SSR data for search engines
  const initialData = await fetchCotData('GOLD', 5);

  return <CotAnalysisPage initialData={initialData} />;
}
