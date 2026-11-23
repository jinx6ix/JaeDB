// lib/safari-rate-calculation.ts
// Pure, independently testable rate calculation for the safari costing calculator.
// Implements the confirmed Excel spreadsheet methodology:
//   Base PPS = Accommodation PPS Total + Park Fees Total + (Group Transport / Pax)
//             + Daily Extras Total + Additional Extras Total + SRS
//   Markup Amount = Base PPS × (Markup % / 100)
//   Final Rate = Base PPS + Markup Amount

export interface SafariRateComponents {
  /** Sum of all daily accommodation PPS rates (per-person-sharing, NOT divided by pax). */
  accommodationPpsTotal: number;
  /** Sum of all daily park fees (group total). */
  parkFeesTotal: number;
  /** Total group transport expense across all days. */
  transportGroupTotal: number;
  /** Sum of all daily extras (per-day Extras column from spreadsheet). */
  dailyExtrasTotal: number;
  /** Total of additional extras (eco bottle, file handling, evacuation insurance, etc.). */
  additionalExtrasTotal: number;
  /** Single-room supplement total, handled separately per allocation rules. */
  srsTotal: number;
}

export interface SafariRateResult {
  pax: number;
  markupPercent: number;
  accommodationPpsTotal: number;
  parkFeesTotal: number;
  transportGroupTotal: number;
  transportPerPerson: number;
  dailyExtrasTotal: number;
  additionalExtrasTotal: number;
  srsTotal: number;
  basePps: number;
  markupAmount: number;
  finalRate: number;
}

/**
 * Calculate the per-person selling rate for a given group size and markup.
 * Keeps full numeric precision internally; round only when displaying.
 */
export function calculateSafariRate(
  components: SafariRateComponents,
  pax: number,
  markupPercent: number
): SafariRateResult {
  const transportPerPerson = pax > 0 ? components.transportGroupTotal / pax : 0;

  const basePps =
    components.accommodationPpsTotal +
    components.parkFeesTotal +
    transportPerPerson +
    components.dailyExtrasTotal +
    components.additionalExtrasTotal +
    components.srsTotal;

  const markupAmount = basePps * (markupPercent / 100);
  const finalRate = basePps + markupAmount;

  return {
    pax,
    markupPercent,
    accommodationPpsTotal: components.accommodationPpsTotal,
    parkFeesTotal: components.parkFeesTotal,
    transportGroupTotal: components.transportGroupTotal,
    transportPerPerson,
    dailyExtrasTotal: components.dailyExtrasTotal,
    additionalExtrasTotal: components.additionalExtrasTotal,
    srsTotal: components.srsTotal,
    basePps,
    markupAmount,
    finalRate,
  };
}

/**
 * Calculate rates for multiple group-size options, each with its own pax and markup.
 * Each option is calculated independently.
 */
export function calculateSafariRates(
  components: SafariRateComponents,
  options: { pax: number; markupPercent: number }[]
): SafariRateResult[] {
  return options.map((opt) =>
    calculateSafariRate(components, opt.pax, opt.markupPercent)
  );
}

/** Round a value to 2 decimal places for display. */
export function fmt2(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
