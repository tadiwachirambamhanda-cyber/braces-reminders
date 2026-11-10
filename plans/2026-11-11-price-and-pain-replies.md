# Plan: F14 Answer the braces price, and a caring reply to pain or damage

Small change, ordered by the owner on 2026-11-11 after the real Jev and Claude run.

## Goal
After this, a braces patient who asks what it costs is told the price (AED 300), and a patient who writes about pain, bleeding or damage gets a short, sympathetic reply (not "thank you for your message") that suggests coming to the clinic as soon as possible, and says the receptionist will speak to them.

## Feature
- ID: F14. Serves AC5 and AC4. This changes two earlier rules on purpose: B7 ("the only reply is the visit window") and the scope brief's "no prices".
- Done check: in /phone, "how much does it cost?" gets a reply containing "AED 300" and no call list entry; "my bracket broke and it hurts" gets the sympathetic reply and URGENT on the call list; both work with and without AI.

## Rules (decided by the owner)
- P1: A braces appointment costs AED 300. The number lives in one constant in code. The model never writes it. Only braces patients are told it; anyone else still gets the holding reply and the call list.
- P2: Any price or cost question gets the price reply. If the same message also names a day or time ("Friday at 6, how much?"), the receptionist handles it (booking reply), because a person must book.
- P3: If the patient might be asking about something other than braces, the price reply says the receptionist can help with anything else. No other prices exist.
- U1: Pain, bleeding, swelling, broken or loose bracket or wire, damage: the urgent reply, found by Jev (`pain_or_urgent`) or, with no AI, by keywords in English and Arabic. It always wins over every other intent.
- U2: The urgent reply is fixed wording: sorry to hear it, come to the clinic as soon as possible if you can so a dentist can see you, the receptionist has been told and will speak to you, and for something severe go to the nearest emergency department. No times, no medical advice, no AI sentence. The call list shows it first as URGENT.

## Steps
1. Add the price constant, the two new reply wordings (English and Arabic) and their builders with checks (price reply holds exactly "AED 300" or "300 درهم" and no other number; urgent reply has no number, price or booked claim). The replies hash covers them, so the receptionist approves again. Done when unit tests pass.
2. Change the decision in `decideIntent`: urgent first, then a named time, then price, then the rest. Add the keyword urgent check. Done when tests show each rule above.
3. Show the two new wordings on /wording. Done when the page lists them.
4. Update the tests that encoded the old rule (price gets the holding reply): expectations change on purpose, since the rule changed. Done when `npm test` passes.
5. Update the PRD, scope brief and CLAUDE.md wording for B7. Real run in /phone with Jev and Claude.

## Files
`src/lib/replies-wording.ts`, `src/lib/replies.ts`, `src/lib/state.ts` (a `price_reply` message kind), `src/app/wording/page.tsx`, `tests/replies.test.ts`, `tests/ai.test.ts`, `docs/prd.md`, `docs/scope-brief.md`, `CLAUDE.md`, `docs/feature-list.md`.

## Approval and data
Nothing new leaves the app. The receptionist must approve the replies wording again; the price is part of what they approve.

## Checks
Unit tests for P1 to P3 and U1, U2 in English and Arabic, with and without AI; the existing tests pass except the ones that encoded the old price rule; a real run in /phone.

## What could break
The keyword urgent check could catch ordinary messages (for example "my appointment hurts my schedule"). It errs toward a caring reply plus a call list entry, which is the safe side.

## Not doing
No other prices, no discounts, no medical advice, no opening hours for the clinic, no extra AI. The "do not start with thanks" prompt change is left out.

## Questions
- The urgent wording says "so a dentist can see you". Please check it on /wording before approving.
