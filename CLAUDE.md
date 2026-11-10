# Braces Reminder Agent

Type: AI solution (WhatsApp-simulator reminder agent). Same stack as ../liwan-desk: Next.js, zod, Anthropic SDK, Jev (see docs/jev-rules.md once copied), /phone simulator, AI_MODE=templates fallback.

## Rules
- Braces patients only. Monday run. Max two reminders per visit, then the call list. Reminders 17:00-22:00 clinic time. Braces visits are Fridays 17:00-22:00. One approved bilingual template. Nothing else. Do not add other reminder types or rules.
- Code decides who gets a reminder; the message text is a fixed template sent by code.
- Synthetic data only. No real sending: simulator only.
- Every run and every skipped/needs_person patient is logged with the reason.

## Voice (keep from liwan-desk)
- The patient must never feel they are talking to an automation: warm, short, first name, greeting, clinic name, same language as the patient (English or Arabic).
- Code builds the facts and any list (times) in tidy order; the model only writes a warm opening and a closing question around it. Never let the model write a time, date or price, or say anything is booked.
- Anything the agent cannot answer gets a kind holding reply and goes to the front-desk manager.
- The only replies the agent gives are the free braces times (B7) and the booking confirmation after the receptionist books (B8). The confirmation's day and time come from the booking record. Check the memory note agents-must-feel-human.
