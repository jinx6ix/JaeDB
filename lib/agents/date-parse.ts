// lib/agents/date-parse.ts
// Parses dates written in whatever format a human types them:
//   "1st august", "aug 1", "1/8/2026", "2026-08-01", "August 1st 2026",
//   "01-08-26", "next monday" (not supported — relative days need a
//   dedicated resolver; this handles calendar dates).
//
// Strategy: strip ordinal suffixes (1st/2nd/3rd/4th...), normalise
// separators, then try a series of explicit patterns before falling back
// to the JS Date parser. Day-before-month (DD/MM/YYYY) is preferred over
// the US MM/DD/YYYY convention, since this system is used in Kenya.

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function stripOrdinals(s: string): string {
  return s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
}

/** Returns a Date at local midnight, or null if nothing parseable was found. */
export function parseFlexibleDate(input: string, referenceDate: Date = new Date()): Date | null {
  if (!input) return null;
  let s = stripOrdinals(input.trim().toLowerCase());
  s = s.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();

  // "1 august" / "august 1" / "1 august 2026" / "august 1 2026"
  const monthNamePattern = new RegExp(
    `\\b(${Object.keys(MONTHS).join('|')})\\b`, 'i',
  );
  const monthMatch = s.match(monthNamePattern);
  if (monthMatch) {
    const month = MONTHS[monthMatch[1].toLowerCase()];
    const rest = s.replace(monthNamePattern, ' ').replace(/\s+/g, ' ').trim();
    const nums = rest.match(/\d{1,4}/g) || [];
    let day: number | undefined;
    let year: number | undefined;
    for (const n of nums) {
      if (n.length === 4) year = parseInt(n, 10);
      else if (!day) day = parseInt(n, 10);
    }
    if (day) {
      const y = year ?? referenceDate.getFullYear();
      const d = new Date(y, month, day);
      // If no year was given and the resulting date is far in the past,
      // assume the user means the upcoming occurrence.
      if (!year && d.getTime() < referenceDate.getTime() - 24 * 60 * 60 * 1000 * 3) {
        d.setFullYear(y + 1);
      }
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // "2026-08-01" / "2026/08/01" (ISO-ish, year first)
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // "1/8/2026" or "01-08-26" — day/month/year (Kenya convention)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // "today" / "tomorrow" / "yesterday"
  if (/^today$/.test(s)) return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (/^tomorrow$/.test(s)) { const d = new Date(referenceDate); d.setDate(d.getDate() + 1); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  if (/^yesterday$/.test(s)) { const d = new Date(referenceDate); d.setDate(d.getDate() - 1); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  // Last resort: let the JS engine try (handles "Aug 1 2026", ISO strings, etc.)
  const native = new Date(s);
  if (!isNaN(native.getTime())) return native;

  return null;
}

/** True if `check` falls on the same calendar day as `target`. */
export function isSameDay(check: Date | null | undefined, target: Date): boolean {
  if (!check) return false;
  return check.getFullYear() === target.getFullYear()
    && check.getMonth() === target.getMonth()
    && check.getDate() === target.getDate();
}

/** True if `target` falls within [start, end] inclusive (date-only comparison). */
export function isWithinRange(target: Date, start: Date, end: Date): boolean {
  const t = target.getTime();
  return t >= new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
    && t <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).getTime();
}
