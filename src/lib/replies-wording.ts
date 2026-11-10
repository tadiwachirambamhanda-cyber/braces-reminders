// The second wording set: the booking confirmation, the free-times reply and the holding reply.
// Fixed templates, no model. Approved separately from the reminders; nothing is built from it
// until the receptionist has approved it, and any change to the text needs a new approval.
import { createHash } from "node:crypto";
import { ApprovalError, isApproved, type ApprovalStore } from "./approval";
import type { Lang } from "./language";
import { CLINIC_NAME, cleanFirstName, formatDateAr, formatDateEn } from "./wording";

export const REPLY_TEMPLATES = {
  confirmation: {
    en: "Hello {name}, your braces visit at Liwan Dental is confirmed for {date} at {time}. We look forward to seeing you!",
    ar: "مرحباً {name}، تم تأكيد موعد التقويم الخاص بك في عيادة ليوان للأسنان (Liwan Dental) يوم {date} الساعة {time}. يسعدنا رؤيتك!",
  },
  timesOpening: {
    en: "Hello {name}, happy to help! Here are the free braces times on {date}:",
    ar: "مرحباً {name}، يسعدنا مساعدتك! هذه الأوقات المتاحة للتقويم يوم {date}:",
  },
  timesOpeningNext: {
    en: "Hello {name}, we have no free times on {date}, but here are the free braces times on {date2}:",
    ar: "مرحباً {name}، لا توجد أوقات متاحة يوم {date}، لكن هذه الأوقات المتاحة للتقويم يوم {date2}:",
  },
  timesClosing: {
    en: "Would one of those work for you? Our receptionist will confirm your booking.",
    ar: "هل يناسبك أحد هذه الأوقات؟ ستقوم موظفة الاستقبال بتأكيد حجزك.",
  },
  holding: {
    en: "Thank you for your message, {name}. I have passed it to our receptionist, who will reply to you shortly.",
    ar: "شكراً لرسالتك يا {name}. لقد حوّلتها إلى موظفة الاستقبال وستردّ عليك قريباً.",
  },
} as const;

export function repliesWordingHash(): string {
  return createHash("sha256").update(JSON.stringify(REPLY_TEMPLATES)).digest("hex");
}

export type ReplyResult = { ok: true; text: string } | { ok: false; reasons: string[] };

const PRICE = /AED|درهم|\bdirhams?\b|\bprice|\$/i;
// The agent never says it booked or confirmed anything, except in the confirmation itself.
const SAYS_BOOKED = /\b(?:confirmed|booked)\b|تم تأكيد|تم حجز/i;
const TIME = /\b\d{2}:\d{2}\b/g;

function fill(t: string, values: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function requireApproved(approvals: ApprovalStore) {
  if (!isApproved(approvals, repliesWordingHash())) {
    throw new ApprovalError("The replies wording has not been approved");
  }
}

export function buildConfirmation(
  args: { firstName: string; date: string; time: string },
  approvals: ApprovalStore,
): ReplyResult {
  requireApproved(approvals);
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };
  const t = REPLY_TEMPLATES.confirmation;
  const text = `${fill(t.en, { name, date: formatDateEn(args.date), time: args.time })}\n\n${fill(t.ar, { name, date: formatDateAr(args.date), time: args.time })}`;

  const reasons: string[] = [];
  if (!text.includes(CLINIC_NAME)) reasons.push("no_clinic_name");
  if (!text.includes(formatDateEn(args.date)) || !text.includes(formatDateAr(args.date))) reasons.push("no_date");
  const times = text.match(TIME) ?? [];
  if (times.length === 0 || times.some((x) => x !== args.time)) reasons.push("wrong_time");
  if (PRICE.test(text)) reasons.push("has_price");
  return reasons.length ? { ok: false, reasons } : { ok: true, text };
}

// The free-times reply: a warm opening, one time per line, a closing question. One language.
export function buildTimesReply(
  args: { firstName: string; lang: Lang; date: string; times: string[]; nextDate?: string },
  approvals: ApprovalStore,
): ReplyResult {
  requireApproved(approvals);
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };
  if (args.times.length === 0) return { ok: false, reasons: ["no_times"] };
  const l = args.lang;
  const dateFor = (d: string) => (l === "en" ? formatDateEn(d) : formatDateAr(d));
  const opening = args.nextDate
    ? fill(REPLY_TEMPLATES.timesOpeningNext[l], { name, date: dateFor(args.date), date2: dateFor(args.nextDate) })
    : fill(REPLY_TEMPLATES.timesOpening[l], { name, date: dateFor(args.date) });
  const text = `${opening}\n${args.times.join("\n")}\n\n${REPLY_TEMPLATES.timesClosing[l]}`;

  const reasons: string[] = [];
  // Every time in the reply must be exactly one of the given free times, in order, and nothing else.
  const inText = text.match(TIME) ?? [];
  if (inText.length !== args.times.length || inText.some((x, i) => x !== args.times[i])) reasons.push("times_not_from_calendar");
  if (PRICE.test(text)) reasons.push("has_price");
  if (SAYS_BOOKED.test(text)) reasons.push("says_booked_or_confirmed");
  return reasons.length ? { ok: false, reasons } : { ok: true, text };
}

export function buildHoldingReply(args: { firstName: string; lang: Lang }, approvals: ApprovalStore): ReplyResult {
  requireApproved(approvals);
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };
  const text = fill(REPLY_TEMPLATES.holding[args.lang], { name });
  const reasons: string[] = [];
  if (PRICE.test(text)) reasons.push("has_price");
  if (SAYS_BOOKED.test(text)) reasons.push("says_booked_or_confirmed");
  if ((text.match(TIME) ?? []).length > 0) reasons.push("has_a_time");
  return reasons.length ? { ok: false, reasons } : { ok: true, text };
}
