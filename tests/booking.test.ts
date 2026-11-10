import { describe, expect, it } from "vitest";
import { approve } from "../src/lib/approval";
import { bookSlot } from "../src/lib/booking";
import { freeTimes } from "../src/lib/calendar";
import { repliesWordingHash } from "../src/lib/replies-wording";
import { runWeek } from "../src/lib/run";
import { buildPatients, buildSlots } from "../src/lib/seed-data";
import { effectiveData, memoryState, type AppState } from "../src/lib/state";
import { wordingHash } from "../src/lib/wording";

const NOW = new Date("2026-11-03T08:00:00Z");

function freshState(opts: { reminders?: boolean; replies?: boolean } = {}): AppState {
  const patients = buildPatients();
  const state = memoryState({ patients, slots: buildSlots(patients) });
  if (opts.reminders !== false) approve(state.reminderApproval, "Receptionist", wordingHash());
  if (opts.replies !== false) approve(state.repliesApproval, "Receptionist", repliesWordingHash());
  return state;
}

const confirmations = (s: AppState) => s.messages.read().filter((m) => m.kind === "confirmation");

describe("F8 the receptionist books a slot (B8)", () => {
  it("books a free slot: the slot leaves the free list and the patient has a booking", () => {
    const state = freshState();
    expect(bookSlot(state, "P001", "2026-11-06T18:00", NOW)).toEqual({ ok: true, confirmation: "sent" });
    const eff = effectiveData(state);
    expect(freeTimes(eff.slots, "2026-11-06")).not.toContain("18:00");
    expect(eff.patients.find((p) => p.id === "P001")!.bookedSlotId).toBe("2026-11-06T18:00");
  });

  it("B8: booking a taken slot again is refused and sends nothing", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    const before = state.messages.read().length;
    expect(bookSlot(state, "P002", "2026-11-06T18:00", NOW)).toEqual({ ok: false, error: "slot_taken" });
    expect(state.messages.read()).toHaveLength(before);
    expect(state.bookings.read()).toHaveLength(1);
  });

  it("B8: a slot the dentist keeps (clinic-hold) cannot be booked", () => {
    const state = freshState();
    expect(bookSlot(state, "P001", "2026-11-06T17:20", NOW)).toEqual({ ok: false, error: "slot_taken" });
    expect(confirmations(state)).toHaveLength(0);
  });

  it("refuses a second booking for the same patient, a non-braces patient, and unknown ids", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    expect(bookSlot(state, "P001", "2026-11-06T18:20", NOW)).toEqual({ ok: false, error: "already_booked" });
    expect(bookSlot(state, "P013", "2026-11-06T18:20", NOW)).toEqual({ ok: false, error: "already_booked" }); // booked in the seed
    expect(bookSlot(state, "P051", "2026-11-06T18:20", NOW)).toEqual({ ok: false, error: "not_braces" });
    expect(bookSlot(state, "P999", "2026-11-06T18:20", NOW)).toEqual({ ok: false, error: "unknown_patient" });
    expect(bookSlot(state, "P002", "2026-12-04T18:20", NOW)).toEqual({ ok: false, error: "unknown_slot" });
  });

  it("two quick presses of Book give one booking and one confirmation", () => {
    const state = freshState();
    const a = bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    const b = bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(state.bookings.read()).toHaveLength(1);
    expect(confirmations(state)).toHaveLength(1);
  });

  it("B2: a booked patient is skipped by the next run", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    const out = runWeek(state, "2026-11-02", { now: NOW });
    if (!out.ok) throw new Error("should run");
    expect(out.summary.created).toBe(11);
    expect(out.summary.skippedBooked).toBe(2);
    expect(state.messages.read().some((m) => m.kind === "reminder" && m.patientId === "P001")).toBe(false);
  });
});

describe("F9 the booking confirmation (AC3, AC4, B8)", () => {
  it("AC3: is created at once, naming the first name, Liwan Dental, 'Friday 6 November' and '18:00' from the booking", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    const [c] = confirmations(state);
    expect(c.patientId).toBe("P001");
    expect(c.text.startsWith("Hello Sara")).toBe(true);
    expect(c.text).toContain("Liwan Dental");
    expect(c.text).toContain("Friday 6 November");
    expect(c.text).toContain("الجمعة 6 نوفمبر");
    expect(c.text).toContain("18:00");
    expect(c.text).not.toMatch(/AED|درهم/);
    expect(c.sendAt.startsWith("2026-11-03T08:00:00")).toBe(true); // straight away, not held to 17:00 to 22:00
  });

  it("AC3: that patient gets no further reminders", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    runWeek(state, "2026-11-02", { now: NOW });
    runWeek(state, "2026-11-09", { now: NOW });
    expect(state.messages.read().filter((m) => m.kind === "reminder" && m.patientId === "P001")).toHaveLength(0);
  });

  it("B8: no confirmation for a refused booking", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    bookSlot(state, "P002", "2026-11-06T18:00", NOW);
    expect(confirmations(state).map((m) => m.patientId)).toEqual(["P001"]);
  });

  it("with the replies wording not approved the booking saves, no confirmation is made, and the patient goes on the call list", () => {
    const state = freshState({ replies: false });
    expect(bookSlot(state, "P001", "2026-11-06T18:00", NOW)).toEqual({ ok: true, confirmation: "not_sent" });
    expect(state.bookings.read()).toHaveLength(1);
    expect(confirmations(state)).toHaveLength(0);
    expect(state.calls.read().filter((c) => c.open).map((c) => [c.patientId, c.reason])).toEqual([["P001", "confirmation_not_sent"]]);
  });

  it("a booking closes an open 'no booking' call list entry for that patient", () => {
    const state = freshState();
    runWeek(state, "2026-11-02", { now: NOW });
    runWeek(state, "2026-11-09", { now: NOW });
    runWeek(state, "2026-11-16", { now: NOW });
    expect(state.calls.read().some((c) => c.open && c.patientId === "P001" && c.reason === "no_booking_after_two_reminders")).toBe(true);
    bookSlot(state, "P001", "2026-11-13T18:00", NOW);
    expect(state.calls.read().some((c) => c.open && c.patientId === "P001")).toBe(false);
  });
});
