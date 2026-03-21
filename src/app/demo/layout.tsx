import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'OptionsBookie Demo — Try Options Portfolio Tracking Free',
    description:
        'Explore OptionsBookie with a realistic simulated portfolio. Track options trades, view P&L analytics, and manage trade chains — no sign-up required.',
    openGraph: {
        title: 'OptionsBookie Demo — Try Options Portfolio Tracking Free',
        description:
            'Explore OptionsBookie with a realistic simulated portfolio. No sign-up required.',
        type: 'website',
    },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
