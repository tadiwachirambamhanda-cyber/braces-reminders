// The second wording set: the booking confirmation, the free-times reply and the holding reply.
// Fixed templates, no model. Approved separately from the reminders; nothing is built from it
// until the receptionist has approved it, and any change to the text needs a new approval.
import { createHash } from "node:crypto";
import { ApprovalError, isApproved, type ApprovalStore } from "./approval";
import type { Lang } from "./language";
import { OPENING_PROMPT, OPENING_RULES_VERSION } from "./opening-rules";
import { CLINIC_NAME, cleanFirstName, formatDateAr, formatDateEn } from "./wording";

// The price of a braces appointment (F14). The only price the agent states; the model never writes it.
export const BRACES_PRICE_AED = 300;

export const REPLY_TEMPLATES = {
  confirmation: {
    en: "Hello {name}, your braces visit at Liwan Dental is confirmed for {date} at {time}. We look forward to seeing you!",
    ar: "مرحباً {name}، تم تأكيد موعد التقويم الخاص بك في عيادة ليوان للأسنان (Liwan Dental) يوم {date} الساعة {time}. يسعدنا رؤيتك!",
  },
  // The reply to "What times are available?": the visit window only, never the 20-minute slots.
  windowReply: {
    en: "Hello {name}, happy to help! We see braces patients on {date} between 5 p.m. and 10 p.m. Just reply with the time that suits you and our receptionist will get back to you to arrange it.",
    ar: "مرحباً {name}، يسعدنا مساعدتك! نستقبل مرضى التقويم يوم {date} بين الساعة 5 مساءً و10 مساءً. ما عليك سوى إخبارنا بالوقت المناسب لك وستتواصل معك موظفة الاستقبال لترتيب الموعد.",
  },
  // When a patient names a time or wants to book: a person books it.
  bookingRequest: {
    en: "Thank you, {name}! I have passed your request to our receptionist, who will confirm your time with you shortly.",
    ar: "شكراً لك يا {name}! لقد حوّلت طلبك إلى موظفة الاستقبال وستؤكد لك الموعد قريباً.",
  },
  // When a braces patient asks what it costs: the one price, then how to come in.
  priceReply: {
    en: "Hello {name}, happy to help! A braces appointment at Liwan Dental costs AED {price}. If you would like to come in, just reply with the time that suits you and our receptionist will arrange it with you. For anything else, our receptionist will be glad to help.",
    ar: "مرحباً {name}، يسعدنا مساعدتك! تكلفة موعد التقويم في عيادة ليوان للأسنان {price} درهم. إذا رغبت بالحضور، ما عليك سوى إخبارنا بالوقت المناسب لك وستتواصل معك موظفة الاستقبال لترتيب الموعد. وإذا كان لديك أي استفسار آخر، فستسعد موظفة الاستقبال بمساعدتك.",
  },
  // Pain, bleeding or damage: short, sympathetic, a suggestion to come in, and a person will speak to them.
  urgentReply: {
    en: "I'm so sorry to hear that, {name}. If you can, please come to the clinic as soon as possible so a dentist can see you. I have also told our receptionist, who will speak to you shortly. If it is severe or cannot wait, please go to your nearest emergency department.",
    ar: "نأسف جداً لسماع ذلك يا {name}. إذا استطعت، يرجى زيارة العيادة في أقرب وقت ممكن ليتمكن الطبيب من فحصك. وقد أبلغت موظفة الاستقبال وستتواصل معك قريباً. وإذا كان الأمر شديداً أو لا يحتمل الانتظار، يرجى التوجه إلى أقرب قسم طوارئ.",
  },
  holding: {
    en: "Thank you for your message, {name}. I have passed it to our receptionist, who will reply to you shortly.",
    ar: "شكراً لرسالتك يا {name}. لقد حوّلتها إلى موظفة الاستقبال وستردّ عليك قريباً.",
  },
} as const;

export function repliesWordingHash(): string {
  return createHash("sha256")
    .update(JSON.stringify({ templates: REPLY_TEMPLATES, priceAed: BRACES_PRICE_AED, openingPrompt: OPENING_PROMPT, openingRulesVersion: OPENING_RULES_VERSION }))
    .digest("hex");
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

// The reply to a times question: Fridays between 5 p.m. and 10 p.m. No slot times are listed.
export function buildWindowReply(args: { firstName: string; lang: Lang; date: string }, approvals: ApprovalStore): ReplyResult {
  requireApproved(approvals);
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };
  const l = args.lang;
  const date = l === "en" ? formatDateEn(args.date) : formatDateAr(args.date);
  const text = fill(REPLY_TEMPLATES.windowReply[l], { name, date });

  const reasons: string[] = [];
  if ((text.match(TIME) ?? []).length > 0) reasons.push("lists_a_time"); // never 20-minute times
  if (l === "en" ? !text.includes("5 p.m.") || !text.includes("10 p.m.") : !text.includes("5 مساءً") || !text.includes("10 مساءً")) reasons.push("no_window");
  if (PRICE.test(text)) reasons.push("has_price");
  if (SAYS_BOOKED.test(text)) reasons.push("says_booked_or_confirmed");
  return reasons.length ? { ok: false, reasons } : { ok: true, text };
}

// Used when a patient names a time or wants to book (a person books it).
export function buildBookingRequestReply(args: { firstName: string; lang: Lang }, approvals: ApprovalStore): ReplyResult {
  requireApproved(approvals);
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };
  const text = fill(REPLY_TEMPLATES.bookingRequest[args.lang], { name });
  const reasons: string[] = [];
  if (PRICE.test(text)) reasons.push("has_price");
  if (SAYS_BOOKED.test(text)) reasons.push("says_booked_or_confirmed");
  if ((text.match(TIME) ?? []).length > 0) reasons.push("has_a_time");
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

const DIGITS = /[0-9٠-٩]+/g;

// The price reply: the one price, said exactly once, and no other number. Only for braces patients (checked by the caller).
export function buildPriceReply(args: { firstName: string; lang: Lang }, approvals: ApprovalStore): ReplyResult {
  requireApproved(approvals);
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };
  const text = fill(REPLY_TEMPLATES.priceReply[args.lang], { name, price: String(BRACES_PRICE_AED) });
  const reasons: string[] = [];
  const said = args.lang === "en" ? `AED ${BRACES_PRICE_AED}` : `${BRACES_PRICE_AED} درهم`;
  if (!text.includes(said)) reasons.push("price_missing");
  if ((text.match(DIGITS) ?? []).join(",") !== String(BRACES_PRICE_AED)) reasons.push("other_number");
  if (SAYS_BOOKED.test(text)) reasons.push("says_booked_or_confirmed");
  return reasons.length ? { ok: false, reasons } : { ok: true, text };
}

// The urgent reply: no number, no price, no claim of a booking.
export function buildUrgentReply(args: { firstName: string; lang: Lang }, approvals: ApprovalStore): ReplyResult {
  requireApproved(approvals);
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };
  const text = fill(REPLY_TEMPLATES.urgentReply[args.lang], { name });
  const reasons: string[] = [];
  if (DIGITS.test(text)) reasons.push("has_a_number");
  DIGITS.lastIndex = 0;
  if (PRICE.test(text)) reasons.push("has_price");
  if (SAYS_BOOKED.test(text)) reasons.push("says_booked_or_confirmed");
  return reasons.length ? { ok: false, reasons } : { ok: true, text };
}
