'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import CotAnalysisTab from '@/components/analytics/CotAnalysisTab';

export default function CotAnalysisPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo + Back */}
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Link>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center space-x-2">
                <img
                  src="/images/OptionBookie1.png"
                  alt="OptionsBookie Logo"
                  className="h-8 w-8 object-contain"
                />
                <span className="font-bold text-lg">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    OptionsBookie
                  </span>
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/signin"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Sign in for full access
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CotAnalysisTab />
      </main>
    </div>
  );
}
