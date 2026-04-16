'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Search,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { CotDataPoint, CommodityInfo, BuySignal } from '@/types/cot';
import { getCommodities, searchCommodities, fetchCotData, detectBuySignals, MAJOR_COMMODITIES } from '@/lib/cftcApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDate(s: string): string {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function fmtFullDate(s: string): string {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-2">{fmtFullDate(label)}</p>
      {payload
        .filter((e) => e.name !== 'Net Long Zone')
        .map((e, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
            <span className="text-muted-foreground">{e.name}:</span>
            <span className="font-medium text-foreground tabular-nums">{fmt(e.value)}</span>
          </div>
        ))}
    </div>
  );
};

// ─── Signal dot renderer ─────────────────────────────────────────────────────

const SignalDot = (props: {
  cx?: number; cy?: number;
  payload?: { signalMarker?: number };
}) => {
  const { cx, cy, payload } = props;
  if (payload?.signalMarker === undefined || cx === undefined || cy === undefined) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="hsl(43 80% 50%)" stroke="hsl(var(--background))" strokeWidth={2.5} />
      <text x={cx} y={cy + 3} textAnchor="middle" fill="hsl(var(--background))" fontSize={8} fontWeight={800}>$</text>
    </g>
  );
};

// ─── Trader category bar ─────────────────────────────────────────────────────

