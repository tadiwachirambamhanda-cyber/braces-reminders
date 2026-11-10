import { describe, expect, it } from "vitest";
import { approve } from "../src/lib/approval";
import { runWeek } from "../src/lib/run";
import { buildPatients, buildSlots } from "../src/lib/seed-data";
import { memoryState, type AppState } from "../src/lib/state";
import { wordingHash } from "../src/lib/wording";

const NOW = new Date("2026-11-02T05:00:00Z");

function freshState(approved = true): AppState {
  const patients = buildPatients();
  const state = memoryState({ patients, slots: buildSlots(patients) });
  if (approved) approve(state.reminderApproval, "Receptionist", wordingHash());
  return state;
}

const run = (state: AppState, monday: string, runAt?: number) => {
  const out = runWeek(state, monday, { now: NOW, runAt });
  if (!out.ok) throw new Error(out.reason);
  return out.summary;
};

const reminders = (state: AppState) => state.messages.read().filter((m) => m.kind === "reminder");
const calls = (state: AppState) => state.calls.read().filter((c) => c.open);

describe("approval gate on the run", () => {
  it("B4: with the wording not approved nothing is created", () => {
    const state = freshState(false);
    const out = runWeek(state, "2026-11-02", { now: NOW });
    expect(out).toEqual({ ok: false, reason: "wording_not_approved" });
    expect(state.messages.read()).toHaveLength(0);
    expect(state.runs.read()).toHaveLength(0);
  });
});

describe("AC1: Monday 2026-11-02", () => {
  it("creates exactly 12 reminders, none to non-braces or other weeks, each in the 17:00 to 22:00 window", () => {
    const state = freshState();
    const s = run(state, "2026-11-02");
    expect(s).toMatchObject({ created: 12, firstReminders: 12, secondReminders: 0, skippedBooked: 1, needsPerson: 1 });
    const patients = new Map(state.seed.patients.map((p) => [p.id, p]));
    for (const m of reminders(state)) {
      const p = patients.get(m.patientId)!;
      expect(p.treatment).toBe("braces");
      expect(p.dueDate).toBe("2026-11-06");
      expect(m.visitDate).toBe("2026-11-06");
      const mins = Number(m.sendAt.slice(11, 13)) * 60 + Number(m.sendAt.slice(14, 16));
      expect(mins).toBeGreaterThanOrEqual(17 * 60);
      expect(mins).toBeLessThan(22 * 60);
      expect(m.text).toContain("Friday 6 November");
    }
  });

  it("gives the booked patient skipped_booked and the no-phone patient needs_person with nothing sent", () => {
    const state = freshState();
    run(state, "2026-11-02");
    const records = state.runs.read();
    expect(records.find((r) => r.patientId === "P013")).toMatchObject({ status: "skipped_booked" });
    expect(records.find((r) => r.patientId === "P014")).toMatchObject({ status: "needs_person", reason: "no_phone" });
    expect(reminders(state).some((m) => m.patientId === "P013" || m.patientId === "P014")).toBe(false);
    expect(calls(state).map((c) => c.reason)).toEqual(["no_phone"]);
  });

  it("saves one run record for every patient looked at, with status and reason", () => {
    const state = freshState();
    run(state, "2026-11-02");
    expect(state.runs.read()).toHaveLength(14);
  });

  it("saves messages with first names and ids only, never a phone number", () => {
    const state = freshState();
    run(state, "2026-11-02");
    expect(JSON.stringify(state.messages.read())).not.toMatch(/\+971/);
  });
});

describe("AC2 and B3: repeat runs and the second reminder", () => {
  it("running the same week twice adds nothing the second time", () => {
    const state = freshState();
    run(state, "2026-11-02");
    const second = run(state, "2026-11-02");
    expect(second.created).toBe(0);
    expect(second.alreadySent).toBe(12);
    expect(reminders(state)).toHaveLength(12);
  });

  it("two quick presses of Run this week give one set of reminders", () => {
    const state = freshState();
    run(state, "2026-11-02");
    run(state, "2026-11-02");
    expect(new Set(reminders(state).map((m) => m.patientId)).size).toBe(reminders(state).length);
  });

  it("Monday 2026-11-09 creates 24: 12 first reminders and 12 second reminders", () => {
    const state = freshState();
    run(state, "2026-11-02");
    const s = run(state, "2026-11-09");
    expect(s).toMatchObject({ created: 24, firstReminders: 12, secondReminders: 12 });
    const second = reminders(state).filter((m) => m.reminderNumber === 2);
    expect(second.every((m) => m.visitDate === "2026-11-13")).toBe(true);
    expect(second[0].text).toContain("haven't got your booking yet");
  });

  it("B6: on 2026-11-16 the 12 from 2026-11-06 get no third reminder and go to the call list", () => {
    const state = freshState();
    run(state, "2026-11-02");
    run(state, "2026-11-09");
    const s = run(state, "2026-11-16");
    expect(s.created).toBe(24);
    const noThird = calls(state).filter((c) => c.reason === "no_booking_after_two_reminders");
    expect(noThird).toHaveLength(12);
    for (const c of noThird) expect(reminders(state).filter((m) => m.patientId === c.patientId)).toHaveLength(2);
  });

  it("B3: no patient ever has more than two reminders, even if weeks are run again", () => {
    const state = freshState();
    for (const w of ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-16", "2026-11-09"]) run(state, w);
    const perPatient = new Map<string, number>();
    for (const m of reminders(state)) perPatient.set(m.patientId, (perPatient.get(m.patientId) ?? 0) + 1);
    expect(Math.max(...perPatient.values())).toBeLessThanOrEqual(2);
  });
});

describe("AC3 and the call list when a Monday is skipped", () => {
  it("missed_reminders, not a false 'two reminders', if 2026-11-09 was never run", () => {
    const state = freshState();
    run(state, "2026-11-02");
    run(state, "2026-11-16");
    const reasons = calls(state).filter((c) => c.week === "2026-11-16").map((c) => c.reason);
    expect(reasons.filter((r) => r === "missed_reminders")).toHaveLength(12);
    expect(reasons).not.toContain("no_booking_after_two_reminders");
  });

  it("a patient with no phone is on the call list once, not once per week", () => {
    const state = freshState();
    run(state, "2026-11-02");
    run(state, "2026-11-09");
    run(state, "2026-11-16");
    expect(calls(state).filter((c) => c.patientId === "P014")).toHaveLength(1);
  });

  it("does not add the same call list entry twice on a repeat run", () => {
    const state = freshState();
    run(state, "2026-11-02");
    run(state, "2026-11-02");
    expect(calls(state).filter((c) => c.reason === "no_phone")).toHaveLength(1);
  });

  it("a run after 22:00 on the Monday schedules for 17:00 the next day", () => {
    const state = freshState();
    run(state, "2026-11-02", 22 * 60 + 5);
    expect(reminders(state).every((m) => m.sendAt.startsWith("2026-11-03T"))).toBe(true);
  });
});
