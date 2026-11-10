# Plan: F3 The approved reminder wording (English and Arabic)

## Goal
After this, the clinic has one warm reminder written in English and Arabic, the receptionist can read it and approve it once, and the code can only build a reminder from wording that has been approved. Nothing is sent yet; the sending comes in F4 and F5.

## Feature
- ID: F3
- Done check: `npm test` passes the reminder wording test (first name, due date, "braces", "تقويم", no "AED", no "درهم").
- Serves: AC4.

## The wording (a draft for the receptionist to read and approve)
Two versions, first and second reminder, each with English then Arabic in one message. Placeholders are `{name}` and `{date}` ("Friday 6 November" / "الجمعة 6 نوفمبر"). It starts with a greeting and the first name, names Liwan Dental, gives the visit date, says "braces" and "تقويم", and contains no price.

First reminder, English: "Hello {name}, this is Liwan Dental. Your monthly braces check is due on {date}. We would love to see you! Would you like to book your visit? Just reply "What times are available?" and we will send you the free times."

Second reminder, English: "Hello {name}, it's Liwan Dental again. A friendly reminder that your monthly braces check is due on {date}, and we haven't got your booking yet. Just reply "What times are available?" and we will send you the free times."

The Arabic versions say the same, warmly, with "مرحباً {name}" and the clinic name Liwan Dental, and mention "التقويم". The exact Arabic is written during the build and is what the receptionist approves; it is never changed after approval without a new approval.

## How it works (all in code, no model)
- The reminder is a fixed template filled in by code with the patient's first name and the visit date. The visit date is the Friday of the week being run (a patient reminded a second time is shown this week's Friday).
- The patient's first name goes in as data only: line breaks are removed and it is cut to a safe length, so it can never change the template.
- A check runs on every built reminder (B4): starts with a greeting and the first name; names Liwan Dental; has the date; has "braces" and "تقويم"; has no "AED" or "درهم"; says nothing is booked or confirmed. A reminder that fails any check is not returned; the failure is reported instead.
- Approval gate: the wording is hashed. The receptionist approves it on a small `/wording` page that shows both versions with a sample name and date. Approving saves who approved, when, and the hash. If the wording text ever changes, the hash no longer matches, so the code refuses to build any reminder until it is approved again.

## Steps
1. Add `src/lib/wording.ts`: the English and Arabic templates, date formatting in English and Arabic, and first-name cleaning. Done when a unit test shows a built reminder for "Sara" on 2026-11-06.
2. Add the reminder checks (B4) in the same file. Done when tests show each check catches a bad message (no name, a price, no Arabic, no clinic name, "your booking is confirmed").
3. Add `src/lib/approval.ts`: hash the wording, read and save the approval record in `data/wording-approval.json`, and check it. Done when tests show: no record means refused; a valid record means allowed; a changed wording means refused.
4. Make `buildReminder(patient, number, date)` refuse to run without a valid approval. Done when a test shows it throws without approval and returns text with it.
5. Add the `/wording` page: shows the two versions (English and Arabic, first and second) with a sample name, a name field and an "Approve this wording" button that saves the record. Done when I click it and the page then says approved by that name and time.
6. Run all the checks and click through it. Done when lint, typecheck, test and build pass.

## Files
- Create: `src/lib/wording.ts`, `src/lib/approval.ts`, `src/app/wording/page.tsx`, `tests/wording.test.ts`, `tests/approval.test.ts`.
- Change: `.gitignore` (ignore `data/wording-approval.json`, because it is a saved approval, not source), `src/app/page.tsx` (link to `/wording`), `docs/feature-list.md` (status).

## AI parts
None. The wording is a fixed approved template filled in by code, as the project rules say. No model is called, and no cost.

## Approval and data
- What leaves the solution: nothing in F3. This feature only builds the text and holds the approval.
- Approval record: `data/wording-approval.json` with approver name, time and the hash of the wording. Without a valid one, no reminder can be built.
- Secrets: none.
- Personal data: patient first names are only put into the built text in memory. Nothing is logged, and the sample on `/wording` uses a made-up name. The approver's name is stored in the approval file only.

## Checks
| Check | Expected result |
|---|---|
| `npm test`, B4 | a built reminder is English plus Arabic in one message and contains only template text plus the name and date |
| `npm test`, AC4 | contains a greeting and first name, "Liwan Dental", the date, "braces" and "تقويم", no "AED", no "درهم" (first and second versions) |
| `npm test`, checks | each bad message (no name, price in English, price in Arabic, no Arabic, no clinic name, says "confirmed") fails the check |
| `npm test`, name safety | a first name with a line break or a long string cannot change or break the template |
| `npm test`, date | 2026-11-06 reads "Friday 6 November" and "الجمعة 6 نوفمبر" |
| `npm test`, approval | no record: refused; valid record: allowed; changed wording: refused |
| Open `/wording`, click "Approve this wording" | page shows approved by that name and a time; reloading keeps it |
| `npm run lint`, `typecheck`, `build` | no errors; build passes with no environment variables |

## What could break
The Arabic text mixed with English and `{name}` placeholders can display in the wrong order on some screens. I will check it in the browser. It adds new files and one link on the Patients page, so F1 and F2 keep working.

## Not doing
No sending, no send times (F4), no phone simulator (F5), no repeat-run check (F6), no call list (F7), no booking confirmation wording (F9), no times reply (F10), no model-written warmth, no login for the receptionist, no way to edit the wording in the page. Editing the wording means changing the file, which needs a new approval.

## Questions
None that block the build. One thing to know: the Arabic is written by me, and the receptionist is the one who approves it, so it should be read by someone who reads Arabic before approving.
