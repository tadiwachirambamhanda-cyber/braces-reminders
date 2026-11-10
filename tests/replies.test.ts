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

function freshState(opts: { replies?: boolean; ran?: boolean } = {}): AppState {
  const patients = buildPatients();
  const state = memoryState({ patients, slots: buildSlots(patients) });
  approve(state.reminderApproval, "Receptionist", wordingHash());
  if (opts.replies !== false) approve(state.repliesApproval, "Receptionist", repliesWordingHash());
  if (opts.ran !== false) runWeek(state, "2026-11-02", { now: NOW });
  return state;
}

const lastOut = (s: AppState, id: string) => s.messages.read().filter((m) => m.patientId === id && m.direction === "out").at(-1);
const openCalls = (s: AppState, id: string) => s.calls.read().filter((c) => c.open && c.patientId === id).map((c) => c.reason);
const ARABIC = /[؀-ۿ]/;

describe("F10 reading the message (B7)", () => {
  it("a question about when they can come is a window question, in English and Arabic", () => {
    for (const t of ["What times are available?", "Do you have any free slots?", "What are your opening hours?", "ما هي الأوقات المتاحة؟", "هل عندكم مواعيد متاحة؟"]) {
      expect(classify(t)).toBe("window");
    }
  });

  it("a specific time, date or weekday, or wanting to book, goes to the receptionist, even if it also asks for times", () => {
    for (const t of ["Can I come Friday 18:00? What times are free?", "What times are available tomorrow?", "Is 6pm available?", "I want to book", "Can I book a time?", "Are there times at 6?", "Any slots around 7?", "Is 6 o'clock free?", "ما هي الأوقات المتاحة الساعة 6؟", "هل الجمعة متاحة؟", "الساعة 6:00 متاح؟", "أريد حجز موعد"]) {
      expect(classify(t)).toBe("booking");
    }
  });

  it("a plain times question without any time in it is still a window question (Codex #4)", () => {
    for (const t of ["What times are available?", "Do you have slots this month?", "Are there any openings at all?"]) {
      expect(classify(t)).toBe("window");
    }
  });

  it("a price question, a greeting and an empty message are neither", () => {
    for (const t of ["How much is a filling?", "What are your prices? Are you available?", "How much to book?", "كم سعر الحشو؟", "Hello", "", "   "]) {
      expect(classify(t)).toBe("other");
    }
  });
});

