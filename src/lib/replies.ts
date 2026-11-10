// What the agent does when a patient writes in the phone simulator. It only ever answers one
// thing: the free braces times (B7). Everything else gets a kind holding reply and goes to a
// person. Code decides; the patient's text is read for meaning and never used as instructions.
import { isApproved } from "./approval";
import { freeTimes } from "./calendar";
import { languageOf, type Lang } from "./language";
import { isBraces } from "./patients";
import { buildHoldingReply, buildTimesReply, repliesWordingHash } from "./replies-wording";
import { addCall, effectiveData, newId, type AppState, type CallReason, type Message } from "./state";

// A specific time, date or weekday: this is a booking request, so a person answers.
const SPECIFIC =
  /\b\d{1,2}\s?[:.]\s?\d{2}\b|\b\d{1,2}\s?(?:am|pm)\b|\b(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?\b|\b(?:today|tomorrow|tonight|next week|this week)\b|\b\d{1,2}(?:st|nd|rd|th)\b|\b(?:january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b|[0-9٠-٩]{1,2}\s*[:٫]\s*[0-9٠-٩]{2}|الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|السبت|اليوم|غدا|غداً|بكرة|الأسبوع القادم|الاسبوع القادم/i;

// A question about money: never answered by the agent.
const PRICE_Q =
  /\b(?:price|prices|cost|costs|how much|fee|fees|aed|pay|payment|discount|free of charge)\b|\bis (?:it|that|this) free\b|(?<![\u0600-\u06FF])(?:كم|سعر|أسعار|اسعار|تكلفة|تكاليف|ثمن|رسوم|خصم)(?![\u0600-\u06FF])/iu;

// Asking what times are available.
const TIMES_Q =
  /\b(?:times?|available|availability|free|slots?|openings?|when can (?:i|we)|what days?)\b|متاح|متاحة|متوفر|متوفرة|الأوقات|الاوقات|أوقات|مواعيد|المواعيد|فاضي|فاضية/i;

export type Intent = "times" | "other";

export function classify(text: string): Intent {
  if (SPECIFIC.test(text)) return "other"; // 1: a specific time, date or weekday goes to a person first
  if (PRICE_Q.test(text)) return "other";
  if (TIMES_Q.test(text)) return "times"; // 2: a times request
  return "other"; // 3: anything else
}

export type ReplyOutcome = { kind: "times_reply" | "holding_reply" | "no_reply"; callReason: CallReason | null };

export function handlePatientMessage(state: AppState, patientId: string, text: string, now: Date = new Date()): ReplyOutcome {
  const sendAt = now.toISOString().slice(0, 19) + "+00:00";
  const save = (m: Pick<Message, "direction" | "kind" | "text">) =>
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

  const { patients, slots } = effectiveData(state);
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return { kind: "no_reply", callReason: null };
  const lang: Lang = languageOf(text);

  const hold = (reason: CallReason): ReplyOutcome => {
    const built = buildHoldingReply({ firstName: patient.firstName, lang }, state.repliesApproval);
    if (!built.ok) return call("reply_failed_checks");
    save({ direction: "out", kind: "holding_reply", text: built.text });
    addCall(state, { patientId, reason, week: null }, now);
    return { kind: "holding_reply", callReason: reason };
  };

  // Only a braces patient with no booking is offered times (B1, B7).
  if (classify(text) !== "times" || !isBraces(patient) || patient.bookedSlotId !== null) return hold("other_question");

  // The Friday their visit is about: the latest reminder's Friday, otherwise their due Friday.
  const latest = state.messages
    .read()
    .filter((m) => m.patientId === patientId && m.kind === "reminder" && m.visitDate)
    .sort((a, b) => b.sendAt.localeCompare(a.sendAt))[0];
  const friday = latest?.visitDate ?? patient.dueDate;

  let date = friday;
  let times = freeTimes(slots, date);
  let nextDate: string | undefined;
  if (times.length === 0) {
    const later = [...new Set(slots.map((s) => s.date))].sort().filter((d) => d > friday);
    const found = later.find((d) => freeTimes(slots, d).length > 0);
    if (!found) return hold("no_free_times");
    nextDate = found;
    times = freeTimes(slots, found);
  }

  const built = buildTimesReply({ firstName: patient.firstName, lang, date, times, nextDate }, state.repliesApproval);
  if (!built.ok) return hold("reply_failed_checks"); // a failed check gives the holding reply
  save({ direction: "out", kind: "times_reply", text: built.text });
  return { kind: "times_reply", callReason: null };
}
