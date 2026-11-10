// The reminder wording, in English and Arabic, as plain fixed templates. No model writes it.
// The receptionist approves this wording once; if any text below changes, the approval no
// longer matches and no reminder can be built until it is approved again.
import { createHash } from "node:crypto";
import { ApprovalError, isApproved, type ApprovalStore } from "./approval";
import { isValidDate } from "./dates";

export const CLINIC_NAME = "Liwan Dental";

export type ReminderNumber = 1 | 2;

// {name} and {date} are the only two places that change.
export const TEMPLATES: Record<ReminderNumber, { en: string; ar: string }> = {
  1: {
    en: 'Hello {name}, this is Liwan Dental. Your monthly braces check is due on {date}. We would love to see you! Would you like to book your visit? Just reply "What times are available?" and we will send you the free times.',
    ar: "مرحباً {name}، معك عيادة ليوان للأسنان (Liwan Dental). موعد مراجعة التقويم الشهرية الخاصة بك هو يوم {date}، ويسعدنا رؤيتك! هل ترغب بحجز موعدك؟ ما عليك سوى الرد بـ «ما هي الأوقات المتاحة؟» وسنرسل لك الأوقات المتاحة.",
  },
  2: {
    en: 'Hello {name}, it\'s Liwan Dental again. A friendly reminder that your monthly braces check is due on {date}, and we haven\'t got your booking yet. Just reply "What times are available?" and we will send you the free times.',
    ar: "مرحباً {name}، معك عيادة ليوان للأسنان (Liwan Dental) مرة أخرى. تذكير ودّي بأن موعد مراجعة التقويم الشهرية الخاصة بك هو يوم {date}، ولم يصلنا حجزك بعد. ما عليك سوى الرد بـ «ما هي الأوقات المتاحة؟» وسنرسل لك الأوقات المتاحة.",
  },
};

// The fingerprint of the whole reminder wording set. The approval is tied to this.
export function wordingHash(): string {
  return createHash("sha256").update(JSON.stringify(TEMPLATES)).digest("hex");
}

// ---------------------------------------------------------------------------
// Dates: fixed name tables (no locale formatting), Western digits.
// ---------------------------------------------------------------------------

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function parts(date: string) {
  if (!isValidDate(date)) throw new Error(`not a valid date: ${date}`);
  const d = new Date(`${date}T00:00:00Z`);
  return { day: d.getUTCDay(), dom: d.getUTCDate(), month: d.getUTCMonth() };
}

export function formatDateEn(date: string): string {
  const p = parts(date);
  return `${DAYS_EN[p.day]} ${p.dom} ${MONTHS_EN[p.month]}`;
}

export function formatDateAr(date: string): string {
  const p = parts(date);
  return `${DAYS_AR[p.day]} ${p.dom} ${MONTHS_AR[p.month]}`;
}

// ---------------------------------------------------------------------------
// The first name goes in as data only.
// ---------------------------------------------------------------------------

const MAX_NAME_LENGTH = 30;

export function cleanFirstName(raw: string): string {
  // Remove control and direction characters (line breaks, bidi marks), then collapse spaces.
  let name = raw.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim();
  if (name.length > MAX_NAME_LENGTH) {
    const cut = name.slice(0, MAX_NAME_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    name = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
  }
  return name;
}

// ---------------------------------------------------------------------------
// B4: checks run on every built reminder.
// ---------------------------------------------------------------------------

export type ReminderResult = { ok: true; text: string } | { ok: false; reasons: string[] };

const PRICE = /AED|درهم|\bdirhams?\b|\bprice|\$/i;
const SAYS_BOOKED = /\b(?:confirmed|booked)\b|your appointment is|تم تأكيد|تم حجز/i;

export function checkReminder(text: string, firstName: string, visitDate: string): string[] {
  const failures: string[] = [];
  if (!text.startsWith(`Hello ${firstName}`) || !text.includes(`مرحباً ${firstName}`)) failures.push("no_greeting_and_name");
  if (!text.includes(CLINIC_NAME)) failures.push("no_clinic_name");
  if (!text.includes(formatDateEn(visitDate)) || !text.includes(formatDateAr(visitDate))) failures.push("no_date");
  if (!/\bbraces\b/.test(text)) failures.push("no_braces_word");
  if (!text.includes("تقويم")) failures.push("no_arabic_braces_word");
  if (!/[؀-ۿ]/.test(text)) failures.push("no_arabic");
  if (PRICE.test(text)) failures.push("has_price");
  if (SAYS_BOOKED.test(text)) failures.push("says_booked_or_confirmed");
  return failures;
}

// ---------------------------------------------------------------------------
// Build a reminder. Refuses to run unless this exact wording has been approved.
// ---------------------------------------------------------------------------

export function buildReminder(
  args: { firstName: string; reminderNumber: ReminderNumber; visitDate: string },
  approvals: ApprovalStore,
): ReminderResult {
  if (!isApproved(approvals, wordingHash())) {
    throw new ApprovalError("The reminder wording has not been approved");
  }
  const name = cleanFirstName(args.firstName);
  if (name === "") return { ok: false, reasons: ["no_name"] };

  const template = TEMPLATES[args.reminderNumber];
  const fill = (t: string, date: string) => t.replace("{name}", () => name).replace("{date}", () => date);
  const text = `${fill(template.en, formatDateEn(args.visitDate))}\n\n${fill(template.ar, formatDateAr(args.visitDate))}`;

  const reasons = checkReminder(text, name, args.visitDate);
  return reasons.length > 0 ? { ok: false, reasons } : { ok: true, text };
}
