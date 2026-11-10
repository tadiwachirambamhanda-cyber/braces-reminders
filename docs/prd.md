# PRD: Braces Reminder Agent

For: Liwan Dental. Written: 2026-11-10. Source: `docs/scope-brief.md`.

## The client
A dental clinic that treats about 50 braces patients a month. Each one must come back every month to have their braces checked.

## The problem
Each month about 50 braces patients must be reminded to book their visit. Doing it by hand is slow and some are missed. About 20 of the 50 miss their monthly visit today. A missed visit delays treatment.

## The job
Every Monday, find the braces patients whose monthly visit is on that week's Friday and who have no booking, and send each a warm WhatsApp reminder in English and Arabic. A patient who did not book is reminded a second time the following Monday. After two reminders with no booking, they go on the call list for a person. If a patient asks for the available times, the agent says braces visits are on their Friday between 5 p.m. and 10 p.m. If they name a time or want to book, or ask anything else, it goes to a person. When the receptionist books a patient, the agent sends an automatic, warm booking confirmation with the day and time.

## Voice
The patient must never feel they are talking to an automation. Same voice as liwan-desk: warm, short, uses the first name, answers in the language the patient wrote in, lists times neatly, and hands over kindly. Code builds the facts and the list; the model (or the fixed templates) only adds the warm opening and closing around it.

## Who uses it
- Receptionist (front desk): approves the reminder and confirmation wording once (English and Arabic), runs or reviews the weekly run, books patients into free slots, and calls the patients on the call list.
- Patient (simulated): receives the reminder on the /phone simulator, and may ask for available times.

## Acceptance criteria
1. AC1: The seed list of 60 patients (50 braces patients with monthly due dates on the Fridays of November 2026, plus 10 non-braces patients), run on Monday 2026-11-02 for Friday 2026-11-06 (12 braces patients due, no booking, valid phone; 1 more already booked, 1 more with a missing phone number): the solution must: Create exactly 12 reminders, 0 of them to non-braces patients or to braces patients due in other weeks, each with a send time between 17:00 and 22:00 clinic time; give the booked patient the status `skipped_booked`; and give the patient with the missing phone the status `needs_person` with nothing sent.
2. AC2: The same week run a second time, then the next Mondays 2026-11-09 and 2026-11-16 with no changes to bookings: the solution must: The second run creates 0 new reminders (no patient has more than 1 reminder per week). The 2026-11-09 run creates 24: the 12 due 2026-11-13 plus the 12 from 2026-11-06 who still have no booking. On 2026-11-16 the 12 from 2026-11-06 (reminded twice, still no booking) get no third reminder, get the status `needs_person` and appear on the call list.
3. AC3: The receptionist books a braces patient into a free slot (for example Friday 2026-11-06 at 18:00), and then tries to book the same slot for another patient: the solution must: Create a confirmation for the first patient straight away (not held to the 17:00 to 22:00 reminder window) in the patient's language, naming the patient's first name, Liwan Dental, and exactly "Friday 6 November" and "18:00" taken from the booking; mark the slot taken so 18:00 leaves the free list; give that patient no further reminders; and refuse the second booking of that slot with no confirmation sent.
4. AC4: Any reminder or confirmation that is created: the solution must: Start with a greeting and the patient's first name, name Liwan Dental, and be in English and Arabic in the one message. A reminder also contains the due date and the words "braces" and "تقويم"; neither contains a price (no "AED", no "درهم").
5. AC5: A reminded patient replies "What times are available?" (or the same in Arabic); another patient names a time or wants to book (for example "Friday 18:00 please"); and another patient replies with anything else, such as "How much is a filling?": the solution must: The first gets a reply in the same language that says braces visits are on their Friday (for 2026-11-06, "Friday 6 November") between 5 p.m. and 10 p.m. (in Arabic, 5 مساءً and 10 مساءً), with a warm opening, and that lists no 20-minute slot time, no price, and does not say anything is booked. The second gets a kind reply that the receptionist will confirm the time, nothing is booked by the agent, and the patient goes on the call list as `needs_person` (reason: wants to book). The third gets no answer to the question, a kind holding reply, and the status `needs_person`.

