// The made-up data. Fixed, no randomness: same every time. Every name and number is invented.
import { fridaySlotTimes, slotId, type Slot } from "./calendar";
import type { Patient } from "./patients";

export const FRIDAYS = ["2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27"] as const;

const FIRST_NAMES = [
  "Sara", "Omar", "Layla", "Khalid", "Maryam", "Yousef", "Noor", "Hamad", "Fatima", "Ali",
  "Huda", "Rashid", "Amal", "Saeed", "Dana", "Tariq", "Lina", "Majid", "Reem", "Zayed",
  "Aisha", "Faisal", "Mona", "Salem", "Rana", "Jassim", "Hind", "Nasser", "Sama", "Waleed",
  "Dalal", "Ahmed", "Mira", "Sultan", "Yasmin", "Ibrahim", "Jana", "Hassan", "Nadia", "Mansour",
  "Salma", "Adel", "Lubna", "Fahad", "Rima", "Bader", "Haya", "Karim", "Shaikha", "Mohammed",
  "Amira", "Talal", "Ghada", "Rami", "Sana", "Osama", "Lamia", "Ziad", "Bushra", "Nabil",
];

const OTHER_TREATMENTS = ["check-up", "cleaning", "filling", "whitening", "root canal"] as const;

function fakePhone(n: number): string {
  return `+971 50 000 ${String(n).padStart(4, "0")}`;
}

export function buildPatients(): Patient[] {
  const patients: Patient[] = [];
  const bracesDue: string[] = [];
  // Friday 2026-11-06 has 14 braces patients, the other three Fridays have 12 each: 50 in all.
  for (let i = 0; i < 14; i++) bracesDue.push(FRIDAYS[0]);
  for (const friday of FRIDAYS.slice(1)) for (let i = 0; i < 12; i++) bracesDue.push(friday);

  bracesDue.forEach((dueDate, index) => {
    const n = index + 1;
    patients.push({
      id: `P${String(n).padStart(3, "0")}`,
      firstName: FIRST_NAMES[index],
      phone: fakePhone(n),
      treatment: "braces",
      dueDate,
      bookedSlotId: null,
    });
  });

  // Of the 14 on 2026-11-06: P013 already has a booking, P014 has no phone number.
  patients[12].bookedSlotId = slotId(FRIDAYS[0], "17:00");
  patients[13].phone = "";

  // 10 patients who are not on braces. Some are due on 2026-11-06 to prove they are skipped.
  for (let i = 0; i < 10; i++) {
    const n = 51 + i;
    patients.push({
      id: `P${n}`,
      firstName: FIRST_NAMES[50 + i],
      phone: fakePhone(n),
      treatment: OTHER_TREATMENTS[i % OTHER_TREATMENTS.length],
      dueDate: i < 5 ? FRIDAYS[0] : FRIDAYS[1],
      bookedSlotId: null,
    });
  }
  return patients;
}

export function buildSlots(patients: Patient[]): Slot[] {
  const slots: Slot[] = [];
  const bookedBy = new Map<string, string>();
  for (const p of patients) if (p.bookedSlotId) bookedBy.set(p.bookedSlotId, p.id);

  for (const date of FRIDAYS) {
    for (const time of fridaySlotTimes()) {
      const id = slotId(date, time);
      let takenBy: string | null = bookedBy.get(id) ?? null;
      // The dentist keeps two other times on 2026-11-06.
      if (date === FRIDAYS[0] && (time === "17:20" || time === "18:40")) takenBy = "clinic-hold";
      slots.push({ id, date, time, takenBy });
    }
  }
  return slots;
}
