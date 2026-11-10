# Design brief: Braces Reminders

For: Claude Design. From: the owner. Date: 2026-11-11. Needed back by: as soon as ready (practice project, no deadline).

## What this is and who uses it

The app in two sentences: a practice tool for Liwan Dental that reminds braces patients by WhatsApp to book their monthly Friday visit, and puts the ones who did not book on a call list. Patients only ever see a simulated phone; everything is made up.

The one person it is for: **the front-desk receptionist** at Liwan Dental. They approve the wording once, press "Run this week" every Monday, call the patients on the call list and book them into a free Friday time. They are not technical and are often interrupted, so the screens must be calm and obvious.

## Read these first

Screen map: `docs/ux/screen-map.md` (the six screens and their contracts).
Product details: `docs/prd.md` and `docs/feature-list.md`.

Inspiration images in `design/reference/`: none yet. The sister app `liwan-desk` is the style cousin: take its WhatsApp-like phone screen (soft green bubbles on a warm grey chat background) and its plain, friendly tone. Do not copy its plain tables; this app can look a little more finished.

## Screens to design

All six exist today, in this nav order. Do not add, merge or remove any:

- `/` Patients (list of 60 patients and the Friday calendar)
- `/run` Run this week
- `/phone` Phone simulator (WhatsApp look, with the **AI line** under each message that has one)
- `/calls` Call list (URGENT rows first)
- `/book` Book a braces visit
- `/wording` Wording (two approval sets: reminders; confirmation and replies, including the AI sentence rules)

Design each in **English (left to right)** and show **Arabic (right to left)** where text appears: reminders and replies on `/phone` and `/wording` are English and Arabic in the same message, and the Arabic block must mirror correctly (right-aligned, own bubble direction). The app chrome (nav, labels) stays English.

## Rules that cannot bend

1. One primary action per screen, as listed in the screen map. Everything else is quiet.
2. Every screen shows its empty, loading and error states (plus the extra states in the screen map).
3. On `/calls`, every URGENT row is above every other row and is visibly different at a glance (badge and colour, not colour alone).
4. On `/phone`, the AI line is directly under its message, smaller and quieter than the message, and never inside the bubble. When AI is off there is no AI line and no empty gap.
5. Arabic text is right-to-left in its own block; it is never mixed into a left-to-right line, and a screenshot at 390 wide shows no sideways scrolling and text that is easy to read (body text 16 px or larger on phone widths).

## Words to use (and never use)

Use: **Liwan Dental**, **braces**, **reminder**, **call list**, **front desk**, **receptionist**, **patient**, **first name**, **visit**, **Friday**, **book / booked**, **approve this wording**, **needs a person**. Times as 18:00. Friday visits are "between 5 p.m. and 10 p.m.".

Never use: "automation", "bot", "AI assistant" or "chatbot" as something the patient sees; "campaign", "workflow", "trigger", "lead", "ticket", "LLM", "token", "payload". On `/phone` the AI line is for the receptionist, the patient bubble never mentions AI. Never show the 20-minute slot times anywhere a patient could read them (they appear only on `/book` and `/`). The only price is **AED 300**, shown only in the price reply.

Voice of every patient message: warm, short, first name, greeting, Liwan Dental, same language as the patient.

## Sample content for the mock-ups

All made up. Clinic: Liwan Dental, Dubai. Today in the mock-up: Monday 2 November 2026 (visits on Friday 6 November, 17:00 to 22:00).

- Patients: P003 Sara (Jumeirah), P011 Omar (Al Barsha), P014 Layla (Business Bay), P021 Khalid (Al Nahda, Sharjah), P027 Noura (Mirdif), P034 Yousef (JVC), P041 Hessa (Al Quoz). Phones look like +971 50 000 0003 (fake).
- Reminder (bilingual in one message): "Hi Sara, it's Liwan Dental. Your braces visit is due on Friday 6 November. Reply here and we will help you find a time. / مرحباً سارة، معكِ عيادة ليوان. موعد تقويمك يوم الجمعة 6 نوفمبر."
- Price reply: "Your braces visit costs AED 300." (AED 300, no VAT line shown.)
- Urgent: Omar writes "my bracket broke and it hurts" and goes first on the call list, badge "URGENT".
- Normal call rows: Layla "Wants to book a time"; Khalid "No booking after two reminders"; Hessa "Asked something else"; Yousef "No usable phone number".
- `/run` counts for Monday 2 November: 12 to send, 1 skipped (booked), 1 needs a person, 0 others.
- `/book`: free Friday 6 November times such as 17:00, 17:20, 18:00; booking Sara at 18:00 gives "Booked. The patient has been sent a confirmation."
- AI line example (small, grey): "Read by: Jev (price, confidence 0.94), 820 ms. Warm sentence: written by AI, passed the checks." and "Warm sentence: fixed wording (too long)".
- `/wording` AI rules list: not empty, one short sentence, no question, no numbers, no day or month, no money, never says anything is booked, no promise, no thank you, no link, same language as the patient.

## You decide

Layout, colour, typography, components, icons, spacing, and how Arabic is set. The owner has chosen no colours or fonts. Pick a warm, clean, clinic-friendly look (calm, not cold-hospital, not playful). Choose type that has a proper Arabic face alongside the Latin one. If you change anything above, tell us why.

## Send back

Into `design/handoff/`: one `.dc.html` prototype per screen, a screenshot of each (1440 and 390 wide, English and Arabic where relevant), and a `README.md` written to the coding agent that implements it. The README gives the tokens with exact values (colours, type sizes, spacing), each screen's parts and states, and a short note on your choices. It must say which of today's elements get restyled, and must not ask for any new route, field, or feature.
