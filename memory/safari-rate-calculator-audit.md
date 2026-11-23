---
name: safari-rate-calculator-audit
description: Audit and fix RateCalculator.tsx to match Excel costing spreadsheet formula
metadata:
  type: project
---

## Problem
`RateCalculator.tsx` does not match the Excel costing spreadsheet formula. Key bugs:
1. `getAccommodationGroupTotal()` multiplies PPS rate by numAdults, then `optionResults` divides by pax — accommodation should NOT be divided by passenger count (PPS is already per-person).
2. `optionResults` uses `globalMarkup` for all options; spreadsheet requires per-option markup (10%, 15%, 10%, 10%, 10% for pax 1,2,4,6,8).
3. SRS is mixed into accommodation total instead of handled separately.
4. No per-day "daily extras" field in DayRow (spreadsheet has per-day Extras column).
5. Transport IS correctly divided by pax (group expense), but accommodation isn't.

## Target Formula (from spreadsheet)
Base PPS = Accommodation PPS Total + Park Fees Total + (Total Group Transport / Passenger Count) + Daily Extras Total + Additional Extras Total + SRS
Markup Amount = Base PPS × (Markup % / 100)
Final Rate = Base PPS + Markup Amount

## Regression Test (March itinerary)
| Pax | Base PPS | Markup | Markup Amt | Final Rate |
|---|---|---|---|---|
| 1 | 4,005.00 | 10% | 400.50 | 4,405.50 |
| 2 | 3,030.00 | 15% | 454.50 | 3,484.50 |
| 4 | 2,542.50 | 10% | 254.25 | 2,796.75 |
| 6 | 2,380.00 | 10% | 238.00 | 2,618.00 |
| 8 | 2,298.75 | 10% | 229.875 | 2,528.63 |

## Files to change
- `app/dashboard/costing/RateCalculator.tsx` — fix calculation
- Create `app/dashboard/costing/RateCalculator.test.ts` — automated tests

## Progress
- [x] Read and analyze RateCalculator.tsx (DONE)
- [x] Added pure `calculateSafariRate` / `calculateSafariRates` in `lib/safari-rate-calculation.ts`
- [x] Fixed `getAccommodationGroupTotal` → PPS-only, no pax multiplication/division
- [x] Added `extrasTotal` to DayRow for per-day daily extras
- [x] Fixed `optionResults` to use per-option markup and correct formula via `calculateSafariRates`
- [x] Fixed display to show per-option markup and clear breakdown table
- [x] Fixed `buildPayload` to serialize `extrasTotal`
- [x] Fixed `loadCostSheet` to load `extrasTotal`
- [x] Day table: added Daily Extras input column
- [x] Added per-option markup editing UI
- [x] Wrote automated tests (`lib/safari-rate-calculation.test.ts`) — ALL 15 PASS
- [x] Verified all 5 regression test values match spreadsheet exactly
- [x] Build passes (`next build` clean)
