import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApprovalError, approve, memoryStore } from "../src/lib/approval";
import { languageOf } from "../src/lib/language";
import { buildBookingRequestReply, buildConfirmation, buildHoldingReply, buildWindowReply, repliesWordingHash } from "../src/lib/replies-wording";
import { addCall, closeCallsForBooking, effectiveData, memoryState } from "../src/lib/state";
import { fileJsonStore, memoryJsonStore } from "../src/lib/store";
import { buildPatients, buildSlots } from "../src/lib/seed-data";
import { freeTimes } from "../src/lib/calendar";

const seed = () => {
  const patients = buildPatients();
  return { patients, slots: buildSlots(patients) };
};
const approvedReplies = () => {
  const s = memoryStore();
  approve(s, "Receptionist", repliesWordingHash());
  return s;
};

describe("stores", () => {
  it("update reads, changes and saves in one step", () => {
    const store = memoryJsonStore<number>([1]);
    const out = store.update((items) => ({ items: [...items, 2], result: items.length }));
    expect(out).toBe(1);
    expect(store.read()).toEqual([1, 2]);
  });

  it("a check inside update sees the earlier save (double press gives one record)", () => {
    const store = memoryJsonStore<string>();
    const press = () => store.update((items) => (items.includes("slot") ? { result: false } : { items: [...items, "slot"], result: true }));
    expect([press(), press()]).toEqual([true, false]);
    expect(store.read()).toEqual(["slot"]);
  });

  it("a file store keeps records, and a missing or damaged file is empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "braces-store-"));
    try {
      const store = fileJsonStore<string>(join(dir, "a", "x.json"), z.array(z.string()));
      expect(store.read()).toEqual([]);
      store.update((items) => ({ items: [...items, "one"], result: null }));
      expect(fileJsonStore<string>(join(dir, "a", "x.json"), z.array(z.string())).read()).toEqual(["one"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("language", () => {
  it("is Arabic when the message has Arabic letters, English otherwise, and mixed counts as Arabic", () => {
    expect(languageOf("What times are available?")).toBe("en");
    expect(languageOf("ما هي الأوقات المتاحة؟")).toBe("ar");
    expect(languageOf("Hello مرحبا")).toBe("ar");
  });
});

describe("seed plus bookings", () => {
  it("a booking takes the slot and gives the patient a booking, without changing the seed", () => {
    const state = memoryState(seed());
    state.bookings.update((items) => ({ items: [...items, { patientId: "P001", slotId: "2026-11-06T18:00", bookedAt: "x" }], result: null }));
    const eff = effectiveData(state);
    expect(eff.patients.find((p) => p.id === "P001")!.bookedSlotId).toBe("2026-11-06T18:00");
    expect(freeTimes(eff.slots, "2026-11-06")).not.toContain("18:00");
    expect(state.seed.patients.find((p) => p.id === "P001")!.bookedSlotId).toBeNull();
    expect(freeTimes(state.seed.slots, "2026-11-06")).toContain("18:00");
  });
});

describe("call list", () => {
  it("does not add the same patient and reason twice (even in a later week), and a booking closes no-booking entries", () => {
    const state = memoryState(seed());
    const now = new Date("2026-11-16T09:00:00Z");
    expect(addCall(state, { patientId: "P001", reason: "no_booking_after_two_reminders", week: "2026-11-16" }, now)).toBe(true);
    expect(addCall(state, { patientId: "P001", reason: "no_booking_after_two_reminders", week: "2026-11-16" }, now)).toBe(false);
    expect(addCall(state, { patientId: "P001", reason: "no_booking_after_two_reminders", week: "2026-11-23" }, now)).toBe(false);
    addCall(state, { patientId: "P001", reason: "other_question", week: null }, now);
    closeCallsForBooking(state, "P001");
    const open = state.calls.read().filter((c) => c.open).map((c) => c.reason);
    expect(open).toEqual(["other_question"]);
  });
});

describe("replies wording set (needs its own approval)", () => {
  it("B8: nothing is built before the replies wording is approved", () => {
    const none = memoryStore();
    expect(() => buildConfirmation({ firstName: "Sara", date: "2026-11-06", time: "18:00" }, none)).toThrow(ApprovalError);
    expect(() => buildWindowReply({ firstName: "Sara", lang: "en", date: "2026-11-06" }, none)).toThrow(ApprovalError);
    expect(() => buildBookingRequestReply({ firstName: "Sara", lang: "en" }, none)).toThrow(ApprovalError);
    expect(() => buildHoldingReply({ firstName: "Sara", lang: "en" }, none)).toThrow(ApprovalError);
  });

  it("an approval of the reminders wording does not approve the replies wording", () => {
    const store = memoryStore({ approvedBy: "R", approvedAt: "x", hash: "some-reminder-hash" });
    expect(() => buildHoldingReply({ firstName: "Sara", lang: "en" }, store)).toThrow(ApprovalError);
  });

  it("AC4, B8: the confirmation has the greeting, name, Liwan Dental, the day and time from the booking, English and Arabic, no price", () => {
    const r = buildConfirmation({ firstName: "Sara", date: "2026-11-06", time: "18:00" }, approvedReplies());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text.startsWith("Hello Sara")).toBe(true);
    expect(r.text).toContain("مرحباً Sara");
    expect(r.text).toContain("Liwan Dental");
    expect(r.text).toContain("Friday 6 November");
    expect(r.text).toContain("الجمعة 6 نوفمبر");
    expect(r.text.match(/18:00/g)).toHaveLength(2);
    expect(r.text).not.toMatch(/AED|درهم/);
  });

  it("an empty name gives ok false and no_name", () => {
    expect(buildConfirmation({ firstName: " ", date: "2026-11-06", time: "18:00" }, approvedReplies())).toEqual({ ok: false, reasons: ["no_name"] });
  });

  it("B7: the window reply says Fridays between 5 p.m. and 10 p.m. and lists NO 20-minute times, in the patient's language", () => {
    const en = buildWindowReply({ firstName: "Sara", lang: "en", date: "2026-11-06" }, approvedReplies());
    const ar = buildWindowReply({ firstName: "Sara", lang: "ar", date: "2026-11-06" }, approvedReplies());
    if (!en.ok || !ar.ok) throw new Error("should build");
    expect(en.text.startsWith("Hello Sara")).toBe(true);
    expect(en.text).toContain("Friday 6 November");
    expect(en.text).toContain("between 5 p.m. and 10 p.m.");
    expect(en.text).toContain("our receptionist will confirm your booking");
    expect(en.text).not.toMatch(/\d{1,2}:\d{2}/);
    expect(/[\u0600-\u06FF]/.test(en.text)).toBe(false);
    expect(ar.text).toContain("الجمعة 6 نوفمبر");
    expect(ar.text).toContain("5 مساءً");
    expect(ar.text).toContain("10 مساءً");
    expect(ar.text).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("an empty name cannot build a window reply or a booking-request reply", () => {
    expect(buildWindowReply({ firstName: "", lang: "en", date: "2026-11-06" }, approvedReplies())).toEqual({ ok: false, reasons: ["no_name"] });
    expect(buildBookingRequestReply({ firstName: "", lang: "en" }, approvedReplies())).toEqual({ ok: false, reasons: ["no_name"] });
  });

  it("the booking-request reply is warm, says a person will confirm, and has no price, no time and no booked claim", () => {
    const en = buildBookingRequestReply({ firstName: "Sara", lang: "en" }, approvedReplies());
    const ar = buildBookingRequestReply({ firstName: "Sara", lang: "ar" }, approvedReplies());
    if (!en.ok || !ar.ok) throw new Error("should build");
    expect(en.text).toContain("passed your request to our receptionist");
    expect(/[\u0600-\u06FF]/.test(ar.text)).toBe(true);
    expect(en.text).not.toMatch(/\d{1,2}:\d{2}|AED|\bbooked\b|\bconfirmed\b/);
  });

  it("the holding reply is warm, in the patient's language, and has no price, no time and no booked claim", () => {
    const en = buildHoldingReply({ firstName: "Sara", lang: "en" }, approvedReplies());
    const ar = buildHoldingReply({ firstName: "Sara", lang: "ar" }, approvedReplies());
    if (!en.ok || !ar.ok) throw new Error("should build");
    expect(en.text).toContain("passed it to our receptionist");
    expect(/[؀-ۿ]/.test(en.text)).toBe(false);
    expect(/[؀-ۿ]/.test(ar.text)).toBe(true);
    expect(en.text).not.toMatch(/\d{2}:\d{2}|AED/);
  });
});
