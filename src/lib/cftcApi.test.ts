/**
 * @jest-environment node
 */
import { detectBuySignals } from './cftcApi';
import { CotDataPoint } from '@/types/cot';

describe('detectBuySignals', () => {
  it('should handle new highs for current and previous bars correctly', () => {
    const data: Partial<CotDataPoint>[] = [];
    // Create 210 data points with increasing net position
    for (let i = 0; i < 210; i++) {
      data.push({
        reportDate: `2020-01-${i}`,
        prodMercNet: i,
      });
    }

    const signals = detectBuySignals(data as CotDataPoint[]);

    // With the fix, a continuous increase should NOT trigger signals repeatedly.
    // In this data, nets[51]=51, nets[52]=52.
    // pct = calculatePercentile(52, [0..51]) = 100.
    // prevPct = calculatePercentile(51, [0..50]) = 100.
    // (pct >= 95 && prevPct < 95) is (100 >= 95 && 100 < 95) => FALSE.
    expect(signals.length).toBe(0);
  });

  it('should trigger exactly once when crossing the 95th percentile threshold', () => {
    const data: Partial<CotDataPoint>[] = [];
    // 156 weeks of stable data at 50
    for (let i = 0; i < 156; i++) {
      data.push({ reportDate: `2020-01-${i}`, prodMercNet: 50 });
    }
    // A jump to 100 (new high)
    data.push({ reportDate: '2023-01-01', prodMercNet: 100 });
    // Stable at 100
    for (let i = 0; i < 10; i++) {
      data.push({ reportDate: `2023-01-0${i+2}`, prodMercNet: 100 });
    }

    const signals = detectBuySignals(data as CotDataPoint[]);

    // Should trigger exactly once at the jump
    expect(signals.length).toBe(1);
    expect(signals[0].percentile).toBe(100);
    expect(signals[0].date).toBe('2023-01-01');
  });

  it('should trigger on net-long flip', () => {
    const data: Partial<CotDataPoint>[] = [];
    // 60 weeks of net short
    for (let i = 0; i < 60; i++) {
      data.push({ reportDate: `2020-01-${i}`, prodMercNet: -10 });
    }
    // Flip to net long
    data.push({ reportDate: '2021-01-01', prodMercNet: 5 });

    const signals = detectBuySignals(data as CotDataPoint[]);

    expect(signals.some(s => s.date === '2021-01-01')).toBe(true);
  });
});
