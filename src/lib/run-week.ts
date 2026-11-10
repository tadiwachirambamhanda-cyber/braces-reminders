// The weekly decision. All rules live here in plain code, no model. Same input, same answer.
//
// The run date is a Monday. F is that week's Friday. A braces visit due on F gets its first
// reminder, due on F minus 7 days its second, and due on F minus 14 days (two reminders
// already, still no booking) goes to a person. Nothing else is ever picked.
import { addDays, fridayOfWeek } from "./dates";
import { isBraces, type Patient } from "./patients";

export type DecisionStatus = "to_send" | "skipped_booked" | "needs_person";
export type NeedsPersonReason = "no_phone" | "no_booking_after_two_reminders";

export type Decision = {
  patientId: string;
  firstName: string;
  status: DecisionStatus;
  reminderNumber: 1 | 2 | null; // only for to_send
  reason: NeedsPersonReason | null; // only for needs_person
  dueDate: string;
};

export type WeekResult = {
  monday: string;
  friday: string;
  decisions: Decision[];
  counts: {
    toSend: number;
    firstReminders: number;
    secondReminders: number;
    skippedBooked: number;
    needsPerson: number;
    ignored: number;
  };
};

// A phone is usable if it starts with + and has 8 to 15 digits (spaces allowed).
export function isValidPhone(phone: string): boolean {
  if (!/^\+[\d ]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 8 && digits <= 15;
}

export function decideWeek(patients: Patient[], monday: string): WeekResult {
  const friday = fridayOfWeek(monday); // throws if it is not a Monday
  const lastFriday = addDays(friday, -7);
  const fridayBefore = addDays(friday, -14);

  const decisions: Decision[] = [];

  for (const p of patients) {
    // B1: only braces patients.
    if (!isBraces(p)) continue;
    // Only visits due on F, F-7 or F-14 are looked at this week.
    if (p.dueDate !== friday && p.dueDate !== lastFriday && p.dueDate !== fridayBefore) continue;

    const base = { patientId: p.id, firstName: p.firstName, dueDate: p.dueDate };

    // B2: already booked.
    if (p.bookedSlotId !== null) {
      decisions.push({ ...base, status: "skipped_booked", reminderNumber: null, reason: null });
      continue;
    }
    // No usable phone: a person calls.
    if (!isValidPhone(p.phone)) {
      decisions.push({ ...base, status: "needs_person", reminderNumber: null, reason: "no_phone" });
      continue;
    }
    // B6: two reminders went out and there is still no booking, so no third.
    if (p.dueDate === fridayBefore) {
      decisions.push({
        ...base,
        status: "needs_person",
        reminderNumber: null,
        reason: "no_booking_after_two_reminders",
      });
      continue;
    }
    // B2, B3: first reminder (due this Friday) or second reminder (due last Friday).
    decisions.push({
      ...base,
      status: "to_send",
      reminderNumber: p.dueDate === friday ? 1 : 2,
      reason: null,
    });
  }

  const toSend = decisions.filter((d) => d.status === "to_send");
  return {
    monday,
    friday,
    decisions,
    counts: {
      toSend: toSend.length,
      firstReminders: toSend.filter((d) => d.reminderNumber === 1).length,
      secondReminders: toSend.filter((d) => d.reminderNumber === 2).length,
      skippedBooked: decisions.filter((d) => d.status === "skipped_booked").length,
      needsPerson: decisions.filter((d) => d.status === "needs_person").length,
      ignored: patients.length - decisions.length,
    },
  };
}
