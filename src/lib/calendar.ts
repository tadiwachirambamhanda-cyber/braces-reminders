// The braces dentist's calendar. Braces visits happen only on Fridays, 17:00 to 22:00,
// in 20-minute slots. Free times are always read from here, never written by a model.
import { z } from "zod";

export const SLOT_MINUTES = 20;
export const FIRST_SLOT = "17:00";
export const SLOTS_PER_FRIDAY = 15; // 17:00, 17:20 ... 21:40

export const SlotSchema = z.object({
  id: z.string().min(1), // "2026-11-06T17:40"
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  // null means free. Otherwise the patient id who booked it, or "clinic-hold" for a time the dentist keeps.
  takenBy: z.string().nullable(),
});

export type Slot = z.infer<typeof SlotSchema>;

export const SlotListSchema = z.array(SlotSchema);

export function slotId(date: string, time: string): string {
  return `${date}T${time}`;
}

// 12:00 style helper kept simple: "17:00" + 20 minutes steps.
export function fridaySlotTimes(): string[] {
  const [h0, m0] = FIRST_SLOT.split(":").map(Number);
  const times: string[] = [];
  for (let i = 0; i < SLOTS_PER_FRIDAY; i++) {
    const total = h0 * 60 + m0 + i * SLOT_MINUTES;
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    times.push(`${h}:${m}`);
  }
  return times;
}

export function isFriday(date: string): boolean {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 5;
}

export function slotsForDate(slots: Slot[], date: string): Slot[] {
  return slots.filter((s) => s.date === date).sort((a, b) => a.time.localeCompare(b.time));
}

export function freeTimes(slots: Slot[], date: string): string[] {
  return slotsForDate(slots, date)
    .filter((s) => s.takenBy === null)
    .map((s) => s.time);
}
