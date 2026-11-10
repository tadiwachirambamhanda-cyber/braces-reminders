// Everything the agent saves, plus "seed data + bookings" as the app sees it.
// The seed patients and calendar never change; bookings are saved separately on top.
import { join } from "node:path";
import { z } from "zod";
import { fileStore, memoryStore, type ApprovalStore } from "./approval";
import { fileJsonStore, memoryJsonStore, type JsonStore } from "./store";
import type { Patient } from "./patients";
import { PatientListSchema } from "./patients";
import { SlotListSchema, type Slot } from "./calendar";
import { existsSync, readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export const MessageSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  direction: z.enum(["out", "in"]),
  kind: z.enum(["reminder", "confirmation", "times_reply", "holding_reply", "patient_message"]),
  text: z.string(),
  week: z.string().nullable(), // the Monday of the run, for reminders
  reminderNumber: z.union([z.literal(1), z.literal(2)]).nullable(),
  visitDate: z.string().nullable(), // the Friday the message is about
  visitDueDate: z.string().nullable(), // the patient's first due Friday (counts reminders per visit)
  sendAt: z.string(), // ISO with +04:00
});
export type Message = z.infer<typeof MessageSchema>;

export const CALL_REASONS = [
  "no_phone",
  "no_booking_after_two_reminders",
  "missed_reminders",
  "reminder_failed_checks",
  "confirmation_not_sent",
  "wording_not_approved",
  "other_question",
  "no_free_times",
  "reply_failed_checks",
] as const;
export type CallReason = (typeof CALL_REASONS)[number];

export const CallEntrySchema = z.object({
  id: z.string(),
  patientId: z.string(),
  reason: z.enum(CALL_REASONS),
  week: z.string().nullable(),
  createdAt: z.string(),
  open: z.boolean(),
});
export type CallEntry = z.infer<typeof CallEntrySchema>;

export const BookingSchema = z.object({
  patientId: z.string(),
  slotId: z.string(),
  bookedAt: z.string(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const RunRecordSchema = z.object({
  runId: z.string(),
  week: z.string(),
  patientId: z.string(),
  status: z.enum(["sent", "already_sent", "skipped_booked", "needs_person"]),
  reason: z.string().nullable(),
  at: z.string(),
});
export type RunRecord = z.infer<typeof RunRecordSchema>;

export const REASON_TEXT: Record<CallReason, string> = {
  no_phone: "No usable phone number",
  no_booking_after_two_reminders: "No booking after two reminders",
  missed_reminders: "A reminder was missed, so a person should check",
  reminder_failed_checks: "The reminder did not pass its checks",
  confirmation_not_sent: "Booked, but the confirmation was not sent",
  wording_not_approved: "Wrote to us, but the reply wording is not approved",
  other_question: "Asked something else",
  no_free_times: "Asked for times, but none are free",
  reply_failed_checks: "The reply did not pass its checks",
};

// ---------------------------------------------------------------------------
// The state bundle
// ---------------------------------------------------------------------------

export type AppState = {
  seed: { patients: Patient[]; slots: Slot[] };
  messages: JsonStore<Message>;
  calls: JsonStore<CallEntry>;
  bookings: JsonStore<Booking>;
  runs: JsonStore<RunRecord>;
  reminderApproval: ApprovalStore;
  repliesApproval: ApprovalStore;
};

export function memoryState(seed: AppState["seed"]): AppState {
  return {
    seed,
    messages: memoryJsonStore<Message>(),
    calls: memoryJsonStore<CallEntry>(),
    bookings: memoryJsonStore<Booking>(),
    runs: memoryJsonStore<RunRecord>(),
    reminderApproval: memoryStore(),
    repliesApproval: memoryStore(),
  };
}

// The real state: seed files in data/, saved state in data/state/ (git-ignored).
export function fileState(root: string = process.cwd()): AppState | null {
  const dataDir = join(root, "data");
  const patientsFile = join(dataDir, "patients.json");
  const slotsFile = join(dataDir, "slots.json");
  if (!existsSync(patientsFile) || !existsSync(slotsFile)) return null;
  const stateDir = join(dataDir, "state");
  return {
    seed: {
      patients: PatientListSchema.parse(JSON.parse(readFileSync(patientsFile, "utf8"))),
      slots: SlotListSchema.parse(JSON.parse(readFileSync(slotsFile, "utf8"))),
    },
    messages: fileJsonStore(join(stateDir, "messages.json"), z.array(MessageSchema)),
    calls: fileJsonStore(join(stateDir, "calls.json"), z.array(CallEntrySchema)),
    bookings: fileJsonStore(join(stateDir, "bookings.json"), z.array(BookingSchema)),
    runs: fileJsonStore(join(stateDir, "runs.json"), z.array(RunRecordSchema)),
    reminderApproval: fileStore(join(dataDir, "wording-approval.json")),
    repliesApproval: fileStore(join(dataDir, "replies-approval.json")),
  };
}

// ---------------------------------------------------------------------------
// Seed + bookings
// ---------------------------------------------------------------------------

export function effectiveData(state: AppState, bookings: Booking[] = state.bookings.read()) {
  const bySlot = new Map(bookings.map((b) => [b.slotId, b.patientId]));
  const byPatient = new Map(bookings.map((b) => [b.patientId, b.slotId]));
  const patients: Patient[] = state.seed.patients.map((p) => ({
    ...p,
    bookedSlotId: p.bookedSlotId ?? byPatient.get(p.id) ?? null,
  }));
  const slots: Slot[] = state.seed.slots.map((s) => ({ ...s, takenBy: s.takenBy ?? bySlot.get(s.id) ?? null }));
  return { patients, slots };
}

// ---------------------------------------------------------------------------
// Call list helpers
// ---------------------------------------------------------------------------

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

// Add a call list entry unless the same patient, reason and week is already open.
export function addCall(state: AppState, entry: { patientId: string; reason: CallReason; week: string | null }, now: Date): boolean {
  return state.calls.update((items) => {
    const exists = items.some((c) => c.open && c.patientId === entry.patientId && c.reason === entry.reason && c.week === entry.week);
    if (exists) return { result: false };
    const next: CallEntry = { id: newId("C"), ...entry, createdAt: now.toISOString(), open: true };
    return { items: [...items, next], result: true };
  });
}

// A patient who has booked no longer needs a call about missing a booking.
const CLOSED_BY_BOOKING: CallReason[] = ["no_booking_after_two_reminders", "missed_reminders", "no_free_times"];

export function closeCallsForBooking(state: AppState, patientId: string): void {
  state.calls.update((items) => ({
    items: items.map((c) => (c.open && c.patientId === patientId && CLOSED_BY_BOOKING.includes(c.reason) ? { ...c, open: false } : c)),
    result: null,
  }));
}
