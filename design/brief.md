# Design brief: Smile Book

For: Claude Design. From: the owner. Date: 2026-11-11. Needed back by: as soon as ready (practice project, no deadline).

## What this is and who uses it

The app in two sentences: a practice tool for Liwan Dental that reminds braces patients by WhatsApp to book their monthly Friday visit, and puts the ones who did not book on a call list. Patients only ever see a simulated phone; everything is made up.

The one person it is for: **the front-desk receptionist** at Liwan Dental. They approve the wording once, press "Run this week" every Monday, call the patients on the call list and book them into a free Friday time. They are not technical and are often interrupted, so the screens must be calm and obvious.

## Read these first

Screen map: `docs/ux/screen-map.md` (the six screens and their contracts).
Product details: `docs/prd.md` and `docs/feature-list.md`.

Inspiration: `design/inspiration.md` (links and the principles taken; read it, then do not copy any of those shots). Images in `design/reference/`: none yet. The sister app `liwan-desk` is the style cousin: take its WhatsApp-like phone screen (soft green bubbles on a warm grey chat background) and its plain, friendly tone. Do not copy its plain tables; this app should look finished and distinct.

## Screens to design

All six exist today, in this nav order. Do not add, merge or remove any:

- `/` Patients (list of 60 patients and the Friday calendar)
- `/run` Run this week
- `/phone` Phone simulator (WhatsApp look, with the **AI line** under each message that has one)
- `/calls` Call list (URGENT rows first)
- `/book` Book a braces visit
- `/wording` Wording (two approval sets: reminders; confirmation and replies, including the AI sentence rules)

Design each in **English (left to right)** and show **Arabic (right to left)** where text appears: reminders and replies on `/phone` and `/wording` are English and Arabic in the same message, and the Arabic block must mirror correctly (right-aligned, own bubble direction). The app chrome (nav, labels) stays English.

## Chosen direction (owner decision, 2026-11-11): A, "Appointment book"

The owner compared three directions (appointment book, clean clinic, sand and terracotta) and chose **A**. Starting values from the approved sample; Claude Design may refine them and must explain any change:

- Paper `#F6F1E7`, ink `#2A2620`, soft text `#7B7365`, rules `#DDD3C0`, clinic green `#2F5D50` (actions), outgoing bubble `#DCE8D2`, chat ground `#EAE1CF`, clay red `#B4472B` (URGENT and errors only), attention strip `#F3DDD0`.
- Serif for titles and patient first names (sample used Newsreader), Source Sans 3 for everything else, Noto Naskh Arabic for Arabic message text (sample choices, not locked).
- Directions B (clean clinic) and C (sand and terracotta) are rejected; do not blend them in.

## Point of view (this is what keeps it from looking AI-made)

**The front-desk appointment book.** Think of the paper book a good receptionist keeps: warm paper, ink, ruled lines, one colour pen. Calm, human, a bit editorial, never a software ad.

- Ground: warm off-white paper, not pure white and not dark mode. Text: warm near-black ink. One clinic green for actions and outgoing messages (deeper and calmer than WhatsApp's). One clay red used only for URGENT and errors.
- Type: a warm serif for page titles and patient first names, a clean humanist sans for everything else, and a proper Arabic face matched to each (Arabic about 12 percent larger, line height about 1.7). Not Inter-only.
- Surfaces: hairline rules and spacing instead of boxes. Corner radius 4 to 6 px (chat bubbles 10 px). Tables read like a ledger: tabular numbers, 44 px rows.
- Status is a dot plus one word, never colour alone.
- Hierarchy: one sentence at the top of a screen says what needs attention ("1 urgent patient: call Omar first"). Then the main content. Numbers are not put in identical cards.
- Avoid on purpose: gradients, glass, glow, stock photos, tooth or sparkle icons, "AI" badges, emoji as icons, big rounded cards, centred hero blocks, equal four-card KPI rows, dark mode, a single geometric sans.

## Rules that cannot bend

1. One primary action per screen, as listed in the screen map. Everything else is quiet.
2. Every screen shows its empty, loading and error states (plus the extra states in the screen map).
3. On `/calls`, every URGENT row is above every other row and is visibly different at a glance (badge and colour, not colour alone).
4. On `/phone`, the AI line is directly under its message, smaller and quieter than the message, and never inside the bubble. When AI is off there is no AI line and no empty gap.
5. No gradients, no shadows except one on the phone frame, no emoji, and no row of identical stat cards; corners are 6 px or less (bubbles 10 px).
6. Arabic text is right-to-left in its own block; it is never mixed into a left-to-right line, and a screenshot at 390 wide shows no sideways scrolling and text that is easy to read (body text 16 px or larger on phone widths).

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

Exact colours, exact fonts, components, icons, spacing, and how Arabic is set, inside the point of view above. The owner has chosen no exact values. Choose type that has a proper Arabic face alongside the Latin one, and explain each choice. If you change anything above, tell us why.

## Send back

Into `design/handoff/`: one `.dc.html` prototype per screen, a screenshot of each (1440 and 390 wide, English and Arabic where relevant), and a `README.md` written to the coding agent that implements it. The README gives the tokens with exact values (colours, type sizes, spacing), each screen's parts and states, and a short note on your choices. It must say which of today's elements get restyled, and must not ask for any new route, field, or feature.
