export type AxisDomain = [number | 'auto', number | 'auto'];

export function getSyncDomains(pnlValues: number[], rorValues: number[]): { pnlDomain: AxisDomain; rorDomain: AxisDomain } {
    if (pnlValues.length === 0 || rorValues.length === 0) {
        return { pnlDomain: [0, 'auto'], rorDomain: [0, 'auto'] };
    }

    const min1 = Math.min(...pnlValues, 0);
    const max1 = Math.max(...pnlValues, 0);
    const min2 = Math.min(...rorValues, 0);
    const max2 = Math.max(...rorValues, 0);

    if (min1 === 0 && max1 === 0 && min2 === 0 && max2 === 0) {
        return { pnlDomain: [0, 'auto'], rorDomain: [0, 'auto'] };
    }

    const r1 = max1 === 0 ? Number.NEGATIVE_INFINITY : min1 / max1;
    const r2 = max2 === 0 ? Number.NEGATIVE_INFINITY : min2 / max2;

    let finalMin1 = min1;
    let finalMax1 = max1;
    let finalMin2 = min2;
    let finalMax2 = max2;

    if (r1 !== r2) {
        if (r1 === Number.NEGATIVE_INFINITY) {
            finalMax1 = finalMin1 / r2;
        } else if (r2 === Number.NEGATIVE_INFINITY) {
            finalMax2 = finalMin2 / r1;
        } else {
            const targetR = Math.min(r1, r2);
            if (r1 > targetR) finalMin1 = finalMax1 * targetR;
            if (r2 > targetR) finalMin2 = finalMax2 * targetR;
        }
    }

    const bufferFn = (val: number, isMax: boolean) => {
        if (val === 0) return 0;
        return isMax ? (val > 0 ? val * 1.1 : val * 0.9) : (val < 0 ? val * 1.1 : val * 0.9);
    };

    return {
        pnlDomain: [bufferFn(finalMin1, false), bufferFn(finalMax1, true)],
        rorDomain: [bufferFn(finalMin2, false), bufferFn(finalMax2, true)],
    };
}
