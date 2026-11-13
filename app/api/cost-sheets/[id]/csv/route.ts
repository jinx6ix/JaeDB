// app/api/cost-sheets/[id]/csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clientPropertyFilename } from '@/lib/filename';
import { prisma } from '@/lib/prisma';

interface DayRow {
  destinationName?: string | null;
  hotelName?: string;
  adultAccomTotal?: number;
  childAccomTotal?: number;
  parkFeeAdultTotal?: number;
  parkFeeChildTotal?: number;
  transportTotal?: number;
  extrasTotal?: number;
  singleRoomRate?: number;
  hasFlight?: boolean;
  flightAdultPP?: number;
  flightChildPP?: number;
  // Alternative field names
  destination?: string | null;
  hotel?: string;
  adultCostPP?: number;
  childCostPP?: number;
  parkFeeAdultPP?: number;
  parkFeeChildPP?: number;
  transportPP?: number;
}

interface ExtraItem {
  label: string;
  cost: number;
}

function parseDayRows(raw: unknown): DayRow[] {
  if (!raw) return [];
  let parsed = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  let rows: any[] = [];
  if (Array.isArray(parsed)) rows = parsed;
  else if (parsed && typeof parsed === 'object') rows = Object.values(parsed);
  else rows = [];

  return rows.map((row: any) => ({
    destinationName: row.destination ?? row.destinationName ?? row.destinationName ?? null,
    hotelName: row.hotelName ?? row.hotel ?? '',
    adultAccomTotal: row.adultCostPP ?? row.adultAccomTotal ?? row.adultTotal ?? 0,
    childAccomTotal: row.childCostPP ?? row.childAccomTotal ?? row.childTotal ?? 0,
    parkFeeAdultTotal: row.parkFeeAdultPP ?? row.parkFeeAdultTotal ?? 0,
    parkFeeChildTotal: row.parkFeeChildPP ?? row.parkFeeChildTotal ?? 0,
    transportTotal: row.transportPP ?? row.transportTotal ?? 0,
    extrasTotal: row.extrasTotal ?? row.dailyExtras ?? 0,
    singleRoomRate: row.singleRoomRate ?? row.srs ?? 0,
    hasFlight: row.hasFlight ?? false,
    flightAdultPP: row.flightAdultPP ?? 0,
    flightChildPP: row.flightChildPP ?? 0,
  }));
}

