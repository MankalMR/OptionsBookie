/**
 * CFTC Commitments of Traders (COT) API client
 *
 * Calls the CFTC Public Reporting Environment Socrata API directly from the browser.
 * No API key required. CORS is open (Access-Control-Allow-Origin: *).
 * Dataset: Disaggregated Futures-and-Options Combined (kh3c-gbw2)
 * Source: https://publicreporting.cftc.gov/resource/kh3c-gbw2.json
 */

import type { CotDataPoint, CommodityInfo, BuySignal } from '@/types/cot';

const CFTC_BASE = 'https://publicreporting.cftc.gov/resource/kh3c-gbw2.json';

// Exact `commodity_name` values as stored in the CFTC Socrata dataset
export const MAJOR_COMMODITIES: Record<string, { name: string; group: string; subgroup: string }> = {
  // Grains
  WHEAT:        { name: 'WHEAT (CBOT)',          group: 'AGRICULTURE',      subgroup: 'GRAINS'     },
  CORN:         { name: 'CORN (CBOT)',            group: 'AGRICULTURE',      subgroup: 'GRAINS'     },
  SOYBEANS:     { name: 'SOYBEANS (CBOT)',        group: 'AGRICULTURE',      subgroup: 'OILSEEDS'   },
  'SOYBEAN OIL':  { name: 'SOYBEAN OIL (CBOT)',  group: 'AGRICULTURE',      subgroup: 'OILSEEDS'   },
  'SOYBEAN MEAL': { name: 'SOYBEAN MEAL (CBOT)', group: 'AGRICULTURE',      subgroup: 'OILSEEDS'   },
  // Softs
  SUGAR:        { name: 'SUGAR (ICE)',            group: 'AGRICULTURE',      subgroup: 'SOFTS'      },
  COFFEE:       { name: 'COFFEE (ICE)',           group: 'AGRICULTURE',      subgroup: 'SOFTS'      },
  COCOA:        { name: 'COCOA (ICE)',            group: 'AGRICULTURE',      subgroup: 'SOFTS'      },
  COTTON:       { name: 'COTTON (ICE)',           group: 'AGRICULTURE',      subgroup: 'FIBERS'     },
  // Livestock
  'LEAN HOGS':  { name: 'LEAN HOGS (CME)',        group: 'AGRICULTURE',      subgroup: 'LIVESTOCK'  },
  'LIVE CATTLE':{ name: 'LIVE CATTLE (CME)',      group: 'AGRICULTURE',      subgroup: 'LIVESTOCK'  },
  // Energy
  'CRUDE OIL':  { name: 'CRUDE OIL WTI (NYMEX)', group: 'NATURAL RESOURCES', subgroup: 'PETROLEUM' },
  'NATURAL GAS':{ name: 'NATURAL GAS (NYMEX)',   group: 'NATURAL RESOURCES', subgroup: 'NATURAL GAS'},
  GASOLINE:     { name: 'GASOLINE RBOB (NYMEX)',  group: 'NATURAL RESOURCES', subgroup: 'PETROLEUM' },
  'HEATING OIL-DIESEL-GASOIL': { name: 'HEATING OIL (NYMEX)', group: 'NATURAL RESOURCES', subgroup: 'PETROLEUM' },
  // Metals
  GOLD:         { name: 'GOLD (COMEX)',           group: 'NATURAL RESOURCES', subgroup: 'METALS'    },
  SILVER:       { name: 'SILVER (COMEX)',         group: 'NATURAL RESOURCES', subgroup: 'METALS'    },
  COPPER:       { name: 'COPPER (COMEX)',         group: 'NATURAL RESOURCES', subgroup: 'METALS'    },
  PLATINUM:     { name: 'PLATINUM (NYMEX)',       group: 'NATURAL RESOURCES', subgroup: 'METALS'    },
  PALLADIUM:    { name: 'PALLADIUM (NYMEX)',      group: 'NATURAL RESOURCES', subgroup: 'METALS'    },
};

/** Returns the curated commodity list — no network call. */
export function getCommodities(): CommodityInfo[] {
  return Object.entries(MAJOR_COMMODITIES).map(([code, info]) => ({
    code,
    name: info.name,
    group: info.group,
    subgroup: info.subgroup,
  }));
}

/** Search the CFTC dataset for commodity names matching `q`. */
export async function searchCommodities(q: string): Promise<CommodityInfo[]> {
  if (!q || q.length < 2) return [];

  const params = new URLSearchParams({
    $select: 'commodity_name,commodity_subgroup_name,commodity_group_name',
    $where: `upper(commodity_name) like '%${q.toUpperCase().replace(/'/g, "''")}%' AND futonly_or_combined='Combined'`,
    $group: 'commodity_name,commodity_subgroup_name,commodity_group_name',
    $limit: '50',
    $order: 'commodity_name ASC',
  });

  const res = await fetch(`${CFTC_BASE}?${params}`);
  if (!res.ok) throw new Error(`CFTC search failed: ${res.status}`);

  const raw: Record<string, string>[] = await res.json();
  return raw.map((r) => ({
    code: r.commodity_name,
    name: r.commodity_name,
    group: r.commodity_group_name || 'OTHER',
    subgroup: r.commodity_subgroup_name || '',
  }));
}

