// Small date helpers. Dates are plain "YYYY-MM-DD" text in clinic time; no time zones involved.

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function addDays(date: string, days: number): string {
  if (!isValidDate(date)) throw new Error(`not a valid date: ${date}`);
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isMonday(date: string): boolean {
  return isValidDate(date) && new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
}

// The Friday of the week that starts on this Monday.
export function fridayOfWeek(monday: string): string {
  if (!isMonday(monday)) throw new Error(`not a Monday: ${monday}`);
  return addDays(monday, 4);
}
