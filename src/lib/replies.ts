// What the agent does when a patient writes in the phone simulator. It answers one thing:
// when braces visits happen (Fridays, 5 p.m. to 10 p.m.). It never lists the 20-minute slots;
// those are for the receptionist's booking screen. If a patient names a time or wants to book,
// or asks anything else, a kind holding reply is sent and a person takes over. Code decides;
// the patient's text is read for meaning and never used as instructions.
import { isApproved } from "./approval";
import { languageOf, type Lang } from "./language";
import type { JevIntent } from "./jev";
import { insertOpening } from "./opening-rules";
import { isBraces } from "./patients";
import { buildBookingRequestReply, buildHoldingReply, buildWindowReply, repliesWordingHash } from "./replies-wording";
import { addCall, effectiveData, newId, type AppState, type CallReason, type Message } from "./state";

// A specific time, date or weekday: the patient is choosing a slot, so a person answers.
const SPECIFIC =
  /\b\d{1,2}\s?[:.]\s?\d{2}\b|\b\d{1,2}\s?(?:am|pm|a\.m\.|p\.m\.)(?!\w)|\b(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?\b|\b(?:today|tomorrow|tonight|next week|this week)\b|\b\d{1,2}(?:st|nd|rd|th)\b|\b(?:january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b|\b(?:at|around|by|after|before|until|till)\s+\d{1,2}\b|\b\d{1,2}\s*o'?clock\b|الساعة\s*[0-9٠-٩]{1,2}|[0-9٠-٩]{1,2}\s*[:٫]\s*[0-9٠-٩]{2}|الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|السبت|اليوم|غدا|غداً|بكرة|الأسبوع القادم|الاسبوع القادم/i;

// Wanting to book: a person books it.
const BOOK_Q =
  /\b(?:book|booking|reserve|reservation)\b|(?<![؀-ۿ])(?:احجز|أحجز|احجزوا|حجز|موعدي|موعد)(?![؀-ۿ])/iu;

// A question about money: never answered by the agent.
const PRICE_Q =
  /\b(?:price|prices|cost|costs|how much|fee|fees|aed|pay|payment|discount|free of charge)\b|\bis (?:it|that|this) free\b|(?<![؀-ۿ])(?:كم|سعر|أسعار|اسعار|تكلفة|تكاليف|ثمن|رسوم|خصم)(?![؀-ۿ])/iu;

// Asking when they can come.
const TIMES_Q =
  /\b(?:times?|available|availability|free|slots?|openings?|when can (?:i|we)|what days?|what hours?|opening hours)\b|متاح|متاحة|متوفر|متوفرة|الأوقات|الاوقات|أوقات|مواعيد|المواعيد|فاضي|فاضية/i;

export type Intent = "window" | "booking" | "other";

export function classify(text: string): Intent {
  if (PRICE_Q.test(text)) return "other"; // money is never answered
  if (SPECIFIC.test(text) || BOOK_Q.test(text)) return "booking"; // a person books it, even if it also asks for times
  if (TIMES_Q.test(text)) return "window";
  return "other";
}

// Code decides, Jev advises. A named time, a wish to book or a money question always goes to the
// receptionist, whatever Jev says. Jev can add "this is a general times question" or "this is
// urgent", and a confident Jev "no" stops a window reply. Without a confident Jev, today's keywords decide.
export function decideIntent(text: string, jev: JevIntent | null): { intent: Intent; urgent: boolean } {
  if (jev === "pain_or_urgent") return { intent: "other", urgent: true };
  const kw = classify(text);
  if (kw === "booking") return { intent: "booking", urgent: false };
  if (PRICE_Q.test(text)) return { intent: "other", urgent: false };
  if (jev === null) return { intent: kw, urgent: false };
  if (jev === "times_question") return { intent: "window", urgent: false };
  if (jev === "booking_request") return { intent: "booking", urgent: false };
  return { intent: "other", urgent: false };
}

export type AiInfo = NonNullable<Message["ai"]>;
export type ReplyOptions = {
  jevIntent?: JevIntent | null; // a confident Jev answer, if any
  opening?: string | null; // a checked AI sentence, if any
  ai?: Omit<AiInfo, "opening">; // what to record next to the reply
};

export type ReplyOutcome = { kind: "window_reply" | "holding_reply" | "no_reply"; callReason: CallReason | null };

export function handlePatientMessage(
  state: AppState,
  patientId: string,
  text: string,
  now: Date = new Date(),
  opts: ReplyOptions = {},
): ReplyOutcome {
  const sendAt = now.toISOString().slice(0, 19) + "+00:00";
  const save = (m: Pick<Message, "direction" | "kind" | "text"> & { ai?: Message["ai"] }) =>
    state.messages.update((items) => ({
      items: [
        ...items,
        { id: newId("M"), patientId, week: null, reminderNumber: null, visitDate: null, visitDueDate: null, sendAt, ...m },
      ],
      result: null,
    }));
  const call = (reason: CallReason): ReplyOutcome => {
    addCall(state, { patientId, reason, week: null }, now);
    return { kind: "no_reply", callReason: reason };
  };

  save({ direction: "in", kind: "patient_message", text });

  // Nothing is built from wording that has not been approved: no reply, a person is told.
  if (!isApproved(state.repliesApproval, repliesWordingHash())) return call("wording_not_approved");

  const { patients } = effectiveData(state);
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return { kind: "no_reply", callReason: null };
  const lang: Lang = languageOf(text);

  const opening = opts.opening ?? null;
  const aiFor = (withOpening: boolean): Message["ai"] =>
    opts.ai ? { ...opts.ai, opening: withOpening && opening ? "ai" : "fixed" } : undefined;
  const decided = decideIntent(text, opts.jevIntent ?? null);

  const hold = (reason: CallReason, booking: boolean, withOpening = true): ReplyOutcome => {
    const args = { firstName: patient.firstName, lang };
    const built = booking ? buildBookingRequestReply(args, state.repliesApproval) : buildHoldingReply(args, state.repliesApproval);
    if (!built.ok) return call("reply_failed_checks");
    const useOpening = withOpening && opening !== null;
    save({ direction: "out", kind: "holding_reply", text: useOpening ? insertOpening(built.text, opening) : built.text, ai: aiFor(useOpening) });
    addCall(state, { patientId, reason, week: null }, now);
    return { kind: "holding_reply", callReason: reason };
  };

  // Urgent: the normal holding reply with no AI sentence, and the call list shows it first.
  if (decided.urgent) return hold("urgent_message", false, false);
  const intent = decided.intent;
  if (intent === "booking") return hold("booking_request", true);
  // Only a braces patient with no booking is told the visit window (B1, B7).
  if (intent !== "window" || !isBraces(patient) || patient.bookedSlotId !== null) return hold("other_question", false);

  // The Friday their visit is about: the latest reminder's Friday, otherwise their due Friday.
  const latest = state.messages
    .read()
    .filter((m) => m.patientId === patientId && m.kind === "reminder" && m.visitDate)
    .sort((a, b) => b.sendAt.localeCompare(a.sendAt))[0];
  const date = latest?.visitDate ?? patient.dueDate;

  const built = buildWindowReply({ firstName: patient.firstName, lang, date }, state.repliesApproval);
  if (!built.ok) return hold("reply_failed_checks", false); // a failed check gives the holding reply
  save({ direction: "out", kind: "times_reply", text: opening ? insertOpening(built.text, opening) : built.text, ai: aiFor(true) });
  return { kind: "window_reply", callReason: null };
}
