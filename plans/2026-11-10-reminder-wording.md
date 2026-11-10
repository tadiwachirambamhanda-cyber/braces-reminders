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

First reminder, Arabic: "مرحباً {name}، معك عيادة ليوان للأسنان (Liwan Dental). موعد مراجعة التقويم الشهرية الخاصة بك هو يوم {date}، ويسعدنا رؤيتك! هل ترغب بحجز موعدك؟ ما عليك سوى الرد بـ «ما هي الأوقات المتاحة؟» وسنرسل لك الأوقات المتاحة."

Second reminder, Arabic: "مرحباً {name}، معك عيادة ليوان للأسنان (Liwan Dental) مرة أخرى. تذكير ودّي بأن موعد مراجعة التقويم الشهرية الخاصة بك هو يوم {date}، ولم يصلنا حجزك بعد. ما عليك سوى الرد بـ «ما هي الأوقات المتاحة؟» وسنرسل لك الأوقات المتاحة."

This exact text is what gets built. Someone who reads Arabic should check it before the receptionist approves it. It is never changed after approval without a new approval. The first and second versions are approved together as one wording set.

## How it works (all in code, no model)
- The reminder is a fixed template filled in by code with the patient's first name and the visit date. The visit date is the Friday of the week being run (a patient reminded a second time is shown this week's Friday).
- The first name comes from the patient's `firstName` field and goes in as data only. Control and direction characters and line breaks are removed, extra spaces are collapsed, and a name over 30 characters is cut at a word boundary. Arabic-script names are fine. An empty name after cleaning means no reminder is built (reason `no_name`), so it can never change the template or produce "Hello , ...".
- Dates use fixed day and month name tables written in code (English and Arabic), with Western digits, never the browser's locale formatting.
- A check runs on every built reminder (B4): starts with a greeting and the first name; names Liwan Dental; has the date; has "braces" and "تقويم"; has no "AED" or "درهم"; does not use the words "confirmed", "booked" or "your appointment is", or the Arabic "تم تأكيد" or "تم حجز" (the second reminder may say "we haven't got your booking yet"). A reminder that fails any check is not returned. `buildReminder` returns `{ ok: true, text }` or `{ ok: false, reasons }`, never a half-built message. A later feature (the weekly run) turns an `ok: false` into `needs_person` with the reasons, so one bad message never crashes a run or silently drops a patient.
- Approval gate: the reminder wording set (first and second, English and Arabic) is hashed. F9's confirmation wording will be its own set with its own approval, so adding it later never silently cancels this one. The receptionist approves it on a small `/wording` page that shows both versions with a sample name and date. Approving saves who approved, when, and the hash. If the wording text ever changes, the hash no longer matches, so the code refuses to build any reminder until it is approved again.
- The approval store is passed into the code (a file path or an in-memory store). Tests and later features use a temporary store, with no bypass switch, so the gate is never weakened. The real record lives at `data/wording-approval.json`. A missing file means "not approved", and if the file cannot be written (for example on a read-only host) the page says so plainly instead of failing.
- Accepted risk for this simulator-only version: the Approve button needs a non-empty name but no login or passcode, so anyone who can open `/wording` could approve. Before real use the receptionist screens must go behind a staff login (already noted as an idea for later).

## Steps
1. Add `src/lib/wording.ts`: the English and Arabic templates, date formatting in English and Arabic, and first-name cleaning. Done when a unit test shows a built reminder for "Sara" on 2026-11-06.
2. Add the reminder checks (B4) in the same file. Done when tests show each check catches a bad message (no name, a price, no Arabic, no clinic name, "your booking is confirmed").
3. Add `src/lib/approval.ts`: hash the wording, read and save the approval record (through a store passed in, real file `data/wording-approval.json`), and check it. Done when tests show: no record means refused; a valid record means allowed; a changed wording means refused.
4. Make `buildReminder(patient, number, date)` refuse to run without a valid approval. Done when a test shows it throws without approval and returns text with it.
5. Add the `/wording` page: shows the two versions (English and Arabic, first and second) with a sample name, a required name field and an "Approve this wording" button that saves the record. The page is read fresh on every visit (never cached) and shows a missing file as "not approved". Done when I click it and the page then says approved by that name and time.
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
| `npm test`, name safety | a first name with a line break, direction characters or a very long string cannot change the template; the cut lands on a word boundary; an empty name gives `{ ok: false }` with reason `no_name`; an Arabic name works |
| `npm test`, date | 2026-11-06 reads "Friday 6 November" and "الجمعة 6 نوفمبر" with Western digits, from the fixed name tables |
| `npm test`, approval | no record: refused; valid record: allowed; changed wording: refused; tests use a temporary store, not the real file |
| `npm test`, result shape | a failed check returns `{ ok: false, reasons }` and never throws or returns text |
| `npm test`, second reminder | "we haven't got your booking yet" passes the checks, while "booked", "confirmed" and "تم تأكيد" fail them |
| Open `/wording`, click "Approve this wording" | the name is required; page then shows approved by that name and a time; reloading keeps it; the Arabic reads right to left next to the English |
| `npm run lint`, `typecheck`, `build` | no errors; build passes with no environment variables |

