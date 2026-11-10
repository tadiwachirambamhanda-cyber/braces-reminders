# Plan: F1 Synthetic patient list and braces calendar

## Goal
After this, the clinic can run one command and open a Patients screen that shows 60 made-up patients, 50 of them marked as braces, and the braces calendar for the four November Fridays. Every later feature (the Monday run, the reminders) works from this list.

## Feature
- ID: F1
- Done check: `npm run seed` then the Patients screen shows 60 rows, 50 marked braces, and the calendar shows 15 slots for 2026-11-06 with 12 free.
- Serves: AC1 and AC5 (and sets up AC3, which needs a free slot to book) (it holds the exact situation AC1 to AC5 need).

## Steps
1. Create the Next.js project in this folder with the same versions as liwan-desk (Next, React, Tailwind, zod, TypeScript). Read `node_modules/next/dist/docs/` first, because this Next version differs from what I know. Done when `npm run dev` shows the starter page.
2. Add `.gitignore` covering `.env*` (keeping `.env.example`), and `.env.example` with the variable names only (`AI_MODE`, `SIMULATOR_ENABLED`). Done when `git check-ignore .env.local` would match.
3. Write the patient shape in `src/lib/patients.ts` with zod: id, first name, fake phone (may be empty or invalid), treatment (`braces` or another), next visit date, and an optional booking. Done when a test loads a valid and an invalid patient and zod accepts one and rejects the other.
4. Write the seed in `scripts/seed.ts`: fixed data, no randomness, so it is the same every time. It writes `data/patients.json` and prints the counts. Done when `npm run seed` prints `60 patients, 50 braces`.
5. Add the Patients screen at `/`: a table of all 60 with a "braces" badge and a count line. Done when the page shows 60 rows and "50 braces".
6. Add `npm test` (Vitest) with tests for the seed numbers in "Checks". Done when `npm test` passes.

## Braces calendar (seed)
- The four Fridays, 15 slots of 20 minutes each from 17:00 to 21:40 (assumed 20 minutes, to confirm).
- Friday 2026-11-06 has 3 slots taken (17:00, 17:20, 18:40; 17:00 belongs to the already-booked patient), so 12 are free: 17:40, 18:00, 18:20, 19:00, 19:20, 19:40, 20:00, 20:20, 20:40, 21:00, 21:20, 21:40. The other Fridays are fully free.
- Stored in `data/slots.json`; the later booking (F8) and reply (F10) features read and update free times only from here. A patient's booking is a slot id, so booking later just fills that field.

## Seed contents (decided here so later features have what they need)
- 50 braces patients with visit dates on the four November Fridays (2026-11-06, 11-13, 11-20, 11-27).
- Friday 2026-11-06 has 14 braces patients: 12 clean ones (no booking, valid phone), 1 already booked, 1 with a missing or bad phone. The other three Fridays have 12 each. That gives 14 + 12 + 12 + 12 = 50.
- 10 non-braces patients (check-up, cleaning, filling and so on), some also due on 2026-11-06, to prove they are skipped later.
- The seed has no bookings or reminders yet beyond the one booked patient, so the Monday 2026-11-09 run later finds 24 (12 first reminders for 2026-11-13 plus 12 second reminders for 2026-11-06), and the Monday 2026-11-16 run sends 24 and moves the 12 from 2026-11-06 to the call list. A patient's `dueFriday` is the Friday their visit was first due; the later run (F2) decides who has rolled over, so the seed needs no extra field for it.
- All names, phone numbers and ids are invented. Phones look like `+971 50 000 0001`. No surnames.

## Files
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/lib/patients.ts`, `src/lib/calendar.ts`, `scripts/seed.ts`, `data/patients.json` and `data/slots.json` (made by the seed), `tests/seed.test.ts`.
- Change: `CLAUDE.md` (add run commands once they exist).

## Approval and data
Nothing is sent in F1. The data is stored in `data/patients.json` and is synthetic only. No secrets are needed yet. No real names or numbers anywhere.

## Checks
| Check | Expected result |
|---|---|
| `npm run seed` | prints `60 patients, 50 braces` |
| `npm test` | seed test: 60 total, 50 braces, 10 other |
| `npm test` | seed test: braces visit dates are all Fridays in November 2026 |
| `npm test` | seed test: 14 braces due 2026-11-06 = 12 clean + 1 booked + 1 bad phone |
| `npm test` | seed test: calendar has 15 slots per Friday and exactly the 12 free times above on 2026-11-06 |
| `npm test` | seed test: 12 braces due 2026-11-13, so a 2026-11-09 run can find 12 + 12 = 24 |
| `npm test` | zod accepts a valid patient and rejects one with no id |
| Open `/` in the browser | 60 rows, 50 with a "braces" badge, count line says 50 braces |
| `npm run lint` and `npm run typecheck` | no errors |

## What could break
The riskiest step is setting up Next.js in a non-empty folder (the `docs/`, `plans/` and `CLAUDE.md` I already wrote). I will create the project in a way that keeps them, and check they are still there afterwards.

## Not doing
No Monday run, no reminders, no message wording, no `/phone` screen, no replies, no Arabic wording, no model calls, no login, no run log, no editing patients in the screen. No real data.

## Questions
None. I picked the seed numbers above myself from the acceptance criteria.
