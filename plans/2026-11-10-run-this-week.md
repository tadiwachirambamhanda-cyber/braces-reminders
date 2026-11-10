# Plan: F2 Run this week

## Goal
After this, the receptionist can pick a Monday, press "Run this week", and see exactly which braces patients would get a reminder that week, who is skipped, and who needs a person. Nothing is sent or saved yet; this is the decision step that the later features build on.

## Feature
- ID: F2
- Done check: Run Monday 2026-11-02: summary shows 12 to send (visits on Friday 2026-11-06), 0 non-braces; a booked patient shows `skipped_booked`. Run Monday 2026-11-09: summary shows 24 to send (12 first reminders, 12 second reminders).
- Serves: AC1, AC2 (and AC3's 2026-11-16 call-list numbers, which this decision step already produces).

## How the code decides (rules, all in code, no model)
The run date is a Monday. The visit Friday for that week is the Monday plus 4 days (call it F). Each patient is looked at in this order, and the first match wins:
1. Not braces: ignored (B1).
2. Visit date is not F, F minus 7 days or F minus 14 days: ignored (not due this week).
3. Already has a booking: `skipped_booked` (B2).
4. No phone or a phone that is not valid: `needs_person`, reason `no_phone`.
5. Visit date is F minus 14 days (two reminders already went out, still no booking): `needs_person`, reason `no_booking_after_two_reminders` (B6).
6. Visit date is F: `to_send`, reminder number 1. Visit date is F minus 7: `to_send`, reminder number 2 (B2, B3).

Because the decision depends only on the dates, no one can be picked for a third reminder (B3, B6), and no history file is needed yet. Remembering what was actually sent, so a re-run adds nothing, is F6.

Expected results with the seed: 2026-11-02 gives 12 to send, 1 skipped, 1 needs person. 2026-11-09 gives 24 to send (12 first, 12 second), 1 skipped, 1 needs person. 2026-11-16 gives 24 to send and 13 needs person (the 12 from 2026-11-06 plus the patient with no phone), 1 skipped.

## Steps
1. Add date helpers in `src/lib/dates.ts` (add days, is Monday, the Friday of a Monday's week), with unit tests. Done when `npm test` passes the date tests.
2. Add the decision function in `src/lib/run-week.ts` following the order above, returning one decision per relevant patient plus counts. Done when a unit test per rule id (B1, B2, B3, B6) passes.
3. Test it against the seed: the three Mondays above give the expected counts. Done when `npm test` passes those tests.
4. Add the `/run` screen: a "Week starting Monday" choice (2026-11-02, 09, 16, 23) and a "Run this week" button. The result shows counts (to send, skipped, needs person, ignored) and a list of patients with their status and reason. It uses plain page parameters, so it saves nothing and sends nothing. A date that is not a Monday shows a plain message. Done when the screen shows 12 for 2026-11-02 and 24 for 2026-11-09.
5. Add a link between `/` and `/run`. Done when both pages link to each other.
6. Run all checks and click through it. Done when lint, typecheck, test and build pass and the screen matches the numbers.

## Files
- Create: `src/lib/dates.ts`, `src/lib/run-week.ts`, `src/app/run/page.tsx`, `tests/dates.test.ts`, `tests/run-week.test.ts`.
- Change: `src/app/page.tsx` (link to `/run`), `docs/feature-list.md` (status).

## AI parts
None. F2 is all code. No model is called.

## Approval and data
Nothing leaves the solution and nothing is stored. The screen shows patient id, first name, status and reason only, with no phone numbers. No secrets are needed. All data is the synthetic seed. Nothing is logged.

## Checks
| Check | Expected result |
|---|---|
| `npm test`, B1 | a non-braces patient due that week is ignored |
| `npm test`, B2 | a patient with a booking gets `skipped_booked`; only visits on F or F minus 7 days are picked |
| `npm test`, B3 | no patient is picked for a third reminder in the same visit |
| `npm test`, B6 | a patient due F minus 14 with no booking gets `needs_person` with reason `no_booking_after_two_reminders` |
| `npm test`, seed 2026-11-02 | 12 to send, 1 skipped, 1 needs person, 0 non-braces among the 12 |
| `npm test`, seed 2026-11-09 | 24 to send (12 first, 12 second) |
| `npm test`, seed 2026-11-16 | 24 to send; 12 of the needs person are the 2026-11-06 patients |
| `npm test`, date helpers | a non-Monday is rejected; Monday 2026-11-02 gives Friday 2026-11-06 |
| Open `/run`, choose 2026-11-02, press Run this week | counts show 12 to send, 1 skipped, 1 needs person |
| Open `/run`, choose 2026-11-09 | counts show 24 to send |
| `npm run lint`, `npm run typecheck`, `npm run build` | no errors |

## What could break
The riskiest part is the date arithmetic (Mondays, Fridays and weeks), which is easy to get off by one. The date tests and the three seed runs catch that. It touches only new files plus one link on the Patients page, so F1 keeps working.

## Not doing
No message wording, no send times, no phone simulator, no saving of reminders, no stopping a repeat run (F6), no call-list screen (F7), no booking, no model calls, no login. It does not read patient replies.

## Questions
None. I chose the four Mondays in November for the week picker, and the screen shows counts and a list without phone numbers.