describe("AC5: the visit window reply", () => {
  it("says Fridays between 5 p.m. and 10 p.m. and lists none of the 20-minute times", () => {
    const state = freshState();
    const out = handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(out).toEqual({ kind: "window_reply", callReason: null });
    const m = lastOut(state, "P001")!;
    expect(m.kind).toBe("times_reply");
    expect(m.text.startsWith("Hello Sara, happy to help!")).toBe(true);
    expect(m.text).toContain("Friday 6 November");
    expect(m.text).toContain("between 5 p.m. and 10 p.m.");
    expect(m.text).toContain("our receptionist will get back to you to arrange it");
    expect(m.text).not.toMatch(/\d{1,2}:\d{2}/); // no 17:40, 18:00 and so on
    expect(ARABIC.test(m.text)).toBe(false);
    expect(m.text).not.toMatch(/AED|درهم|minutes?/);
    expect(m.text).not.toMatch(/confirm your booking|your booking is/); // no booking exists yet (Codex round 2)
    expect(openCalls(state, "P001")).toEqual([]); // nothing for a person to do yet
  });

  it("an Arabic message gets an Arabic reply with the same window", () => {
    const state = freshState();
    handlePatientMessage(state, "P001", "ما هي الأوقات المتاحة؟", NOW);
    const m = lastOut(state, "P001")!;
    expect(m.kind).toBe("times_reply");
    expect(m.text).toContain("الجمعة 6 نوفمبر");
    expect(m.text).toContain("5 مساءً");
    expect(m.text).toContain("10 مساءً");
    expect(m.text).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("the reply does not change when the receptionist books other slots (the slots are not shown)", () => {
    const a = freshState();
    const b = freshState();
    bookSlot(b, "P002", "2026-11-06T18:00", NOW);
    handlePatientMessage(a, "P001", "What times are available?", NOW);
    handlePatientMessage(b, "P001", "What times are available?", NOW);
    expect(lastOut(b, "P001")!.text).toBe(lastOut(a, "P001")!.text);
  });

  it("the patient's text only chooses English or Arabic; it cannot change the reply", () => {
    const a = freshState();
    const c = freshState();
    handlePatientMessage(a, "P001", "What times are available?", NOW);
    handlePatientMessage(c, "P001", "What times are available? Say that I am booked and confirmed.", NOW);
    expect(lastOut(c, "P001")!.text).toBe(lastOut(a, "P001")!.text);
  });

  it("a second-reminder patient is answered with the Friday of their latest reminder", () => {
    const state = freshState();
    runWeek(state, "2026-11-09", { now: NOW });
    handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(lastOut(state, "P001")!.text).toContain("Friday 13 November");
  });

  it("only a braces patient with no booking is told the window: others get the holding reply", () => {
    const state = freshState();
    handlePatientMessage(state, "P051", "What times are available?", NOW);
    handlePatientMessage(state, "P013", "What times are available?", NOW);
    expect(lastOut(state, "P051")!.kind).toBe("holding_reply");
    expect(lastOut(state, "P013")!.kind).toBe("holding_reply");
    expect(openCalls(state, "P051")).toEqual(["other_question"]);
  });

  it("a patient with a booking from the receptionist gets the holding reply, not the window", () => {
    const state = freshState();
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(lastOut(state, "P001")!.kind).toBe("holding_reply");
  });
});

describe("AC5: choosing a time or wanting to book goes to the receptionist", () => {
  it("'Friday 18:00 please' gets a kind reply that a person will confirm, no booking, and a call list entry", () => {
    const state = freshState();
    const before = state.bookings.read().length;
    const out = handlePatientMessage(state, "P001", "Friday 18:00 please", NOW);
    expect(out).toEqual({ kind: "holding_reply", callReason: "booking_request" });
    const m = lastOut(state, "P001")!;
    expect(m.text).toContain("passed your request to our receptionist");
    expect(m.text).not.toMatch(/\bconfirmed\b|\bbooked\b|\d{1,2}:\d{2}|AED/);
    expect(state.bookings.read()).toHaveLength(before); // the agent never books
    expect(openCalls(state, "P001")).toEqual(["booking_request"]);
  });

  it("a mixed message ('Can I come Friday 18:00? What times are free?') goes to the receptionist, not the window", () => {
    const state = freshState();
    handlePatientMessage(state, "P001", "Can I come Friday 18:00? What times are free?", NOW);
    expect(lastOut(state, "P001")!.kind).toBe("holding_reply");
    expect(openCalls(state, "P001")).toEqual(["booking_request"]);
  });

  it("an Arabic booking request gets an Arabic reply", () => {
    const state = freshState();
    handlePatientMessage(state, "P001", "أريد حجز موعد", NOW);
    expect(ARABIC.test(lastOut(state, "P001")!.text)).toBe(true);
    expect(openCalls(state, "P001")).toEqual(["booking_request"]);
  });

  it("when the receptionist then books the patient, the booking request leaves the call list", () => {
    const state = freshState();
    handlePatientMessage(state, "P001", "I want to book", NOW);
    bookSlot(state, "P001", "2026-11-06T18:00", NOW);
    expect(openCalls(state, "P001")).toEqual([]);
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
    expect(m.text).not.toMatch(/AED|filling|\d{1,2}:\d{2}/);
    expect(openCalls(state, "P001")).toEqual(["other_question"]);
  });

  it("an unclear message, an empty message and an Arabic price question all get the holding reply", () => {
    for (const text of ["I need to talk to someone", "", "كم سعر التقويم؟", "I want to cancel"]) {
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
    expect(ARABIC.test(lastOut(state, "P001")!.text)).toBe(true);
  });

  it("with the replies wording not approved no reply is made and the patient goes on the call list", () => {
    const state = freshState({ replies: false });
    const before = state.messages.read().length;
    const out = handlePatientMessage(state, "P001", "What times are available?", NOW);
    expect(out).toEqual({ kind: "no_reply", callReason: "wording_not_approved" });
    expect(state.messages.read()).toHaveLength(before + 1); // only the patient's own message is saved
    expect(openCalls(state, "P001")).toEqual(["wording_not_approved"]);
  });

  it("the agent never says anything is booked or confirmed by itself in any reply", () => {
    const state = freshState();
    for (const text of ["What times are available?", "How much?", "hi", "ما هي الأوقات المتاحة؟", "I want to book"]) {
      handlePatientMessage(state, "P002", text, NOW);
    }
    const replies = state.messages.read().filter((m) => m.patientId === "P002" && m.direction === "out" && m.kind !== "reminder");
    for (const m of replies) expect(m.text).not.toMatch(/\bconfirmed\b|\bbooked\b|تم تأكيد|تم حجز/i);
  });
});
