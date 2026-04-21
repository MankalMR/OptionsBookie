/** @jest-environment node */
import { detectBuySignals } from './cftcApi';
import { CotDataPoint } from '@/types/cot';

describe('detectBuySignals', () => {
  const createMockDataPoint = (overrides: Partial<CotDataPoint> = {}): CotDataPoint => ({
    reportDate: '2023-01-01',
    commodity: 'GOLD',
    contractMarketName: 'GOLD (COMEX)',
    prodMercLong: 0,
    prodMercShort: 0,
    prodMercNet: 0,
    swapLong: 0,
    swapShort: 0,
    managedMoneyLong: 0,
    managedMoneyShort: 0,
    openInterest: 1000,
    pctProdMercLong: 0,
    pctProdMercShort: 0,
    ...overrides,
  });

  it('returns an empty array if there are fewer than 52 data points', () => {
    const data = Array(51).fill(null).map(() => createMockDataPoint());
    expect(detectBuySignals(data)).toEqual([]);
  });

  it('triggers a signal on a net-long flip (<= 0 to > 0)', () => {
    // Need at least 53 points to check i=52
    const data = Array(53).fill(null).map((_, i) =>
      createMockDataPoint({
        reportDate: `2023-01-${i + 1}`,
        prodMercNet: i === 51 ? 0 : (i === 52 ? 100 : -100)
      })
    );

    // i=51 is prev for i=52.
    // data[51].prodMercNet = 0
    // data[52].prodMercNet = 100
    const signals = detectBuySignals(data);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      date: '2023-01-53',
      netPosition: 100,
    });
  });

  it('triggers a signal when hitting the 95th percentile for the first time', () => {
    // Fill lookback with values 0 to 99 (100 values)
    // i = 52. Lookback is nets.slice(0, 52).
    // To have a decent lookback, let's use more data.
    const data: CotDataPoint[] = [];
    for (let i = 0; i < 156; i++) {
      data.push(createMockDataPoint({ prodMercNet: i }));
    }
    // At i = 156:
    // lookback = [0...155] (156 values)
    // nets[156] = 160 (new high) -> rank 156, pct 100.
    // prevPct: lookback = [0...154], nets[155] = 155 (new high) -> rank 155, pct 100.
    // This would NOT trigger percentile signal because prev was also high.

    // Let's be more precise.
    const testData: CotDataPoint[] = [];
    for (let i = 0; i < 156; i++) {
      testData.push(createMockDataPoint({ reportDate: `D${i}`, prodMercNet: i }));
    }
    // Now we are at index 156.
    // Lookback (i=156) is [0...155]. length 156.
    // We want pct >= 95. rank >= 156 * 0.95 = 148.2. So rank 149.
    // sorted[149] is 149.
    // If nets[156] = 149, rank is 149. pct = 149/156 * 100 = 95.5.

    // Previous: i=155. Lookback [0...154]. length 155.
    // We want prevPct < 95. rank < 155 * 0.95 = 147.25. So rank 147.
    // If nets[155] = 140, rank is 140. pct = 140/155 * 100 = 90.3.

    testData[155].prodMercNet = 140; // prevPct ~ 90%
    testData.push(createMockDataPoint({ reportDate: 'SIGNAL_DATE', prodMercNet: 149 })); // pct ~ 95.5%

    // Also ensure we don't trigger net-long flip by keeping nets > 0
    testData.forEach(d => { if (d.prodMercNet <= 0) d.prodMercNet = 10; });
    testData[155].prodMercNet = 140;
    testData[156].prodMercNet = 149;

    const signals = detectBuySignals(testData);
    // It might find signals in the earlier 100+ points because they are all "new highs"
    // until the lookback fills up.
    // But we are interested if our specific point triggers.
    const targetSignal = signals.find(s => s.date === 'SIGNAL_DATE');
    expect(targetSignal).toBeDefined();
    expect(targetSignal?.percentile).toBeGreaterThanOrEqual(95);
  });

  it('does not trigger a signal if already in the 95th percentile', () => {
    const testData: CotDataPoint[] = [];
    for (let i = 0; i < 160; i++) {
      testData.push(createMockDataPoint({ reportDate: `D${i}`, prodMercNet: 100 }));
    }
    // Everything is 100. Rank will always be 0 (since v >= 100 is true for first element)
    // Wait, rank = sorted.findIndex((v) => v >= nets[i]);
    // If all are 100, rank is 0. pct is 0.

    // Let's use increasing values.
    const data: CotDataPoint[] = [];
    for (let i = 0; i < 200; i++) {
      data.push(createMockDataPoint({ reportDate: `D${i}`, prodMercNet: i }));
    }
    // These are all new highs.
    // For i=52: lookback [0...51]. nets[52]=52. rank=52. pct=100.
    // prev: lookback [0...50]. nets[51]=51. rank=51. pct=100.
    // pct=100, prevPct=100. Signal should NOT trigger for percentile (but might for net-long flip if it crossed 0).

    // Set all values to be positive to avoid net-long flip.
    data.forEach(d => d.prodMercNet += 100);

    const signals = detectBuySignals(data);
    // Since pct and prevPct are both 100 for all i >= 52, and they are all > 0,
    // only the FIRST one (at i=52) might trigger if its prevPct was < 95.
    // For i=52, prevPct is based on lookback i=51, which is nets[0...50].
    // Since they are all increasing, it will always be "new high" (pct 100).

    // If we have 200 points, and we check signals between index 100 and 200.
    const laterSignals = signals.filter(s => {
        const index = parseInt(s.date.replace('D', ''));
        return index > 60;
    });

    expect(laterSignals).toHaveLength(0);
  });

  it('handles "new high" rank calculation correctly', () => {
    const data: CotDataPoint[] = [];
    for (let i = 0; i < 100; i++) {
      data.push(createMockDataPoint({ reportDate: `D${i}`, prodMercNet: 10 }));
    }
    data[100] = createMockDataPoint({ reportDate: 'NEW_HIGH', prodMercNet: 20 });

    // For i=100: lookback is 100 points of '10'.
    // sorted is [10, 10, ...].
    // nets[100] is 20.
    // sorted.findIndex(v => v >= 20) is -1.
    // rank becomes sorted.length (100).
    // pct = (100/100) * 100 = 100.

    const signals = detectBuySignals(data);
    const highSignal = signals.find(s => s.date === 'NEW_HIGH');
    expect(highSignal).toBeDefined();
    expect(highSignal?.percentile).toBe(100);
  });
});
