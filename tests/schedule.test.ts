import { describe, expect, it } from "vitest";
import { sendTimes, timeOfDay } from "../src/lib/schedule";

const minutes = (t: string) => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));

describe("F4 send times (B5)", () => {
  it("B5: 12 reminders from a 09:00 run all fall from 17:00 to before 22:00, in order, spread out", () => {
    const times = sendTimes("2026-11-02", 12);
    expect(times).toHaveLength(12);
    expect(timeOfDay(times[0])).toBe("17:00");
    for (const t of times) {
      expect(t.startsWith("2026-11-02T")).toBe(true);
      expect(t.endsWith("+04:00")).toBe(true);
      expect(minutes(t)).toBeGreaterThanOrEqual(17 * 60);
      expect(minutes(t)).toBeLessThan(22 * 60);
    }
    expect([...times].sort()).toEqual(times);
    expect(new Set(times).size).toBe(12); // not all at once
  });

  it("B5: 24 reminders all fit in the window", () => {
    const times = sendTimes("2026-11-09", 24);
    expect(times).toHaveLength(24);
    expect(new Set(times).size).toBe(24);
    for (const t of times) expect(minutes(t)).toBeLessThan(22 * 60);
  });

  it("B5: a run at 19:30 starts at 19:30 and still ends before 22:00", () => {
    const times = sendTimes("2026-11-02", 5, 19 * 60 + 30);
    expect(timeOfDay(times[0])).toBe("19:30");
    for (const t of times) expect(minutes(t)).toBeLessThan(22 * 60);
  });

  it("B5: a run after 22:00 rolls to 17:00 the next day", () => {
    const times = sendTimes("2026-11-02", 3, 22 * 60 + 30);
    expect(times[0]).toBe("2026-11-03T17:00:00+04:00");
    for (const t of times) expect(t.startsWith("2026-11-03T")).toBe(true);
  });

  it("no reminders means no times", () => {
    expect(sendTimes("2026-11-02", 0)).toEqual([]);
  });

  it("a run at 09:00 and one at 16:59 give the same times", () => {
    expect(sendTimes("2026-11-02", 6, 9 * 60)).toEqual(sendTimes("2026-11-02", 6, 16 * 60 + 59));
  });
});
