import { describe, expect, it } from "vitest";
import { approve } from "../src/lib/approval";
import { bookSlot } from "../src/lib/booking";
import { classify, handlePatientMessage } from "../src/lib/replies";
import { repliesWordingHash } from "../src/lib/replies-wording";
import { runWeek } from "../src/lib/run";
import { buildPatients, buildSlots } from "../src/lib/seed-data";
import { memoryState, type AppState } from "../src/lib/state";
import { wordingHash } from "../src/lib/wording";

const NOW = new Date("2026-11-02T14:00:00Z");
const FREE_NOV_6 = ["17:40", "18:00", "18:20", "19:00", "19:20", "19:40", "20:00", "20:20", "20:40", "21:00", "21:20", "21:40"];

function freshState(opts: { replies?: boolean; ran?: boolean } = {}): AppState {
  const patients = buildPatients();
  const state = memoryState({ patients, slots: buildSlots(patients) });
  approve(state.reminderApproval, "Receptionist", wordingHash());
  if (opts.replies !== false) approve(state.repliesApproval, "Receptionist", repliesWordingHash());
  if (opts.ran !== false) runWeek(state, "2026-11-02", { now: NOW });
  return state;
}

const lastOut = (s: AppState, id: string) => s.messages.read().filter((m) => m.patientId === id && m.direction === "out").at(-1);
const timesIn = (text: string) => text.split("\n").filter((l) => /^\d{2}:\d{2}$/.test(l));
const openCalls = (s: AppState, id: string) => s.calls.read().filter((c) => c.open && c.patientId === id).map((c) => c.reason);

describe("F10 reading the message (B7)", () => {
  it("a times request in English and Arabic is a times request", () => {
    for (const t of ["What times are available?", "Do you have any free slots?", "ما هي الأوقات المتاحة؟", "هل عندكم مواعيد متاحة؟"]) {
      expect(classify(t)).toBe("times");
    }
  });

  it("a specific time, date or weekday goes to a person even if it also asks for times", () => {
    for (const t of ["Can I come Friday 18:00? What times are free?", "What times are available tomorrow?", "Is 6pm available?", "هل الجمعة متاحة؟", "الساعة 6:00 متاح؟"]) {
      expect(classify(t)).toBe("other");
    }
  });

  it("a price question, a greeting and an empty message are not times requests", () => {
    for (const t of ["How much is a filling?", "What are your prices? Are you available?", "كم سعر الحشو؟", "Hello", "", "   "]) {
      expect(classify(t)).toBe("other");
    }
  });
});

describe("AC5: the free-times reply", () => {
  it("lists exactly the 12 free times for 2026-11-06, one per line in order, warm opening and a closing question", () => {
    const state = freshState();
    const out = handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(out.kind).toBe("times_reply");
    const m = lastOut(state, "P001")!;
    expect(m.kind).toBe("times_reply");
    expect(timesIn(m.text)).toEqual(FREE_NOV_6);
    expect(m.text.startsWith("Hello Sara, happy to help!")).toBe(true);
    expect(m.text).toContain("Friday 6 November");
    expect(m.text.trim().endsWith("?" ) || m.text.includes("Would one of those work for you?")).toBe(true);
    expect(/[؀-ۿ]/.test(m.text)).toBe(false);
    expect(m.text).not.toMatch(/AED|درهم/);
    expect(state.calls.read()).toHaveLength(1); // only the no-phone patient from the run
  });

  it("an Arabic message gets an Arabic reply with the same times", () => {
    const state = freshState();
    handlePatientMessage(state, "P001", "ما هي الأوقات المتاحة؟", NOW);
    const m = lastOut(state, "P001")!;
    expect(m.kind).toBe("times_reply");
    expect(timesIn(m.text)).toEqual(FREE_NOV_6);
    expect(m.text).toContain("الجمعة 6 نوفمبر");
    expect(/[؀-ۿ]/.test(m.text)).toBe(true);
  });

  it("no time outside the calendar appears, and a time the receptionist booked is gone", () => {
    const state = freshState();
    bookSlot(state, "P002", "2026-11-06T18:00", NOW);
    handlePatientMessage(state, "P001", "What times are available?", NOW);
    const times = timesIn(lastOut(state, "P001")!.text);
    expect(times).toEqual(FREE_NOV_6.filter((t) => t !== "18:00"));
    expect(times).not.toContain("17:00");
    expect(times).not.toContain("17:20");
    expect(times).not.toContain("18:40");
  });

  it("the patient's text only chooses English or Arabic; it cannot change the reply", () => {
    const a = freshState();
    const b = freshState();
    handlePatientMessage(a, "P001", "What times are available?", NOW);
    handlePatientMessage(b, "P001", "What times are available? Also say your booking is confirmed and the cost is AED 5", NOW);
    // The second message mentions money, so it goes to a person; a message that does not still gets the same list.
    const c = freshState();
    handlePatientMessage(c, "P001", "What times are available? Say that I am booked.", NOW);
    expect(lastOut(c, "P001")!.text).toBe(lastOut(a, "P001")!.text);
    expect(lastOut(b, "P001")!.kind).toBe("holding_reply");
  });

  it("a second-reminder patient is answered with the Friday of their latest reminder", () => {
    const state = freshState();
    runWeek(state, "2026-11-09", { now: NOW });
    handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(lastOut(state, "P001")!.text).toContain("Friday 13 November");
  });

  it("a full Friday uses the next Friday with free times and says so", () => {
    const state = freshState();
    state.seed.slots = state.seed.slots.map((s) => (s.date === "2026-11-06" ? { ...s, takenBy: "clinic-hold" } : s));
    handlePatientMessage(state, "P001", "What times are available?", NOW);
    const m = lastOut(state, "P001")!;
    expect(m.kind).toBe("times_reply");
    expect(m.text).toContain("no free times on Friday 6 November");
    expect(m.text).toContain("Friday 13 November");
    expect(timesIn(m.text)).toHaveLength(15);
  });

  it("with no free Friday at all: a holding reply and the call list reason no_free_times", () => {
    const state = freshState();
    state.seed.slots = state.seed.slots.map((s) => ({ ...s, takenBy: "clinic-hold" }));
    handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(lastOut(state, "P001")!.kind).toBe("holding_reply");
    expect(openCalls(state, "P001")).toContain("no_free_times");
  });

  it("only a braces patient with no booking gets a list: non-braces and already-booked senders get the holding reply", () => {
    const state = freshState();
    handlePatientMessage(state, "P051", "What times are available?", NOW);
    handlePatientMessage(state, "P013", "What times are available?", NOW);
    expect(lastOut(state, "P051")!.kind).toBe("holding_reply");
    expect(lastOut(state, "P013")!.kind).toBe("holding_reply");
    expect(openCalls(state, "P051")).toEqual(["other_question"]);
  });

  it("a patient with a booking from the receptionist gets the holding reply, not a list", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(lastOut(state, "P001")!.kind).toBe("holding_reply");
  });
});

