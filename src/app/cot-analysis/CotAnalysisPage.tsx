import AppHeader from '@/components/AppHeader';
import CotAnalysisTab from '@/components/analytics/CotAnalysisTab';
import { CotDataPoint } from '@/types/cot';

interface CotAnalysisPageProps {
  initialData?: CotDataPoint[];
}

export default function CotAnalysisPage({ initialData }: CotAnalysisPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CotAnalysisTab initialData={initialData} />
      </main>
    </div>
  );
}
