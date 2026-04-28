import { Metadata } from 'next';
import CotAnalysisPage from './CotAnalysisPage';

export const metadata: Metadata = {
  title: 'Commitment of Traders (COT) Analysis | OptionsBookie',
  description: 'Analyze institutional positioning and sentiment using COT data to identify high-probability options trading opportunities.',
};

export default function Page() {
  return <CotAnalysisPage />;
}