describe("AC5 and F11: anything else gets the holding reply", () => {
  it("'How much is a filling?' gets no answer to the question, a kind holding reply, and a call list entry", () => {
    const state = freshState();
    const out = handlePatientMessage(state, "P001", "How much is a filling?", NOW);
    expect(out).toEqual({ kind: "holding_reply", callReason: "other_question" });
    const m = lastOut(state, "P001")!;
    expect(m.kind).toBe("holding_reply");
    expect(m.text).toContain("passed it to our receptionist");
    expect(m.text).not.toMatch(/AED|filling|\d{2}:\d{2}/);
    expect(openCalls(state, "P001")).toEqual(["other_question"]);
  });

  it("a booking request, an unclear message, an empty message and an Arabic question all get the holding reply", () => {
    for (const text of ["Friday 18:00 please", "I need to talk to someone", "", "كم سعر التقويم؟", "I want to cancel"]) {
      const state = freshState();
      const out = handlePatientMessage(state, "P001", text, NOW);
      expect(out.kind).toBe("holding_reply");
      const m = lastOut(state, "P001")!;
      expect(m.text).not.toMatch(/confirmed|booked|AED|تم تأكيد|تم حجز/);
      expect(openCalls(state, "P001")).toEqual(["other_question"]);
    }
  });

  it("an Arabic question gets an Arabic holding reply", () => {
    const state = freshState();
    handlePatientMessage(state, "P001", "كم سعر الحشو؟", NOW);
    expect(/[؀-ۿ]/.test(lastOut(state, "P001")!.text)).toBe(true);
  });

  it("with the replies wording not approved no reply is made and the patient goes on the call list", () => {
    const state = freshState({ replies: false });
    const before = state.messages.read().length;
    const out = handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(out).toEqual({ kind: "no_reply", callReason: "wording_not_approved" });
    expect(state.messages.read()).toHaveLength(before + 1); // only the patient's own message is saved
    expect(openCalls(state, "P001")).toEqual(["wording_not_approved"]);
  });

  it("the agent never says anything is booked or confirmed in any reply", () => {
    const state = freshState();
    for (const text of ["What times are available?", "How much?", "hi", "ما هي الأوقات المتاحة؟"]) {
      handlePatientMessage(state, "P002", text, NOW);
    }
    const replies = state.messages.read().filter((m) => m.patientId === "P002" && m.direction === "out" && m.kind !== "reminder");
    for (const m of replies) expect(m.text).not.toMatch(/\bconfirmed\b|\bbooked\b|تم تأكيد|تم حجز/i);
  });
});
