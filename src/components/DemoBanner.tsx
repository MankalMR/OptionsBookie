'use client';

/**
 * DemoBanner.tsx
 *
 * Sticky top banner shown on the /demo page.
 * Provides a prominent visual indicator that the user is in demo mode
 * and a "Reset Demo Data" button to restore the original seed portfolio.
 */

import { useState } from 'react';
import { RotateCcw, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoBannerProps {
    sessionId: string;
    onReset: () => void; // callback to re-fetch all data after reset
}

export default function DemoBanner({ sessionId, onReset }: DemoBannerProps) {
    const [resetting, setResetting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async () => {
        setResetting(true);
        setError(null);
        try {
            const res = await fetch('/api/demo/reset', {
                method: 'POST',
                headers: { 'x-demo-session-id': sessionId },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Reset failed');
            }
            // Clear the session from localStorage so the page re-initialises
            // with a completely fresh session seeded from the latest data.
            localStorage.removeItem('demoSessionId');
            onReset();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Reset failed');
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="sticky top-0 z-50 w-full bg-amber-50 border-b-2 border-amber-300 dark:bg-amber-950 dark:border-amber-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <FlaskConical className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">
                        <strong>Demo Mode</strong> — All data is simulated and isolated.
                        Changes are not saved to any real account.
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {error && (
                        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={resetting}
                        className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900"
                    >
                        <RotateCcw className={`h-4 w-4 mr-1 ${resetting ? 'animate-spin' : ''}`} />
                        {resetting ? 'Resetting…' : 'Reset Demo Data'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
