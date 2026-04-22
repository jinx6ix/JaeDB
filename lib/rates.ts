// lib/rates.ts

export interface CostBreakdown {
  propertyPerNight: number;
  totalPropertyCost: number;
  parkFees: number;
  transport: number;
  extras: number;
  fileHandlingFee: number;
  ecoBottle: number;
  evacInsurance: number;
  subtotal: number;
  markupAmount: number;
  totalCost: number;
  perPersonCost: number;
  currency: string;
}

export interface CostInput {
  days: number;
  numPax: number;
  propertyRatePerNight: number;
  numNights?: number;
  parkFeesPerDay?: number;
  transportCost?: number;
  extras?: Array<{ description: string; cost: number }>;
  fileHandlingFee?: number;
  ecoBottle?: number;
  evacInsurance?: number;
  markupPercent?: number;
  currency?: string;
}

/**
 * Calculates tour costs based on the costing sheet structure.
 * Supports "based on N people" pricing similar to the Excel sheet.
 */
export function calculateCost(input: CostInput): CostBreakdown {
  const {
    days,
    numPax,
    propertyRatePerNight,
    numNights = days > 1 ? days - 1 : 0,
    parkFeesPerDay = 0,
    transportCost = 0,
    extras = [],
    fileHandlingFee = 0,
    ecoBottle = 0,
    evacInsurance = 0,
    markupPercent = 10,
    currency = 'USD',
  } = input;

  const totalPropertyCost = propertyRatePerNight * numNights * numPax;
  const parkFees = parkFeesPerDay * days * numPax;
  const extrasTotal = extras.reduce((sum, e) => sum + e.cost, 0);

  const subtotal =
    totalPropertyCost +
    parkFees +
    transportCost +
    extrasTotal +
    fileHandlingFee +
    ecoBottle +
    evacInsurance;

  const markupAmount = subtotal * (markupPercent / 100);
  const totalCost = subtotal + markupAmount;
  const perPersonCost = numPax > 0 ? totalCost / numPax : totalCost;

  return {
    propertyPerNight: propertyRatePerNight,
    totalPropertyCost,
    parkFees,
    transport: transportCost,
    extras: extrasTotal,
    fileHandlingFee,
    ecoBottle,
    evacInsurance,
    subtotal,
    markupAmount,
    totalCost,
    perPersonCost,
    currency,
  };
}

/**
 * Gets per-person rate from a rate card based on pax count.
 */
export function getRateForPax(
  rateCard: {
    basedOn2: number;
    basedOn4: number;
    basedOn6: number;
    basedOn8: number;
    basedOn10?: number | null;
    basedOn12?: number | null;
    markupPercent: number;
  },
  numPax: number
): number {
  let baseRate: number;

  if (numPax <= 2) baseRate = rateCard.basedOn2;
  else if (numPax <= 4) baseRate = rateCard.basedOn4;
  else if (numPax <= 6) baseRate = rateCard.basedOn6;
  else if (numPax <= 8) baseRate = rateCard.basedOn8;
  else if (numPax <= 10 && rateCard.basedOn10) baseRate = rateCard.basedOn10;
  else if (rateCard.basedOn12) baseRate = rateCard.basedOn12;
  else baseRate = rateCard.basedOn8; // fallback to 8-pax rate

  // Rate card values are already per-person and include markup
  return baseRate;
}

/**
 * Generates a voucher number in the format JTEDDMMYy
 */
export function generateVoucherNo(checkInDate?: Date): string {
  const date = checkInDate ?? new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `JTE${dd}${mm}${yy}${rand}`;
}

/**
 * Generates an invoice number
 */
export function generateInvoiceNo(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}-${num}`;
}

/**
 * Generates a booking reference
 */
export function generateBookingRef(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `JTE-${year}-${num}`;
}
