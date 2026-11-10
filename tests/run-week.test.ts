import { describe, expect, it } from "vitest";
import { decideWeek, isValidPhone } from "../src/lib/run-week";
import { buildPatients } from "../src/lib/seed-data";
import type { Patient } from "../src/lib/patients";

// One braces patient due on Friday 2026-11-06, no booking, valid phone. Tests change one thing.
function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "T1",
    firstName: "Test",
    phone: "+971 50 000 0001",
    treatment: "braces",
    dueDate: "2026-11-06",
    bookedSlotId: null,
    ...overrides,
  };
}

describe("F2 rules, one by one", () => {
  it("B1: a patient who is not on braces is ignored, even when due that Friday", () => {
    const r = decideWeek([patient({ treatment: "cleaning" })], "2026-11-02");
    expect(r.decisions).toHaveLength(0);
    expect(r.counts.ignored).toBe(1);
  });

  it("B2: a braces patient due on that Friday with no booking gets reminder 1", () => {
    const r = decideWeek([patient()], "2026-11-02");
    expect(r.decisions).toEqual([
      expect.objectContaining({ status: "to_send", reminderNumber: 1 }),
    ]);
  });

  it("B2: a patient with a booking is skipped_booked and not sent", () => {
    const r = decideWeek([patient({ bookedSlotId: "2026-11-06T17:00" })], "2026-11-02");
    expect(r.decisions[0].status).toBe("skipped_booked");
    expect(r.counts.toSend).toBe(0);
  });

  it("B2: a patient due the Friday before (not booked) gets reminder 2", () => {
    const r = decideWeek([patient()], "2026-11-09");
    expect(r.decisions[0]).toMatchObject({ status: "to_send", reminderNumber: 2 });
  });

  it("B2: a patient due next Friday or later is not picked yet", () => {
    const r = decideWeek([patient({ dueDate: "2026-11-13" })], "2026-11-02");
    expect(r.decisions).toHaveLength(0);
  });

  it("B3: no patient is picked for a third reminder; they need a person instead", () => {
    const r = decideWeek([patient()], "2026-11-16");
    expect(r.decisions[0]).toMatchObject({ status: "needs_person", reason: "no_booking_after_two_reminders" });
    expect(r.counts.toSend).toBe(0);
  });

  it("B3: three weeks after the visit date the patient is no longer looked at", () => {
    const r = decideWeek([patient()], "2026-11-23");
    expect(r.decisions).toHaveLength(0);
  });

  it("B6: after two reminders and no booking there is no third reminder, only needs_person", () => {
    const week3 = decideWeek([patient()], "2026-11-16");
    expect(week3.decisions.every((d) => d.reminderNumber === null)).toBe(true);
    expect(week3.decisions[0].status).toBe("needs_person");
  });

  it("a missing or invalid phone goes to a person and is not sent", () => {
    for (const phone of ["", "12345", "abc", "+97"]) {
      const r = decideWeek([patient({ phone })], "2026-11-02");
      expect(r.decisions[0]).toMatchObject({ status: "needs_person", reason: "no_phone" });
    }
    expect(isValidPhone("+971 50 000 0001")).toBe(true);
  });

  it("a Monday is required", () => {
    expect(() => decideWeek([patient()], "2026-11-03")).toThrow();
  });
});

describe("F2 on the seed data", () => {
  const patients = buildPatients();

  it("Monday 2026-11-02: 12 to send, 1 skipped, 1 needs person, none of the 12 non-braces", () => {
    const r = decideWeek(patients, "2026-11-02");
    expect(r.friday).toBe("2026-11-06");
    expect(r.counts).toMatchObject({ toSend: 12, firstReminders: 12, secondReminders: 0, skippedBooked: 1, needsPerson: 1 });
    const byId = new Map(patients.map((p) => [p.id, p]));
    for (const d of r.decisions.filter((x) => x.status === "to_send")) {
      expect(byId.get(d.patientId)!.treatment).toBe("braces");
    }
  });

  it("Monday 2026-11-09: 24 to send, 12 first and 12 second reminders", () => {
    const r = decideWeek(patients, "2026-11-09");
    expect(r.counts).toMatchObject({ toSend: 24, firstReminders: 12, secondReminders: 12, skippedBooked: 1, needsPerson: 1 });
  });

  it("Monday 2026-11-16: 24 to send, and the 12 from 2026-11-06 need a person", () => {
    const r = decideWeek(patients, "2026-11-16");
    expect(r.counts.toSend).toBe(24);
    const noThird = r.decisions.filter((d) => d.reason === "no_booking_after_two_reminders");
    expect(noThird).toHaveLength(12);
    for (const d of noThird) expect(d.dueDate).toBe("2026-11-06");
    expect(r.counts.needsPerson).toBe(13); // the 12 plus the patient with no phone
  });

  it("running the same Monday twice gives the same answer", () => {
    expect(decideWeek(patients, "2026-11-09")).toEqual(decideWeek(patients, "2026-11-09"));
  });
});
