import { getSyncDomains } from './chartUtils';

describe('getSyncDomains', () => {
    it('should handle empty arrays', () => {
        const result = getSyncDomains([], []);
        expect(result).toEqual({ pnlDomain: [0, 'auto'], rorDomain: [0, 'auto'] });
    });

    it('should handle all positive values', () => {
        const pnlValues = [100, 200, 500];
        const rorValues = [10, 20, 50];
        const result = getSyncDomains(pnlValues, rorValues);

        // Everything is positive, but nNeg is 0? 
        // Actually getRequiredNegIntervals(min, max) with min=0, max=500 -> ratio 0 -> nNeg 0.
        // nPos = 4.
        // pnl: step = max(0, 500/4) = 125. Nice step = 200.
        // ror: step = max(0, 50/4) = 12.5. Nice step = 20.
        expect(result.pnlDomain[0]).toBe(0);
        expect(result.pnlDomain[1]).toBe(800);
        expect(result.rorDomain[0]).toBe(0);
        expect(result.rorDomain[1]).toBe(80);
    });

    it('should handle all negative values', () => {
        const pnlValues = [-100, -200, -500];
        const rorValues = [-10, -20, -50];
        const result = getSyncDomains(pnlValues, rorValues);

        // nNeg = ceil(1.0 * 4) = 4. nPos = 0.
        // pnl: step = max(500/4, 0) = 125. Nice step = 200.
        // ror: step = max(50/4, 0) = 12.5. Nice step = 20.
        expect(result.pnlDomain).toEqual([-800, 0]);
        expect(result.rorDomain).toEqual([-80, 0]);
    });

    it('should synchronize domains with mixed values', () => {
        const pnlValues = [200, -100];
        const rorValues = [40, -10];

        const result = getSyncDomains(pnlValues, rorValues);

        // pnl: min -100, max 200, span 300. neg ratio 100/300=0.33. nNeg = ceil(0.33*4)=2. nPos=2.
        // ror: min -10, max 40, span 50. neg ratio 10/50=0.2. nNeg = ceil(0.2*4)=1.
        // Max nNeg = 2. nPos = 2.
        // pnl: step = max(100/2, 200/2) = 100. Nice step = 100.
        // ror: step = max(10/2, 40/2) = 20. Nice step = 20.
        expect(result.pnlDomain).toEqual([-200, 200]);
        expect(result.rorDomain).toEqual([-40, 40]);
    });

    it('should handle only zeros', () => {
        const pnlValues = [0, 0];
        const rorValues = [0, 0];
        const result = getSyncDomains(pnlValues, rorValues);

        expect(result.pnlDomain).toEqual([0, 'auto']);
        expect(result.rorDomain).toEqual([0, 'auto']);
    });
});