## Channels
In: a synthetic patient list, a braces calendar for the Fridays, patient replies typed in the /phone simulator, and bookings made by the receptionist on a simple booking screen. Out: the WhatsApp simulator (/phone) only.

## Rules
- B1: only braces patients get a reminder.
- B2: only patients due on the Friday of the week being run, or due on the Friday before (second reminder), with no booking. Braces visits only happen on Fridays 17:00 to 22:00.
- B3: at most one reminder per patient per week, and at most two per monthly visit.
- B4: the message is the approved template, in English and Arabic, nothing added.
- B5: reminders go out only between 17:00 and 22:00 clinic time (UTC+4).
- B6: after two reminders with no booking, no third reminder; the patient goes to the call list.
- B7: the only reply is when braces visits happen: the patient's Friday, between 5 p.m. and 10 p.m. It never lists the 20-minute slots (those are for the receptionist's booking screen), never books, and the model never writes a time, date or price. A patient who names a time or wants to book goes to the receptionist.
- B9 (F13, optional AI): with `AI_MODE=ai`, Jev may read what a patient means and Claude may add one short warm sentence to a reply. Code can always veto Jev toward the receptionist (a named time, a wish to book or a money question never gets the window reply). The sentence must pass the checks on /wording or the fixed wording is used. Reminders and confirmations are never AI-written. Pain or urgent messages go to the top of the call list. Patient messages and first names go to Jev and Claude, so a data agreement is needed before any real patient data is used.
- B8: a confirmation is sent only after the receptionist's booking exists, and its day and time come from the booking record. A taken slot cannot be booked twice.

## Sending and hand-over
| Action that leaves the solution | Code checks before it goes out on its own | Exceptions that go to a person, and who | What is logged |
|---|---|---|---|
| Reminder to the simulator | B1, B2, B3, B5, B6, valid phone, message equals approved bilingual template with greeting, name, clinic name, date, "braces"/"تقويم", no price | Missing or invalid phone, or no booking after two reminders: front-desk manager | Run id, patient id, checks and results, status |
| Booking confirmation | A booking record exists, the slot was free, the day and time equal the booking, same language as the patient, greeting, first name, Liwan Dental | A failed check: nothing is sent and the receptionist is told | Booking id, patient id, slot, checks, status |
| Reply about visit times | Says only the patient's Friday and 5 p.m. to 10 p.m.; no slot time, no price, same language as the patient, nothing claimed as booked; only braces patients with no booking | A patient who names a time or wants to book, any other question, low confidence, or a failed check: kind reply, front-desk manager | Message id, what was asked, engine, checks, status |

## Constraints
The weekly run is on Monday. Reminders send between 17:00 and 22:00 clinic time (UTC+4, no daylight saving). English and Arabic. Web app with a phone-style simulator screen. Simulator only, no real WhatsApp. Reuse liwan-desk's stack: Next.js, zod, Claude for the warm wording, Jev to read what a patient's reply is about, code for every rule, `AI_MODE=templates` fallback.

## Not in this version
- No automatic send to a real customer. Everything goes to the simulator only.
- No real personal data. All patients are synthetic.
- No reminders for any treatment other than braces (no check-ups, cleanings, fillings, whitening).
- No booking, rescheduling or cancelling: the agent cannot book, a person does.
- No prices, promotions or other rules.

## Data
Synthetic seed: 60 patients (50 braces, 10 other) with first name, fake phone, treatment, first due Friday, optional booking (the receptionist can add one); and a braces calendar for the four November Fridays (15 slots of 20 minutes, 17:00 to 21:40). Never stored or logged: real names, real phone numbers.

## Open questions
1. (Settled) Braces slots are 20 minutes. They are for the receptionist's booking screen only; patients are never told the 20-minute times.
2. Should times be shown as 18:00 or 6:00 PM? (I used 18:00, the same as liwan-desk.)
