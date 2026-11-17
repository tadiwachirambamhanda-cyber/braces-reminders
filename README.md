# Smile Book: braces reminder agent

A WhatsApp reminder agent for a dental clinic in Dubai. Every Monday it finds the braces patients whose monthly visit is on Friday and who have not booked, and sends each a warm reminder in **English and Arabic**. This is a practice project: it runs on a phone-style simulator, uses **made-up patients only**, and sends nothing to real people.

## The problem
About 50 braces patients must come back every month, and about 20 of them miss their visit. Reminding them by hand is slow.

## What it does
- **Weekly run:** picks braces patients due that Friday with no booking, plus patients from last week who still have not booked (a second reminder).
- **Hard rules in code:** braces patients only, at most two reminders per visit, sent only between 17:00 and 22:00 clinic time (UTC+4). After two reminders with no booking the patient goes on a **call list** for a person. A missing phone number does too.
- **Receptionist screens:** approve the wording once, book 20-minute Friday slots (a taken slot cannot be booked twice), and work the call list. A booking sends an automatic confirmation with the exact day and time.
- **Replies:** when braces visits happen, the fixed price (AED 300), and a caring reply to pain or damage that goes first on the call list. Anything else is handed to the receptionist.

## Code decides, AI writes the words
Code chooses who is contacted and builds every time, date and price. Claude only adds one short warm sentence, and Jev can read what a reply means. Every AI sentence must pass checks, otherwise fixed wording is used. The AI never writes a time, date or price and never says anything is booked. With `AI_MODE=templates` the whole agent runs without any AI.

## Run it
```bash
npm install
npm run seed     # 60 made-up patients (50 braces, 10 other)
npm run dev      # http://localhost:3000
npm test         # 193 tests
```
Pages: `/run` (weekly run), `/book` (booking), `/calls` (call list), `/wording` (approve wording), `/phone` (patient simulator).
Copy `.env.example` to `.env.local` and fill in the keys only if you want the AI parts (`AI_MODE=ai`).

## Quality
12 test files, **193 passing tests**, 14 features each with a checkable done-test, 5 written acceptance criteria (see `docs/prd.md` and `docs/feature-list.md`), and three rounds of independent AI code review.

## Stack
Next.js 16, React 19, TypeScript, Zod, Claude (Anthropic SDK), Jev classifier, Vitest, GitHub Actions.

## Not included (on purpose)
No real WhatsApp sending, no staff login and no database (data is kept in files). All three would be needed before real use.
