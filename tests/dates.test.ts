import { describe, expect, it } from "vitest";
import { addDays, fridayOfWeek, isMonday, isValidDate } from "../src/lib/dates";

describe("F2 date helpers", () => {
  it("knows Monday 2026-11-02 is a Monday and gives Friday 2026-11-06", () => {
    expect(isMonday("2026-11-02")).toBe(true);
    expect(fridayOfWeek("2026-11-02")).toBe("2026-11-06");
  });

  it("rejects a day that is not a Monday", () => {
    expect(isMonday("2026-11-03")).toBe(false);
    expect(() => fridayOfWeek("2026-11-03")).toThrow();
  });

  it("adds and subtracts days across a month end", () => {
    expect(addDays("2026-11-27", 7)).toBe("2026-12-04");
    expect(addDays("2026-11-06", -7)).toBe("2026-10-30");
  });

  it("rejects text that is not a real date", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("6 Nov")).toBe(false);
    expect(isMonday("nonsense")).toBe(false);
  });
});
