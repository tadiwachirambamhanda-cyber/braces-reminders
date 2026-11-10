// What a patient looks like. Checked with zod so bad data is caught, never guessed at.
import { z } from "zod";

export const TREATMENTS = ["braces", "check-up", "cleaning", "filling", "whitening", "root canal"] as const;

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must look like 2026-11-06");

export const PatientSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  // May be empty or not a real number on purpose: those patients go to the call list later.
  phone: z.string(),
  treatment: z.enum(TREATMENTS),
  // The Friday this patient's monthly braces visit is due (other treatments: their next visit).
  dueDate: DateString,
  // The braces slot id this patient has booked, or null when they have no booking.
  bookedSlotId: z.string().nullable(),
});

export type Patient = z.infer<typeof PatientSchema>;

export const PatientListSchema = z.array(PatientSchema);

export function isBraces(patient: Patient): boolean {
  return patient.treatment === "braces";
}