function parseExtras(raw: unknown): ExtraItem[] {
  if (!raw) return [];
  let parsed = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const sheet = await prisma.costSheet.findUnique({
    where: { id },
    include: {
      client: true,
      booking: { include: { client: true } },
      agent: true,
    },
  });

  if (!sheet) return new NextResponse('Not found', { status: 404 });

  const dayRows = parseDayRows(sheet.dayRows);
  const extras = parseExtras(sheet.extras);

  const numAdults = Number(sheet.numAdults) || 1;
  const numChildren = Number(sheet.numChildren) || 0;
  const numPax = numAdults + numChildren;

  // ── New spreadsheet methodology ──
  // Accommodation PPS is already per-person — sum directly, never divide by pax.
  const accommodationPpsTotal = dayRows.reduce((sum, row) => sum + (row.adultAccomTotal || 0), 0);
  const dailyExtrasTotal = dayRows.reduce((sum, row) => sum + (row.extrasTotal || 0), 0);

  // SRS handled separately: only when a single adult travels with a single-room rate.
  const srsTotal = numAdults === 1
    ? dayRows.reduce((sum, row) => sum + (row.singleRoomRate || 0), 0)
    : 0;

  let parkGroupTotal = 0;
  let transportGroupTotal = 0;
  let extrasTotal =
    (sheet.fileHandlingFee || 0) +
    (sheet.ecoBottle || 0) +
    (sheet.evacInsurance || 0) +
    (sheet.arrivalTransfer || 0) +
    (sheet.departureTransfer || 0) +
    (sheet.maasaiVillage ? (sheet.maasaiCost || 0) : 0);
  extras.forEach((e: any) => { extrasTotal += Number(e.cost) || 0; });

  dayRows.forEach((row: any) => {
    parkGroupTotal += Number(row.parkFeeAdultTotal || 0) + Number(row.parkFeeChildTotal || 0);
    transportGroupTotal += Number(row.transportTotal || 0);
  });

  // Transport is a group expense: divide by pax for per-person allocation.
  const transportPerPax = numPax > 0 ? transportGroupTotal / numPax : 0;

  const perPersonSubtotal = accommodationPpsTotal + parkGroupTotal + transportPerPax + dailyExtrasTotal + extrasTotal + srsTotal;
  const markupPercent = Number(sheet.markupPercent) || 10;
  const markupAmount = perPersonSubtotal * (markupPercent / 100);
  const perPersonTotal = perPersonSubtotal + markupAmount;

  // Build CSV
  const rows: string[][] = [];

  // Header
  rows.push(["Days", "Properties", "PPS", "SRS", "Park Fees", "Transport", "Extras", "", "", "", "", ""]);

  // Month
  const monthName = new Date(sheet.createdAt).toLocaleDateString('en-KE', { month: 'long' });
  rows.push([monthName, "", "", "", "", "", "", "", "", "", "", ""]);

  // Day rows
  dayRows.forEach((row, i) => {
    const propertyName = row.hotelName || row.destinationName || '';
    const dailyExtras = Number(row.extrasTotal || 0);
    rows.push([
      `Day${i + 1}`,
      propertyName,
      String(row.adultAccomTotal || ''),
      Number(row.singleRoomRate || 0) > 0 ? String(row.singleRoomRate || '') : '',
      String(row.parkFeeAdultTotal || ''),
      String(row.transportTotal || ''),
      dailyExtras > 0 ? String(dailyExtras) : '',
      "", "", "", "", "",
    ]);
  });

  // Empty rows (to match format)
  for (let i = 0; i < 5; i++) {
    rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
  }

  // Extras section
  rows.push(["", "Extras", "", "", "", "", "", "", "", "", "", ""]);
  extras.forEach(extra => {
    rows.push(["", extra.label, String(extra.cost || ''), "", "", "", "", "", "", "", "", ""]);
  });

  // File handling, eco bottle, evacuation insurance
  if (sheet.fileHandlingFee) {
    rows.push(["", "File handling fees", "", "", "", "", "", "", "", "", "", ""]);
  }
  if (sheet.ecoBottle) {
    rows.push(["", "Eco steel bottle + mineral water", String(sheet.ecoBottle), "", "", "", "", "", "", "", "", ""]);
  }
  if (sheet.evacInsurance) {
    rows.push(["", "Evacuation Insurance", "", "", "", "", "", "", "", "", "", ""]);
  }

  // Totals section
  rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push(["", "Totals", String(accommodationPpsTotal.toFixed(2)), "", String(parkGroupTotal.toFixed(2)), String(transportGroupTotal.toFixed(2)), "", "", "", "", "", ""]);

  // Empty row
  rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);

  // Options based on different group sizes — each option calculates independently
  // (transport group expense divided by that option's pax).
  const groupSizes = [2, 4, 6, 8];
  groupSizes.forEach(size => {
    const transportPerPaxForSize = size > 0 ? transportGroupTotal / size : 0;
    const groupSubtotal = accommodationPpsTotal + parkGroupTotal + transportPerPaxForSize + dailyExtrasTotal + extrasTotal + srsTotal;
    const groupMarkup = groupSubtotal * (markupPercent / 100);
    const groupRate = groupSubtotal + groupMarkup;

    rows.push(["Option 01", `Based on ${size} people`, "PPS", "", "", "", "", "", "", "", "", ""]);
    rows.push(["", "Per person sharing", String(groupSubtotal.toFixed(2)), "", "", "", "", "", "", "", "", ""]);
    rows.push(["", `Mark up ${markupPercent}%`, String(groupMarkup.toFixed(2)), "", "", "", "", "", "", "", "", ""]);
    rows.push(["", "Rate Charged", String(groupRate.toFixed(2)), "", "", "", "", "", "", "", "", ""]);
    rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
  });

  // Convert to CSV string
  const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n');

  // Return as downloadable CSV
  const clientName = sheet.client?.name || sheet.booking?.client?.name || '';
  const propertyName = sheet.tourTitle || '';
  const filename = clientPropertyFilename(clientName, propertyName, '.csv') || `costsheet_${sheet.tourTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}