export type AxisDomain = [number | 'auto', number | 'auto'];

/**
 * Ensures the zero-line aligns on dual-axis charts while keeping ticks on clean multiples.
 * It forces exactly 4 intervals (5 ticks) so that the zero-line hits a tick exactly.
 */
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

    // Define total number of intervals (tickCount - 1)
    const totalIntervals = 4;

    // Determine how many intervals should be below zero to accommodate the data.
    // We want n_neg / totalIntervals to be at least the ratio of (min / span).
    const getRequiredNegIntervals = (min: number, max: number) => {
        const span = max - min;
        if (span === 0) return 0;
        const ratio = Math.abs(min) / span;
        return Math.ceil(ratio * totalIntervals);
    };

    const nNeg1 = getRequiredNegIntervals(min1, max1);
    const nNeg2 = getRequiredNegIntervals(min2, max2);

    // Use the larger number of negative intervals to ensure both axes include all negative data.
    const nNeg = Math.max(nNeg1, nNeg2);
    const nPos = totalIntervals - nNeg;

    // Find a "nice" step size for each axis.
    const getNiceStep = (min: number, max: number, nN: number, nP: number) => {
        // Current step needed to cover the range
        const stepNeg = nN > 0 ? Math.abs(min) / nN : 0;
        const stepPos = nP > 0 ? max / nP : 0;
        let rawStep = Math.max(stepNeg, stepPos);

        if (rawStep === 0) rawStep = 1;

        // Nice interval candidates
        const Magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const rem = rawStep / Magnitude;
        let step;
        if (rem <= 1) step = 1;
        else if (rem <= 2) step = 2;
        else if (rem <= 2.5) step = 2.5;
        else if (rem <= 5) step = 5;
        else step = 10;

        return step * Magnitude;
    };

    const step1 = getNiceStep(min1, max1, nNeg, nPos);
    const step2 = getNiceStep(min2, max2, nNeg, nPos);

    return {
        pnlDomain: [nNeg === 0 ? 0 : -nNeg * step1, nPos === 0 ? 0 : nPos * step1],
        rorDomain: [nNeg === 0 ? 0 : -nNeg * step2, nPos === 0 ? 0 : nPos * step2],
    };
}
