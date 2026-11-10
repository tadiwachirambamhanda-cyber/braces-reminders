import { describe, expect, it } from "vitest";
import { PatientSchema } from "../src/lib/patients";
import { SlotListSchema, freeTimes, isFriday, slotsForDate } from "../src/lib/calendar";
import { buildPatients, buildSlots, FRIDAYS } from "../src/lib/seed-data";

const patients = buildPatients();
const slots = buildSlots(patients);
const braces = patients.filter((p) => p.treatment === "braces");

describe("F1 seed: patients", () => {
  it("has 60 patients, 50 on braces and 10 on something else", () => {
    expect(patients).toHaveLength(60);
    expect(braces).toHaveLength(50);
    expect(patients.filter((p) => p.treatment !== "braces")).toHaveLength(10);
  });

  it("gives every patient a unique id and a valid shape", () => {
    expect(new Set(patients.map((p) => p.id)).size).toBe(60);
    for (const p of patients) expect(PatientSchema.safeParse(p).success).toBe(true);
  });

  it("puts every braces visit on a Friday in November 2026", () => {
    for (const p of braces) {
      expect(isFriday(p.dueDate)).toBe(true);
      expect(p.dueDate.startsWith("2026-11-")).toBe(true);
    }
  });

  it("has 14 braces patients due 2026-11-06: 12 clean, 1 booked, 1 with no phone", () => {
    const due = braces.filter((p) => p.dueDate === "2026-11-06");
    expect(due).toHaveLength(14);
    expect(due.filter((p) => p.bookedSlotId !== null)).toHaveLength(1);
    expect(due.filter((p) => p.phone === "")).toHaveLength(1);
    expect(due.filter((p) => p.bookedSlotId === null && p.phone !== "")).toHaveLength(12);
  });

  it("has 12 braces patients due on each of the other three Fridays", () => {
    for (const date of ["2026-11-13", "2026-11-20", "2026-11-27"]) {
      expect(braces.filter((p) => p.dueDate === date)).toHaveLength(12);
    }
  });

  it("has some non-braces patients due 2026-11-06 so a later run can prove they are skipped", () => {
    const others = patients.filter((p) => p.treatment !== "braces" && p.dueDate === "2026-11-06");
    expect(others.length).toBeGreaterThan(0);
  });

  it("uses only invented phone numbers", () => {
    for (const p of patients) {
      if (p.phone !== "") expect(p.phone).toMatch(/^\+971 50 000 \d{4}$/);
    }
  });
});

describe("F1 seed: braces calendar", () => {
  it("is valid and has 15 slots on each of the four Fridays", () => {
    expect(SlotListSchema.safeParse(slots).success).toBe(true);
    for (const date of FRIDAYS) {
      expect(isFriday(date)).toBe(true);
      expect(slotsForDate(slots, date)).toHaveLength(15);
    }
  });

  it("runs from 17:00 to 21:40 in 20-minute steps", () => {
    const times = slotsForDate(slots, "2026-11-06").map((s) => s.time);
    expect(times[0]).toBe("17:00");
    expect(times[14]).toBe("21:40");
    expect(times[1]).toBe("17:20");
  });

  it("has exactly 12 free times on 2026-11-06, in order", () => {
    expect(freeTimes(slots, "2026-11-06")).toEqual([
      "17:40", "18:00", "18:20", "19:00", "19:20", "19:40",
      "20:00", "20:20", "20:40", "21:00", "21:20", "21:40",
    ]);
  });

  it("marks the booked patient's slot as taken by that patient", () => {
    const booked = braces.find((p) => p.bookedSlotId !== null)!;
    const slot = slots.find((s) => s.id === booked.bookedSlotId)!;
    expect(slot.takenBy).toBe(booked.id);
  });

  it("leaves the other three Fridays fully free", () => {
    for (const date of ["2026-11-13", "2026-11-20", "2026-11-27"]) {
      expect(freeTimes(slots, date)).toHaveLength(15);
    }
  });
});
