// The receptionist books a braces slot. The agent cannot book; a person does (B8).
// The check and the save are one step, so a double press books once.
import { isApproved } from "./approval";
import { isBraces } from "./patients";
import { buildConfirmation, repliesWordingHash } from "./replies-wording";
import { addCall, closeCallsForBooking, effectiveData, newId, type AppState } from "./state";

export type BookingResult =
  | { ok: true; confirmation: "sent" | "not_sent" }
  | { ok: false; error: "unknown_patient" | "not_braces" | "already_booked" | "unknown_slot" | "slot_taken" };

export function bookSlot(state: AppState, patientId: string, slotId: string, now: Date = new Date()): BookingResult {
  const outcome = state.bookings.update((bookings) => {
    // A fresh check against seed + everything booked so far, just before saving.
    const { patients, slots } = effectiveData(state, bookings);
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return { result: "unknown_patient" as const };
    if (!isBraces(patient)) return { result: "not_braces" as const };
    if (patient.bookedSlotId !== null) return { result: "already_booked" as const };
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return { result: "unknown_slot" as const };
    if (slot.takenBy !== null) return { result: "slot_taken" as const };
    return {
      items: [...bookings, { patientId, slotId, bookedAt: now.toISOString() }],
      result: { patient, slot },
    };
  });

  if (typeof outcome === "string") return { ok: false, error: outcome };

  const { patient, slot } = outcome;
  closeCallsForBooking(state, patient.id);

  // The confirmation comes from the booking record only, and only from approved wording.
  if (!isApproved(state.repliesApproval, repliesWordingHash())) {
    addCall(state, { patientId: patient.id, reason: "confirmation_not_sent", week: null }, now);
    return { ok: true, confirmation: "not_sent" };
  }
  const built = buildConfirmation({ firstName: patient.firstName, date: slot.date, time: slot.time }, state.repliesApproval);
  if (!built.ok) {
    addCall(state, { patientId: patient.id, reason: "confirmation_not_sent", week: null }, now);
    return { ok: true, confirmation: "not_sent" };
  }
  state.messages.update((items) => ({
    items: [
      ...items,
      {
        id: newId("M"),
        patientId: patient.id,
        direction: "out",
        kind: "confirmation",
        text: built.text,
        week: null,
        reminderNumber: null,
        visitDate: slot.date,
        visitDueDate: patient.dueDate,
        sendAt: now.toISOString().slice(0, 19) + "+00:00",
      },
    ],
    result: null,
  }));
  return { ok: true, confirmation: "sent" };
}
