// Reads the seeded data files on the server. Returns null if `npm run seed` has not been run.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PatientListSchema, type Patient } from "./patients";
import { SlotListSchema, type Slot } from "./calendar";

export function loadData(): { patients: Patient[]; slots: Slot[] } | null {
  const dir = join(process.cwd(), "data");
  const patientsFile = join(dir, "patients.json");
  const slotsFile = join(dir, "slots.json");
  if (!existsSync(patientsFile) || !existsSync(slotsFile)) return null;
  return {
    patients: PatientListSchema.parse(JSON.parse(readFileSync(patientsFile, "utf8"))),
    slots: SlotListSchema.parse(JSON.parse(readFileSync(slotsFile, "utf8"))),
  };
}