function TraderBar({ label, long, short, color }: {
  label: string; long: number; short: number; color: string;
}) {
  const total = long + short;
  const longPct = total > 0 ? (long / total) * 100 : 50;
  const net = long - short;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          Net: <span className={net >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>{fmt(net)}</span>
        </span>
      </div>
      <div className="flex h-5 rounded-md overflow-hidden bg-muted">
        <div
          className="flex items-center justify-center text-[10px] font-semibold text-white"
          style={{ width: `${longPct}%`, backgroundColor: color }}
        >
          {longPct > 22 ? `${fmt(long)} L` : ''}
        </div>
        <div
          className="flex items-center justify-center text-[10px] font-semibold text-muted-foreground"
          style={{ width: `${100 - longPct}%` }}
        >
          {100 - longPct > 22 ? `${fmt(short)} S` : ''}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function CotAnalysisTab() {
  const [selectedCommodity, setSelectedCommodity] = useState('GOLD');
  const [years, setYears] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);

  const [commodities] = useState<CommodityInfo[]>(getCommodities);
  const [searchResults, setSearchResults] = useState<CommodityInfo[]>([]);
  const [cotData, setCotData] = useState<CotDataPoint[]>([]);
  const [cotLoading, setCotLoading] = useState(false);
  const [cotError, setCotError] = useState<string | null>(null);

  // Cache to avoid re-fetching the same commodity + years combo
  const cache = useRef<Map<string, CotDataPoint[]>>(new Map());

  // ── Dark mode detection (matches BenchmarkComparisonChart pattern) ──────────
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ── Fetch COT data ──────────────────────────────────────────────────────────
  const loadCotData = useCallback(async (commodity: string, numYears: number) => {
    const key = `${commodity}__${numYears}`;
    if (cache.current.has(key)) {
      setCotData(cache.current.get(key)!);
      setCotError(null);
      return;
    }
    setCotLoading(true);
    setCotError(null);
    try {
      const data = await fetchCotData(commodity, numYears);
      cache.current.set(key, data);
      setCotData(data);
    } catch (e) {
      setCotError((e as Error).message || 'Failed to load CFTC data');
    } finally {
      setCotLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCotData(selectedCommodity, years);
  }, [selectedCommodity, years, loadCotData]);

  // ── Search ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await searchCommodities(searchQuery);
        setSearchResults(results);
      } catch { /* silent */ }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const buySignals: BuySignal[]  = cotData.length > 0 ? detectBuySignals(cotData) : [];
  const latest      = cotData[cotData.length - 1];
  const prev        = cotData[cotData.length - 2];
  const netChange   = latest && prev ? latest.prodMercNet - prev.prodMercNet : 0;
  const isNetLong   = latest && latest.prodMercNet > 0;

  const chartData = cotData.map((d) => ({
    ...d,
    signalMarker: buySignals.some((s) => s.date === d.reportDate) ? d.prodMercNet : undefined,
    netLongZone:  d.prodMercNet > 0 ? d.prodMercNet : 0,
  }));

  // Merge search results with curated list (search appends new results)
  const allCommodities = [
    ...commodities,
    ...searchResults.filter((sr) => !commodities.some((c) => c.code === sr.code)),
  ];

  const grouped = allCommodities.reduce<Record<string, CommodityInfo[]>>((acc, c) => {
    const g = c.group || 'OTHER';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  // Chart colours that respect dark mode
  const lineColor    = isDark ? 'hsl(142 71% 55%)' : 'hsl(142 71% 38%)';  // green for producer net
  const longColor    = isDark ? 'hsl(210 70% 65%)' : 'hsl(210 70% 50%)';  // blue
  const shortColor   = isDark ? 'hsl(0 72% 65%)'  : 'hsl(0 72% 50%)';    // red
  const gridColor    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const axisColor    = isDark ? 'hsl(215 20% 55%)' : 'hsl(215 16% 47%)';
  const signalFill   = isDark ? 'rgba(251,191,36,0.12)' : 'rgba(234,179,8,0.1)';

  return (
    <div className="space-y-6">
      {/* Header — matches CurrentRiskTab pattern */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">COT Producer Analysis</h2>
          <p className="text-muted-foreground">
            CFTC Commitments of Traders — Producer/Merchant insider positioning
          </p>
        </div>
        {latest && (
          <div className="bg-card px-4 py-2 rounded-lg border shadow-sm">
            <div className="text-xs text-muted-foreground">Last Report</div>
            <div className="text-sm font-semibold text-foreground">{fmtFullDate(latest.reportDate)}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search any commodity…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Select commodity" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(grouped).map(([group, items]) => (
              <React.Fragment key={group}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                  {group}
                </div>
                {items.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
        <Select value={years.toString()} onValueChange={(v) => setYears(parseInt(v))}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 5, 10].map((y) => (
              <SelectItem key={y} value={y.toString()}>{y} Year{y > 1 ? 's' : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Position */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Producer Net Position
              <span title="Long minus Short positions. Positive = producers are buying — a rare bullish signal.">
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cotLoading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : latest ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xl font-bold tabular-nums ${latest.prodMercNet > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  {fmt(latest.prodMercNet)}
                </span>
                {netChange !== 0 && (
                  <Badge variant="outline" className={`gap-1 ${netChange > 0 ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400'}`}>
                    {netChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {fmt(Math.abs(netChange))}
                  </Badge>
                )}
              </div>
            ) : <span className="text-sm text-muted-foreground">No data</span>}
          </CardContent>
        </Card>

        {/* Signal Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Signal Status</CardDescription>
          </CardHeader>
          <CardContent>
            {cotLoading ? (
              <div className="h-7 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <div className="flex items-center gap-2">
                {isNetLong ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="text-base font-bold text-amber-600 dark:text-amber-400">BUY SIGNAL</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-base font-semibold text-muted-foreground">No Signal</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Interest */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Interest</CardDescription>
          </CardHeader>
          <CardContent>
            {cotLoading ? (
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            ) : latest ? (
              <span className="text-xl font-bold tabular-nums">{fmt(latest.openInterest)}</span>
            ) : <span className="text-sm text-muted-foreground">No data</span>}
          </CardContent>
        </Card>

        {/* Historical Signals */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Historical Signals</CardDescription>
          </CardHeader>
          <CardContent>
            {cotLoading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums">{buySignals.length}</span>
                <span className="text-sm text-muted-foreground">in {years}yr</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Producer/Merchant Net Position
            </CardTitle>
          </div>
          <CardDescription>
            When the line crosses above zero, producers are net buyers — a historically rare bullish signal.
            <span className="text-amber-600 dark:text-amber-400 font-medium"> Gold dots</span> mark confirmed signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {cotLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Fetching data from CFTC…</span>
            </div>
          ) : cotError ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-sm text-destructive">Failed to load data: {cotError}</p>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="reportDate"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={60}
                />
                <YAxis
                  tickFormatter={fmt}
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

                {/* Zero baseline */}
                <ReferenceLine y={0} stroke={axisColor} strokeDasharray="4 4" opacity={0.5} />

                {/* Net-long shaded zone */}
                <Area
                  type="monotone"
                  dataKey="netLongZone"
                  fill={signalFill}
                  stroke="none"
                  name="Net Long Zone"
                  legendType="none"
                />

                {/* Producer net (main line) */}
                <Line
                  type="monotone"
                  dataKey="prodMercNet"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  name="Producer Net"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />

                {/* Long / Short reference lines */}
                <Line
                  type="monotone"
                  dataKey="prodMercLong"
                  stroke={longColor}
                  strokeWidth={1.5}
                  dot={false}
                  name="Producer Long"
                  strokeDasharray="4 3"
                  opacity={0.55}
                />
                <Line
                  type="monotone"
                  dataKey="prodMercShort"
                  stroke={shortColor}
                  strokeWidth={1.5}
                  dot={false}
                  name="Producer Short"
                  strokeDasharray="4 3"
                  opacity={0.55}
                />

                {/* Buy signal markers */}
                <Line
                  type="monotone"
                  dataKey="signalMarker"
                  stroke="none"
                  dot={<SignalDot />}
                  name="Buy Signal"
                  legendType="diamond"
                  isAnimationActive={false}
                />

                <Brush
                  dataKey="reportDate"
                  height={24}
                  stroke={gridColor}
                  fill={isDark ? 'hsl(var(--card))' : 'hsl(var(--muted))'}
                  tickFormatter={fmtDate}
                  travellerWidth={8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No data available for this commodity.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: trader breakdown + signal history */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* All trader positions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Trader Positions</CardTitle>
            <CardDescription>Long vs Short by category — latest report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cotLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : latest ? (
              <>
                <TraderBar label="Producers / Merchants" long={latest.prodMercLong}      short={latest.prodMercShort}      color={lineColor} />
                <TraderBar label="Swap Dealers"          long={latest.swapLong}           short={latest.swapShort}          color={longColor} />
                <TraderBar label="Managed Money"         long={latest.managedMoneyLong}   short={latest.managedMoneyShort} color="hsl(270 60% 55%)" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Buy signal history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Buy Signal History
            </CardTitle>
            <CardDescription>Dates when producers switched to net long or hit extreme bullish levels</CardDescription>
          </CardHeader>
          <CardContent>
            {cotLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-9 bg-muted animate-pulse rounded" />)}
              </div>
            ) : buySignals.length > 0 ? (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {[...buySignals].reverse().map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-3 rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/25"
                  >
                    <span className="text-sm font-medium">{fmtFullDate(s.date)}</span>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 tabular-nums">
                      {fmt(s.netPosition)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No buy signals in this period</p>
                <p className="text-xs mt-1">Try a longer time range</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Methodology note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">How This Works</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            This tool visualises the <strong className="text-foreground">Producer/Merchant/Processor/User</strong> category
            from the CFTC&apos;s weekly{' '}
            <a
              href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Disaggregated Commitments of Traders
            </a>{' '}
            report (futures and options combined). Data is fetched live from the{' '}
            <a
              href="https://publicreporting.cftc.gov/resource/kh3c-gbw2.json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CFTC Public Reporting Environment
            </a>.
          </p>
          <p>
            <strong className="text-foreground">Buy signals</strong> fire when producers flip from net short (their
            normal hedging stance) to net long — meaning they are buying the raw material on the open market rather
            than producing it themselves. This historically rare event suggests the market price has fallen below
            production cost, often marking a major bottom.
          </p>
          <p>
            Reports are published each Friday at 3:30 PM ET with data as of the preceding Tuesday.
            For educational and research purposes only — not financial advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
