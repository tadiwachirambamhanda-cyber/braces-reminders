// npm run seed: writes the made-up patients and the braces calendar into data/.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PatientListSchema } from "../src/lib/patients";
import { SlotListSchema } from "../src/lib/calendar";
import { buildPatients, buildSlots } from "../src/lib/seed-data";

const patients = PatientListSchema.parse(buildPatients());
const slots = SlotListSchema.parse(buildSlots(patients));

const dir = join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "patients.json"), JSON.stringify(patients, null, 2) + "\n");
writeFileSync(join(dir, "slots.json"), JSON.stringify(slots, null, 2) + "\n");

const braces = patients.filter((p) => p.treatment === "braces").length;
console.log(`${patients.length} patients, ${braces} braces`);
