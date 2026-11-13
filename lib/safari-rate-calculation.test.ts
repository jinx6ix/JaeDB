import { describe, it, expect } from 'vitest';
import {
  calculateSafariRate,
  calculateSafariRates,
  fmt2,
  type SafariRateComponents,
} from '@/lib/safari-rate-calculation';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const baseComponents: SafariRateComponents = {
  accommodationPpsTotal: 1270,
  parkFeesTotal: 700,
  transportGroupTotal: 1950,
  dailyExtrasTotal: 75,
  additionalExtrasTotal: 10,
  srsTotal: 0,
};

describe('calculateSafariRate — March regression test (spreadsheet methodology)', () => {
  const cases = [
    { pax: 1, markup: 10, expectedBase: 4005.00, expectedMarkup: 400.50, expectedFinal: 4405.50 },
    { pax: 2, markup: 15, expectedBase: 3030.00, expectedMarkup: 454.50, expectedFinal: 3484.50 },
    { pax: 4, markup: 10, expectedBase: 2542.50, expectedMarkup: 254.25, expectedFinal: 2796.75 },
    { pax: 6, markup: 10, expectedBase: 2380.00, expectedMarkup: 238.00, expectedFinal: 2618.00 },
    { pax: 8, markup: 10, expectedBase: 2298.75, expectedMarkup: 229.875, expectedFinal: 2528.625 },
  ];

  it.each(cases)(
    'pax=$pax markup=$markup% → base $expectedBase, markup $expectedMarkup, final $expectedFinal',
    ({ pax, markup, expectedBase, expectedMarkup, expectedFinal }) => {
      const result = calculateSafariRate(baseComponents, pax, markup);
      expect(round2(result.basePps)).toBe(round2(expectedBase));
      expect(round2(result.markupAmount)).toBe(round2(expectedMarkup));
      expect(round2(result.finalRate)).toBe(round2(expectedFinal));
      expect(result.transportPerPerson).toBe(round2(1950 / pax));
    }
  );

  it('reproduces all five expected final selling rates to two decimals', () => {
    const expectedFinals = [4405.50, 3484.50, 2796.75, 2618.00, 2528.63];
    const results = calculateSafariRates(baseComponents, [
      { pax: 1, markupPercent: 10 },
      { pax: 2, markupPercent: 15 },
      { pax: 4, markupPercent: 10 },
      { pax: 6, markupPercent: 10 },
      { pax: 8, markupPercent: 10 },
    ]);
    results.forEach((r, i) => {
      expect(round2(r.finalRate)).toBe(round2(expectedFinals[i]));
    });
  });
});

describe('calculateSafariRate — edge cases', () => {
  it('zero park fees', () => {
    const r = calculateSafariRate(
      { ...baseComponents, parkFeesTotal: 0 },
      2,
      10
    );
    expect(round2(r.basePps)).toBe(round2(1270 + 0 + 1950 / 2 + 75 + 10));
  });

  it('zero transport costs', () => {
    const r = calculateSafariRate(
      { ...baseComponents, transportGroupTotal: 0 },
      4,
      10
    );
    expect(round2(r.transportPerPerson)).toBe(0);
    expect(round2(r.basePps)).toBe(round2(1270 + 700 + 0 + 75 + 10));
  });

  it('zero additional extras', () => {
    const r = calculateSafariRate(
      { ...baseComponents, additionalExtrasTotal: 0 },
      2,
      10
    );
    expect(round2(r.additionalExtrasTotal)).toBe(0);
  });

  it('SRS handled separately and added to base PPS', () => {
    const r = calculateSafariRate(
      { ...baseComponents, srsTotal: 150 },
      2,
      10
    );
    expect(round2(r.basePps)).toBe(round2(1270 + 700 + 1950 / 2 + 75 + 10 + 150));
    expect(r.srsTotal).toBe(150);
  });

  it('accommodation PPS is not divided by passenger count', () => {
    const r1 = calculateSafariRate(baseComponents, 1, 10);
    const r8 = calculateSafariRate(baseComponents, 8, 10);
    // accommodationPpsTotal stays 1270 regardless of pax
    expect(r1.accommodationPpsTotal).toBe(1270);
    expect(r8.accommodationPpsTotal).toBe(1270);
    // only transport per person changes with pax
    expect(r1.transportPerPerson).toBe(1950);
    expect(r8.transportPerPerson).toBe(243.75);
  });

  it('each option calculates independently with its own markup', () => {
    const results = calculateSafariRates(baseComponents, [
      { pax: 2, markupPercent: 15 },
      { pax: 2, markupPercent: 10 },
    ]);
    // same pax, different markup → different final rates
    expect(results[0].finalRate).not.toBe(results[1].finalRate);
  });

  it('pax of 0 does not crash (transportPerPerson = 0)', () => {
    const r = calculateSafariRate(baseComponents, 0, 10);
    expect(r.transportPerPerson).toBe(0);
  });

  it('decimal values and currency rounding', () => {
    const r = calculateSafariRate(
      { ...baseComponents, transportGroupTotal: 1951.33 },
      3,
      7.5
    );
    const expectedBase = round2(1270 + 700 + 1951.33 / 3 + 75 + 10);
    expect(round2(r.basePps)).toBe(expectedBase);
    expect(round2(r.finalRate)).toBe(round2(expectedBase * 1.075));
  });
});

describe('fmt2 formatting', () => {
  it('formats to two decimal places', () => {
    expect(fmt2(4405.5)).toBe('4,405.50');
    expect(fmt2(2298.75)).toBe('2,298.75');
    expect(fmt2(0)).toBe('0.00');
  });
});
