'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Star, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react';
import EtfHoldingsTable from './EtfHoldingsTable';
import { formatAum, formatPercent } from '@/lib/etf-utils';
import type { EtfProfile, SavedEtf } from '@/types/etf';

interface EtfCardProps {
  data: EtfProfile | SavedEtf;
  onToggleSave: () => void;
  onRemove?: () => void;
  isSaved?: boolean;
}


export default function EtfCard({ data, onToggleSave, onRemove, isSaved: propIsSaved }: EtfCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Guard for data types
  const isProfile = 'isSaved' in data;
  const isSaved = propIsSaved ?? (isProfile ? (data as EtfProfile).isSaved : true);
  const fundName = data.fundName || data.ticker;
  const cachedAt = 'cachedAt' in data ? (data as EtfProfile).cachedAt : (data as SavedEtf).savedAt;

  return (
    <Card className="relative flex flex-col border-border/50 bg-card/60 backdrop-blur-sm shadow-xl h-full overflow-hidden transition-all duration-300 group">
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive rounded-full transition-all duration-200 z-10"
          title="Remove from Feed"
          aria-label="Remove from Feed"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary font-bold text-2xl h-12 px-3 rounded flex items-center justify-center border border-primary/20">
              {data.ticker}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold tracking-tight">
                  {data.fundName && data.fundName !== data.ticker ? data.fundName : ''}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave();
                  }}
                  className="h-8 w-8 hover:bg-white/5 rounded transition-all duration-200"
                  title={isSaved ? "Unsave ETF" : "Save ETF"}
                  aria-label={isSaved ? "Unsave ETF" : "Save ETF"}
                  aria-pressed={isSaved}
                >
                  <Star
                    className={`h-5 w-5 transition-all duration-300 ${
                      isSaved 
                        ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    fill={isSaved ? '#facc15' : 'none'}
                    strokeWidth={isSaved ? 1 : 2}
                  />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {data.topTenConcentration !== null && data.topTenConcentration > 0.60 && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-blue-900/40 text-blue-300 border-blue-800 rounded-sm">
                    High Concentration
                  </Badge>
                )}
                {data.assetCategory && (
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">
                    {data.assetCategory.replace(/\s+/g, ' \u2022 ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 empty:hidden">
          {data.isStale && (
             <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-900/50 bg-orange-950/20 rounded-sm uppercase tracking-wider">
               <RefreshCw className="h-3 w-3 mr-1" />
               Stale Data
             </Badge>
          )}
          {data.isAiGenerated && (
             <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-900/50 bg-purple-950/20 rounded-sm uppercase tracking-wider">
               <Sparkles className="h-3 w-3 mr-1" />
               AI Insight
             </Badge>
          )}
          {data.leveraged === 'YES' && (
            <Badge variant="destructive" className="text-[10px] rounded-sm uppercase tracking-wider">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Leveraged
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 flex-1 flex flex-col">
        {/* Quick Stats Grid (Always Visible) */}
        <div className="grid grid-cols-3 gap-6 py-4 border-y border-border/40">
          <StatItem label="Expense Ratio" value={formatPercent(data.netExpenseRatio)} />
          <StatItem label="Yield (TTM)" value={formatPercent(data.dividendYield)} />
          <StatItem label="Top-10 Conc." value={formatPercent(data.topTenConcentration)} />
          
          {/* Expanded Stats */}
          {isExpanded && (
            <>
              <StatItem label="Total AUM" value={formatAum(data.netAssets)} />
              <StatItem label="Turnover" value={data.portfolioTurnover ? formatPercent(data.portfolioTurnover) : 'N/A'} />
              <StatItem label="Leveraged" value={data.leveraged || 'NO'} />
            </>
          )}
        </div>

        <div className="flex-1 space-y-8">
          {/* Holdings Section (Always Visible) */}
          {data.topHoldings && data.topHoldings.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-4">Top 10 Portfolio Weights</h3>
              <EtfHoldingsTable holdings={data.topHoldings} limit={10} showHeaders={!isExpanded} />
            </div>
          )}

          {/* Expanded Section: Sector Allocation */}
          {isExpanded && data.sectorAllocation && data.sectorAllocation.length > 0 && (
            <div className="pt-4 border-t border-border/20">
              <h3 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-4">Sector Allocation</h3>
              <div className="space-y-4">
                {data.sectorAllocation.map((sector) => (
                  <div key={sector.sector} className="text-[11px]">
                    <div className="flex items-end justify-between font-medium mb-1.5">
                      <span className="text-foreground">{sector.sector}</span>
                      <span className="font-mono text-muted-foreground">{(sector.weight * 100).toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/80 rounded-full"
                        style={{ width: `${Math.min(sector.weight * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expand / Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 py-2 mt-2 h-8 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 hover:text-primary rounded-md transition-colors border border-primary/20 w-full"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show More
            </>
          )}
        </Button>

        {/* Footer */}
        <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground pt-4 mt-auto">
          {isExpanded ? 'Full Audit' : 'Quick View'} • {new Date(cachedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
          {data.isStale && ' (Background refresh)'}
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="text-lg font-medium tracking-tight font-mono">{value}</p>
    </div>
  );
}
