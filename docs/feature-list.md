# Feature list: Braces Reminder Agent

Source: `docs/prd.md`. Build order: data in, decide (code), message, send window, send to simulator, hand over, booking and confirmation, then replies.

## Features

| ID | Feature (what a person can do or see) | Done check | AC | Version | Status |
|---|---|---|---|---|---|
| F1 | A synthetic list of 60 patients (50 braces with Friday due dates, 10 other), some bookings, and the braces Friday calendar | `npm run seed` then the Patients screen shows 60 rows, 50 marked braces, and the calendar shows 15 slots for 2026-11-06 with 12 free | AC1, AC5 | v1 | not started |
| F2 | Pick a Monday and press "Run this week"; code picks braces patients due that week's Friday, plus those from the Friday before who still have no booking (B1, B2, B3) and shows sent / skipped / needs person counts | Run Monday 2026-11-02: summary shows 12 to send (visits on Friday 2026-11-06), 0 non-braces; a booked patient shows `skipped_booked`. Run Monday 2026-11-09: summary shows 24 to send (12 first reminders, 12 second reminders) | AC1, AC2 | v1 | not started |
| F3 | One approved, warm reminder in English and Arabic (greeting, first name, Liwan Dental, date, "braces"/"تقويم", no price), checked before sending | `npm test` passes the reminder wording test | AC4 | v1 | not started |
| F4 | Each reminder gets a send time between 17:00 and 22:00 clinic time | After a run, every reminder shows a send time inside that window, even if the run is pressed at 09:00 | AC1 | v1 | not started |
| F5 | Reminders appear in the /phone simulator for each patient at their send time | Open /phone for a patient and see the bilingual reminder after the run | AC1, AC4 | v1 | not started |
| F6 | Running the same week again sends nothing new; the next Monday sends a second reminder to those who still have no booking | Press "Run this week" twice: second run shows 0 new reminders. Then run the next Monday: patients from last week with no booking get their second reminder | AC2 | v1 | not started |
| F7 | Patients with a missing or invalid phone, or with no booking after two reminders, appear on a call list and are not sent anything | A patient with no phone shows `needs_person` on the list and no message in /phone. Run Monday 2026-11-16: the 12 patients from 2026-11-06 are on the list with no third message | AC1, AC2 | v1 | not started |
| F8 | The receptionist picks a patient and a free slot on a booking screen and books it; a taken slot cannot be booked twice | Book a patient into 2026-11-06 18:00: the patient shows booked and 18:00 leaves the free list; booking 18:00 again is refused | AC3 | v1 | not started |
| F9 | The patient automatically gets a warm confirmation (English and Arabic) with the day and time as soon as the receptionist books | After the booking in F8, /phone shows: greeting, first name, Liwan Dental, "Friday 6 November" and "18:00"; the patient gets no later reminders; `npm test` passes the confirmation wording test | AC3, AC4 | v1 | not started |
| F10 | A patient types "What times are available?" in /phone (English or Arabic) and gets a warm reply with a tidy list of the free braces times for their Friday | Type it for a 2026-11-06 patient: the reply lists the 12 free times in order, one per line, with a warm opening and a closing question; the same in Arabic gets an Arabic reply | AC5 | v1 | not started |
| F11 | Any other question gets a kind holding reply and the patient goes on the call list | Type "How much is a filling?": reply says it has been passed to the receptionist, gives no price, and the call list shows the patient | AC5 | v1 | not started |
| F12 | A log of every run, reply and confirmation with the checks and results | Log screen shows run id, patient, status, reason | AC1-AC5 | later | not started |

## Later
- Weekly run on a real schedule instead of a button.
- Letting a patient pick and book a time in the chat (a person books today).
- Run log screen (F12).
