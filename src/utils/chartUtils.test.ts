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

        expect(result.pnlDomain[0]).toBe(0);
        expect(result.pnlDomain[1]).toBeCloseTo(550); // 500 * 1.1

        expect(result.rorDomain[0]).toBe(0);
        expect(result.rorDomain[1]).toBeCloseTo(55); // 50 * 1.1
    });

    it('should handle all negative values', () => {
        const pnlValues = [-100, -200, -500];
        const rorValues = [-10, -20, -50];
        const result = getSyncDomains(pnlValues, rorValues);

        expect(result.pnlDomain[0]).toBeCloseTo(-550); // -500 * 1.1
        expect(result.pnlDomain[1]).toBe(0);
    });

    it('should synchronize domains with mixed values', () => {
        const pnlValues = [200, -100];
        const rorValues = [40, -10];

        const result = getSyncDomains(pnlValues, rorValues);

        expect(result.pnlDomain[0]).toBeCloseTo(-110); // -100 * 1.1
        expect(result.pnlDomain[1]).toBeCloseTo(220); // 200 * 1.1

        expect(result.rorDomain[0]).toBeCloseTo(-22); // -20 * 1.1
        expect(result.rorDomain[1]).toBeCloseTo(44); // 40 * 1.1
    });

    it('should handle only zeros', () => {
        const pnlValues = [0, 0];
        const rorValues = [0, 0];
        const result = getSyncDomains(pnlValues, rorValues);

        expect(result.pnlDomain).toEqual([0, 'auto']);
        expect(result.rorDomain).toEqual([0, 'auto']);
    });
});