## What could break
The Arabic text mixed with English ("Liwan Dental", names, dates) can display in the wrong order on some screens. I will check it in the browser. The approval gate is also the one control on what patients receive, so it must not be weakened to get tests passing. It adds new files and one link on the Patients page, so F1 and F2 keep working.

## Not doing
No sending, no send times (F4), no phone simulator (F5), no repeat-run check (F6), no call list (F7), no booking confirmation wording (F9), no times reply (F10), no model-written warmth, no login for the receptionist, no way to edit the wording in the page. Editing the wording means changing the file, which needs a new approval.

## Questions
1. Please have someone who reads Arabic check the Arabic text above before the receptionist approves it.
2. The plan has two texts, a first reminder and a gentler second one, approved together as one wording set. Is that what you want, or one text for both?

## Plan check
Fresh reviewer, 9 findings.
1. MAJOR, anyone can approve on `/wording`: Partly fixed. The name is required, and the plan now states this as an accepted risk for the simulator-only version and ties the fix to the staff login idea. A passcode was not added: it needs a new secret and is extra work the owner has not asked for.
2. MAJOR, how tests and fresh checkouts get an approval: Fixed. The store is passed in; tests use a temporary store with no bypass; a missing or unwritable file is handled.
3. MAJOR, Arabic text not in the plan: Fixed. The exact Arabic is now in the plan, and a question asks for an Arabic reader to check it.
4. MINOR, failure shape: Fixed. Returns `{ ok: false, reasons }`.
5. MINOR, name handling: Fixed. Control and direction characters, word-boundary cut, empty name, source of the name.
6. MINOR, Arabic date digits: Fixed. Fixed name tables, Western digits.
7. MINOR, two templates versus one: Kept as planned and turned into a question for the owner.
8. MINOR, page caching: Fixed. Read fresh every visit; missing file means not approved.
9. MINOR, check wording and F9 hash: Fixed. Banned words defined; the confirmation wording will have its own approval.

## Changes from the plan
- Added a small `renderTemplate` function in `src/lib/wording.ts` so the `/wording` page can preview the wording with the same code that builds real reminders.
- Wrote `buildReminder` to throw when the wording is not approved and to return `{ ok: false, reasons }` when a check fails, as the plan's plan check described.
- Open question 2 (two texts or one) was not answered, so I kept two texts approved together as one wording set, as planned.

## Verification
| Check | Result |
|---|---|
| `npm test`, B4 (bilingual, only name and date change) | pass |
| `npm test`, AC4 (greeting and first name, Liwan Dental, date, "braces", "تقويم", no "AED", no "درهم"), first and second reminder | pass |
| `npm test`, checks catch bad messages (no name, no clinic name, English price, Arabic price, no Arabic, "booked" or "confirmed" in English or Arabic, wrong date) | pass |
| `npm test`, name safety (line break, direction characters, long name cut on a word boundary, Arabic name, empty name gives `{ ok: false, reasons: ["no_name"] }`) | pass |
| `npm test`, dates | "Friday 6 November" and "الجمعة 6 نوفمبر" with Western digits: pass |
| `npm test`, approval (none: refused; valid: allowed; changed wording: refused; name required; file store; missing or damaged file means not approved) | pass |
| `npm test`, second reminder passes while "booked", "confirmed", "تم تأكيد" fail | pass |
| Open `/wording` | both versions show, Arabic reads right to left, status "Not approved yet" |
| Click "Approve this wording" with a test name | page shows "Approved by Test check on 2026-11-10 13:27 UTC"; after a reload it still does. The test approval file was removed afterwards so the receptionist approves for real |
| `npm run lint`, `typecheck`, `build` | no errors; build passes with no environment variables set |
All 60 tests pass in total.

## Ideas for later
- A staff login for `/wording`, `/run` and the Patients page before any real patient data (Codex round 1, finding 1; plan check finding 1).
