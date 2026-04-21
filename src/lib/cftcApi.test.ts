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

    const signals = detectBuySignals(data);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      date: '2023-01-53',
      netPosition: 100,
    });
  });

  it('triggers a signal when hitting the 95th percentile for the first time', () => {
    const testData: CotDataPoint[] = [];
    for (let i = 0; i < 156; i++) {
      testData.push(createMockDataPoint({ reportDate: `D${i}`, prodMercNet: i }));
    }
    
    // Setup for transition: i=155 was at ~90%, i=156 jumps to ~95.5%
    testData.forEach(d => { if (d.prodMercNet <= 0) d.prodMercNet = 10; });
    testData[155].prodMercNet = 140; 
    testData.push(createMockDataPoint({ reportDate: 'SIGNAL_DATE', prodMercNet: 149 }));

    const signals = detectBuySignals(testData);
    const targetSignal = signals.find(s => s.date === 'SIGNAL_DATE');
    expect(targetSignal).toBeDefined();
    expect(targetSignal?.percentile).toBeGreaterThanOrEqual(95);
  });

  it('does not trigger a signal if already in the 95th percentile (the "new high streak" fix)', () => {
    const data: CotDataPoint[] = [];
    // Continuous increase should NOT trigger signals repeatedly
    for (let i = 0; i < 210; i++) {
      data.push(createMockDataPoint({
        reportDate: `2020-01-${i}`,
        prodMercNet: i + 100, // keep positive to avoid flip signals
      }));
    }

    const signals = detectBuySignals(data);
    
    // In an increasing series, after the lookback (52) is established, 
    // every new point is a 'new high' (100th percentile).
    // The first one might trigger, but subsequent ones should be blocked by (prevPct < 95).
    // Since prevPct will also be 100 for all subsequent points.
    
    const laterSignals = signals.filter(s => {
        const index = parseInt(s.date.replace('2020-01-', ''));
        return index > 60; // Check well after the threshold is first reached
    });

    expect(laterSignals).toHaveLength(0);
  });

  it('handles "new high" rank calculation correctly', () => {
    const data: CotDataPoint[] = [];
    for (let i = 0; i < 100; i++) {
      data.push(createMockDataPoint({ reportDate: `D${i}`, prodMercNet: 10 }));
    }
    data[100] = createMockDataPoint({ reportDate: 'NEW_HIGH', prodMercNet: 20 });

    const signals = detectBuySignals(data);
    const highSignal = signals.find(s => s.date === 'NEW_HIGH');
    expect(highSignal).toBeDefined();
    expect(highSignal?.percentile).toBe(100);
  });
  
  it('should trigger exactly once when crossing the 95th percentile threshold', () => {
    const data: CotDataPoint[] = [];
    // 156 weeks of stable data at 50
    for (let i = 0; i < 156; i++) {
      data.push(createMockDataPoint({ reportDate: `D${i}`, prodMercNet: 50 }));
    }
    // A jump to 100 (new high)
    data.push(createMockDataPoint({ reportDate: 'JUMP_DATE', prodMercNet: 100 }));
    // Stable at 100
    for (let i = 0; i < 10; i++) {
      data.push(createMockDataPoint({ reportDate: `AFTER_${i}`, prodMercNet: 100 }));
    }

    const signals = detectBuySignals(data);

    // Should trigger exactly once at the jump
    const jumpSignals = signals.filter(s => s.date.includes('JUMP_DATE') || s.date.includes('AFTER_'));
    expect(jumpSignals.length).toBe(1);
    expect(jumpSignals[0].date).toBe('JUMP_DATE');
  });
});
