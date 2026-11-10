# Feature list: Braces Reminder Agent

Source: `docs/prd.md`. Build order: data in, decide (code), message, send window, send to simulator, hand over, booking and confirmation, then replies.

## Features

| ID | Feature (what a person can do or see) | Done check | AC | Version | Status |
|---|---|---|---|---|---|
| F1 | A synthetic list of 60 patients (50 braces with Friday due dates, 10 other), some bookings, and the braces Friday calendar | `npm run seed` then the Patients screen shows 60 rows, 50 marked braces, and the calendar shows 15 slots for 2026-11-06 with 12 free | AC1, AC5 | v1 | done |
| F2 | Pick a Monday and press "Run this week"; code picks braces patients due that week's Friday, plus those from the Friday before who still have no booking (B1, B2, B3) and shows sent / skipped / needs person counts | Run Monday 2026-11-02: summary shows 12 to send (visits on Friday 2026-11-06), 0 non-braces; a booked patient shows `skipped_booked`. Run Monday 2026-11-09: summary shows 24 to send (12 first reminders, 12 second reminders) | AC1, AC2 | v1 | done |
| F3 | One approved, warm reminder in English and Arabic (greeting, first name, Liwan Dental, date, "braces"/"تقويم", no price), checked before sending | `npm test` passes the reminder wording test | AC4 | v1 | done |
| F4 | Each reminder gets a send time between 17:00 and 22:00 clinic time | After a run, every reminder shows a send time inside that window, even if the run is pressed at 09:00 | AC1 | v1 | done |
| F5 | Reminders appear in the /phone simulator for each patient at their send time | Open /phone for a patient and see the bilingual reminder after the run | AC1, AC4 | v1 | done |
| F6 | Running the same week again sends nothing new; the next Monday sends a second reminder to those who still have no booking | Press "Run this week" twice: second run shows 0 new reminders. Then run the next Monday: patients from last week with no booking get their second reminder | AC2 | v1 | done |
| F7 | Patients with a missing or invalid phone, or with no booking after two reminders, appear on a call list and are not sent anything | A patient with no phone shows `needs_person` on the list and no message in /phone. Run Monday 2026-11-16: the 12 patients from 2026-11-06 are on the list with no third message | AC1, AC2 | v1 | done |
| F8 | The receptionist picks a patient and a free slot on a booking screen and books it; a taken slot cannot be booked twice | Book a patient into 2026-11-06 18:00: the patient shows booked and 18:00 leaves the free list; booking 18:00 again is refused | AC3 | v1 | done |
| F9 | The patient automatically gets a warm confirmation (English and Arabic) with the day and time as soon as the receptionist books | After the booking in F8, /phone shows: greeting, first name, Liwan Dental, "Friday 6 November" and "18:00"; the patient gets no later reminders; `npm test` passes the confirmation wording test | AC3, AC4 | v1 | done |
| F10 | A patient types "What times are available?" in /phone (English or Arabic) and gets a warm reply saying braces visits are on their Friday between 5 p.m. and 10 p.m. (no 20-minute times listed) | Type it for a 2026-11-06 patient: the reply says "Friday 6 November" and "between 5 p.m. and 10 p.m." with no times like 17:40; the same in Arabic gets an Arabic reply | AC5 | v1 | done |
| F11 | A patient who names a time or wants to book, or asks anything else, gets a kind reply and goes on the call list for the receptionist | Type "Friday 18:00 please": reply says the receptionist will confirm, nothing is booked, the call list shows "Wants to book a time". Type "How much is a filling?": holding reply, no price, call list shows it | AC5 | v1 | done |
| F13 | Jev reads patient messages and Claude adds one checked warm sentence to replies (optional, `AI_MODE=ai`); urgent messages go first on the call list | With both keys set, "what do you have for braces?" gets the window reply with the engine, confidence and time shown; "Friday 18:00 please" still goes to the receptionist; with no keys the replies are the fixed ones | AC4, AC5 | v1 | done |
| F14 | Braces patients who ask the price are told AED 300; pain or damage gets a short sympathetic reply and goes first on the call list | "how much does it cost?" shows AED 300 and no call entry; "my bracket broke and it hurts" shows the caring reply and URGENT first on /calls | AC5 | v1 | built, needs a real run |
| F12 | A log of every run, reply and confirmation with the checks and results | Log screen shows run id, patient, status, reason | AC1-AC5 | later | not started |

## Later
- Weekly run on a real schedule instead of a button.
- Letting a patient pick and book a time in the chat (a person books today).
- Run log screen (F12).
