// B5: reminders go out only from 17:00 to 22:00 clinic time (UTC+4, no daylight saving).
import { addDays } from "./dates";

export const WINDOW_START = 17 * 60; // minutes after midnight
export const WINDOW_END = 22 * 60;
export const DEFAULT_RUN_AT = 9 * 60; // the run is started on Monday morning in the simulator

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// `count` send times on the Monday (or the next day if the run is after 22:00), spread evenly
// from the later of the run time and 17:00 up to, but never including, 22:00.
export function sendTimes(monday: string, count: number, runAt: number = DEFAULT_RUN_AT): string[] {
  if (count <= 0) return [];
  let date = monday;
  let start = Math.max(runAt, WINDOW_START);
  if (start >= WINDOW_END) {
    date = addDays(monday, 1);
    start = WINDOW_START;
  }
  const span = WINDOW_END - start;
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const minute = start + Math.floor((i * span) / count);
    times.push(`${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00+04:00`);
  }
  return times;
}

export function timeOfDay(sendAt: string): string {
  return sendAt.slice(11, 16);
}
