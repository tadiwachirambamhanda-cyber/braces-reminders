# Scope brief: Braces Reminder Agent

Business: Liwan Dental (the same clinic as liwan-desk). Process owner: front-desk manager. Written: 2026-11-10. Source: the owner's requests in chat (no discovery repo for this one).

## The job

Every Monday, find every braces patient whose monthly braces check falls on that week's Friday and who has no booking yet, and send each one a warm WhatsApp reminder to book, in English and Arabic. A patient who did not book is moved to the next week's Friday and reminded a second time the following Monday. If they still have not booked after the second reminder, they go to a person on the call list. If a patient replies asking for the available times, the agent answers with a tidy list of the free braces times; anything else goes to a person. When the receptionist books a patient into a free slot, the agent sends the patient an automatic, warm confirmation with the day and time. Sent through the WhatsApp simulator (the /phone screen), not real WhatsApp.

## Why this one

About 50 braces patients must come back every month, and about 20 of them miss their visit today. Chasing them by hand is slow. It is feasible because the rules are simple and the same stack as liwan-desk already works.

## In scope

- Message kinds it handles: the braces reminder (first and second), one kind of reply: the free braces times, and the booking confirmation. Everything is written in a warm, human voice, never robotic (same voice as liwan-desk).
- Channels in: a patient list and a braces calendar (synthetic seed data), patient replies in the /phone simulator, and the receptionist booking a patient into a free slot on a simple booking screen.
- Channels out: the WhatsApp simulator only.
- The constraint it works on, and the baseline: patients missing their monthly braces visit. Baseline: about 20 of the roughly 50 braces patients miss it (from the owner, 2026-11-10).
- Facts: braces visits happen only on Fridays from 17:00 to 22:00 (the braces dentist's only hours), in 20-minute slots (assumed, to confirm).
- Rules it enforces:
  - B1: only patients whose treatment is braces get a reminder.
  - B2: only patients whose monthly visit is due on the Friday of the week being run, or was due on the Friday before (second reminder), and who have no appointment booked.
  - B3: a patient gets at most one reminder per week and at most two per monthly visit, so running a week twice never reminds twice.
  - B4: the reminder is the approved template, in English and Arabic, nothing added.
  - B5: reminders go out only between 17:00 and 22:00 clinic time (UTC+4), when patients are out of work and checking their phones. The weekly run is on Monday.
  - B6: a patient with two reminders and still no booking gets no third reminder; they go to the call list for a person.
  - B7: the only thing the agent answers is the free braces times. Code builds the list from the calendar; the model never writes a time itself.
  - B8: a confirmation is sent only after the receptionist's booking exists, and its day and time come from the booking record, never from the model. A slot that is already taken cannot be booked twice.

## Out of scope

- No automatic send to a real customer. Everything goes to the simulator only.
- No real personal data. All patients are synthetic.
- No reminders for any treatment other than braces (no check-ups, cleanings, fillings, whitening).
- No booking, rescheduling or cancelling: the agent cannot book, a person does.
- No prices, promotions or other rules.

## A person handles the exceptions

The reminder and confirmation wording is approved once by the receptionist (English and Arabic), then sent by code. A patient with a missing or invalid phone number is not sent anything, a patient who still has no booking after two reminders gets no third one, and a patient who asks anything other than the free times gets a kind holding reply. All three go on a call list for the front-desk manager.

## Acceptance criteria

| # | Given | The solution must |
|---|---|---|
| AC1 | The seed list of 60 patients (50 braces patients with monthly due dates on the Fridays of November 2026, plus 10 non-braces patients), run on Monday 2026-11-02 for Friday 2026-11-06 (12 braces patients due, no booking, valid phone; 1 more already booked, 1 more with a missing phone number) | Create exactly 12 reminders, 0 of them to non-braces patients or to braces patients due in other weeks, each with a send time between 17:00 and 22:00 clinic time; give the booked patient the status `skipped_booked`; and give the patient with the missing phone the status `needs_person` with nothing sent |
| AC2 | The same week run a second time, then the next Mondays 2026-11-09 and 2026-11-16 with no changes to bookings | The second run creates 0 new reminders (no patient has more than 1 reminder per week). The 2026-11-09 run creates 24: the 12 due 2026-11-13 plus the 12 from 2026-11-06 who still have no booking. On 2026-11-16 the 12 from 2026-11-06 (reminded twice, still no booking) get no third reminder, get the status `needs_person` and appear on the call list |
| AC3 | The receptionist books a braces patient into a free slot (for example Friday 2026-11-06 at 18:00), and then tries to book the same slot for another patient | Create a confirmation for the first patient straight away (not held to the 17:00 to 22:00 reminder window) in the patient's language, naming the patient's first name, Liwan Dental, and exactly "Friday 6 November" and "18:00" taken from the booking; mark the slot taken so 18:00 leaves the free list; give that patient no further reminders; and refuse the second booking of that slot with no confirmation sent |
| AC4 | Any reminder or confirmation that is created | Start with a greeting and the patient's first name, name Liwan Dental, and be in English and Arabic in the one message. A reminder also contains the due date and the words "braces" and "تقويم"; neither contains a price (no "AED", no "درهم") |
| AC5 | A reminded patient replies "What times are available?" (or the same in Arabic); and another patient replies with anything else, such as "How much is a filling?" | The first gets a reply in the same language that lists exactly the free braces times for their Friday (for 2026-11-06 with nothing booked by the receptionist: 17:40, 18:00, 18:20, 19:00, 19:20, 19:40, 20:00, 20:20, 20:40, 21:00, 21:20, 21:40), one per line in order, with a warm opening and a closing question and no time outside the calendar. The second gets no answer to the question, a kind holding reply, and the status `needs_person` |

## Known risks

A wrong patient list means a wrong reminder, and a wrong calendar means a wrong time offered. A person catches both by reading the weekly run summary (sent, skipped, needs_person counts) before the run is accepted. A cold or robotic message would put patients off: the receptionist approves the wording once.
