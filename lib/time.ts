/** Calendar helpers in the school's time zone, so "today" matches the student's day. */
export const SCHOOL_TZ = "Asia/Jerusalem";

export function dayKey(date: Date, timeZone = SCHOOL_TZ): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Add whole days to a YYYY-MM-DD key. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function daysBetween(fromDay: string, toDay: string): number {
  const a = Date.parse(fromDay + "T00:00:00Z");
  const b = Date.parse(toDay + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/**
 * The instant a school-time-zone day starts (approximated as 03:00 UTC, i.e. 05:00–06:00
 * in Israel), which keeps "due tomorrow" items due from early morning that day.
 */
export function dayStart(day: string): Date {
  return new Date(day + "T03:00:00Z");
}

/** ISO week key like "2026-W48", used for weekly rewards. */
export function weekKey(day: string): string {
  const date = new Date(day + "T00:00:00Z");
  const dow = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dow + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
