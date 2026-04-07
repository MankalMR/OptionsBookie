'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, AlertTriangle, RefreshCw } from 'lucide-react';
import EtfHoldingsTable from './EtfHoldingsTable';
import type { EtfProfile } from '@/types/etf';

interface EtfDetailCardProps {
  profile: EtfProfile;
  onToggleSave: () => void;
}

function formatAum(value: number | null): string {
  if (value === null) return 'N/A';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

export default function EtfDetailCard({ profile, onToggleSave }: EtfDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl">{profile.ticker}</CardTitle>
            {profile.fundName && (
              <span className="text-sm text-muted-foreground">{profile.fundName}</span>
            )}
            <button
              onClick={onToggleSave}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <Heart
                className={`h-5 w-5 ${profile.isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {profile.isStale && (
              <Badge variant="secondary" className="text-orange-600 border-orange-300">
                <RefreshCw className="h-3 w-3 mr-1" />
                Stale data
              </Badge>
            )}
            {profile.leveraged === 'YES' && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Leveraged ETF
              </Badge>
            )}
            {profile.topTenConcentration !== null && profile.topTenConcentration > 0.60 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100">
                Highly Concentrated
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatItem label="AUM" value={formatAum(profile.netAssets)} />
          <StatItem label="Expense Ratio" value={formatPercent(profile.netExpenseRatio)} />
          <StatItem label="Yield" value={formatPercent(profile.dividendYield)} />
          <StatItem label="Turnover" value={formatPercent(profile.portfolioTurnover)} />
          <StatItem label="Leveraged" value={profile.leveraged || 'N/A'} />
          <StatItem label="Top-10 Concentration" value={formatPercent(profile.topTenConcentration)} />
        </div>

        {/* Holdings Section */}
        {profile.topHoldings.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Top Holdings</h3>
            <EtfHoldingsTable holdings={profile.topHoldings} limit={10} />
          </div>
        )}

        {/* Sector Allocation */}
        {profile.sectorAllocation.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Sector Allocation</h3>
            <div className="space-y-2">
              {profile.sectorAllocation.map((sector) => (
                <div key={sector.sector} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{sector.sector}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(sector.weight * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right">{(sector.weight * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          Last updated: {new Date(profile.cachedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
          {profile.isStale && ' (refreshing in background...)'}
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