/**
 * Fetch and aggregate COT disaggregated data for a commodity.
 * Multiple contract markets for the same commodity are summed into one row per date.
 */
export async function fetchCotData(commodity: string, years: number): Promise<CotDataPoint[]> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  const startStr = startDate.toISOString().split('T')[0];

  const params = new URLSearchParams({
    $where: `commodity_name='${commodity.replace(/'/g, "''")}' AND report_date_as_yyyy_mm_dd>='${startStr}' AND futonly_or_combined='Combined'`,
    $select: [
      'report_date_as_yyyy_mm_dd',
      'commodity_name',
      'contract_market_name',
      'prod_merc_positions_long',
      'prod_merc_positions_short',
      'swap_positions_long_all',
      'swap__positions_short_all',
      'm_money_positions_long_all',
      'm_money_positions_short_all',
      'open_interest_all',
      'pct_of_oi_prod_merc_long',
      'pct_of_oi_prod_merc_short',
    ].join(','),
    $order: 'report_date_as_yyyy_mm_dd ASC',
    $limit: '10000',
  });

  const res = await fetch(`${CFTC_BASE}?${params}`);
  if (!res.ok) throw new Error(`CFTC API returned ${res.status}`);

  const raw: Record<string, string>[] = await res.json();

  // Aggregate multiple contract markets for the same commodity into one row per date
  const dateMap = new Map<string, {
    reportDate: string; commodity: string; contractMarketName: string;
    prodMercLong: number; prodMercShort: number;
    swapLong: number; swapShort: number;
    managedMoneyLong: number; managedMoneyShort: number;
    openInterest: number; pctProdMercLong: number; pctProdMercShort: number; count: number;
  }>();

  for (const row of raw) {
    const date = row.report_date_as_yyyy_mm_dd?.split('T')[0];
    if (!date) continue;

    if (!dateMap.has(date)) {
      dateMap.set(date, {
        reportDate: date, commodity: row.commodity_name || commodity,
        contractMarketName: row.contract_market_name || '',
        prodMercLong: 0, prodMercShort: 0,
        swapLong: 0, swapShort: 0,
        managedMoneyLong: 0, managedMoneyShort: 0,
        openInterest: 0, pctProdMercLong: 0, pctProdMercShort: 0, count: 0,
      });
    }

    const agg = dateMap.get(date)!;
    agg.prodMercLong     += parseInt(row.prod_merc_positions_long   || '0');
    agg.prodMercShort    += parseInt(row.prod_merc_positions_short  || '0');
    agg.swapLong         += parseInt(row.swap_positions_long_all    || '0');
    agg.swapShort        += parseInt(row.swap__positions_short_all  || '0');
    agg.managedMoneyLong += parseInt(row.m_money_positions_long_all || '0');
    agg.managedMoneyShort+= parseInt(row.m_money_positions_short_all|| '0');
    agg.openInterest     += parseInt(row.open_interest_all          || '0');
    agg.pctProdMercLong  += parseFloat(row.pct_of_oi_prod_merc_long || '0');
    agg.pctProdMercShort += parseFloat(row.pct_of_oi_prod_merc_short|| '0');
    agg.count            += 1;
  }

  return Array.from(dateMap.values()).map((d) => ({
    reportDate:        d.reportDate,
    commodity:         d.commodity,
    contractMarketName:d.contractMarketName,
    prodMercLong:      d.prodMercLong,
    prodMercShort:     d.prodMercShort,
    prodMercNet:       d.prodMercLong - d.prodMercShort,
    swapLong:          d.swapLong,
    swapShort:         d.swapShort,
    managedMoneyLong:  d.managedMoneyLong,
    managedMoneyShort: d.managedMoneyShort,
    openInterest:      d.openInterest,
    pctProdMercLong:   d.count > 0 ? Math.round((d.pctProdMercLong  / d.count) * 10) / 10 : 0,
    pctProdMercShort:  d.count > 0 ? Math.round((d.pctProdMercShort / d.count) * 10) / 10 : 0,
  }));
}

/** Buy signal detection — returns dates when producers flipped to net long or hit 95th percentile. */
export function detectBuySignals(data: CotDataPoint[]): BuySignal[] {
  if (data.length < 52) return [];

  const signals: BuySignal[] = [];
  const nets = data.map((d) => d.prodMercNet);

  for (let i = 52; i < data.length; i++) {
    const lookback = nets.slice(Math.max(0, i - 156), i);
    const sorted   = [...lookback].sort((a, b) => a - b);
    const rank      = sorted.findIndex((v) => v >= nets[i]);
    const pct       = (rank / sorted.length) * 100;

    const prevLookback = nets.slice(Math.max(0, i - 157), i - 1);
    const prevSorted   = [...prevLookback].sort((a, b) => a - b);
    const prevRank     = prevSorted.findIndex((v) => v >= nets[i - 1]);
    const prevPct      = (prevRank / prevSorted.length) * 100;

    // Trigger on net-long flip OR first entry into extreme 95th percentile
    if ((nets[i - 1] <= 0 && nets[i] > 0) || (pct >= 95 && prevPct < 95)) {
      signals.push({ date: data[i].reportDate, netPosition: nets[i], percentile: Math.round(pct) });
    }
  }

  return signals;
}

// BuySignal is imported from '@/types/cot'
