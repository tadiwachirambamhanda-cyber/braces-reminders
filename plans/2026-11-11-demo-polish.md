# Plan: demo polish (phone frame, plain times, one name per outcome)

## Goal
For a demo, `/phone` looks like a real phone with a WhatsApp-style chat (like liwan-desk's), messages a person types show a plain time, and `/run` calls each outcome by one name everywhere. Nothing the app does, and no reply or reminder wording, changes.

## Feature
Not a feature-list ID. Polishes F5 (phone simulator) and F2 (run screen). Done check: the three changes below are visible; `npm test` still passes; AC1 to AC5 numbers unchanged (Monday 2 Nov still shows 12 created, 1 skipped, 1 needs a person).

## Steps
1. `/phone` frame: in `src/app/phone/page.tsx` wrap the chat in a phone-shaped frame (rounded body with a dark 8px border and a soft shadow, as in `../liwan-desk/src/app/phone/page.tsx`), a header bar with the patient's first name and "online", the beige chat ground, the message bar at the bottom as a pill field and a round-ish Send button, in direction A colours (green header `#2F5D50`, chat ground `#EAE1CF`). The patient list stays beside it on desktop and above it on phones. Keep every `data-testid`, the form, field names and the AI line under each bubble. See: `/phone?patient=P001` shows a phone.
2. Plain time on typed messages: patient messages (`direction` in) show "Sara, 2026-11-10 20:05" without the word "planned"; messages from the clinic keep "planned". See: type a message and read its stamp.
3. One name per outcome on `/run`: use "to send", "skipped (booked)" and "needs a person" in the counts, table and preview, and "sent" is shown as "to send" in the preview and "sent" after a run (one word per state: to send, sent, skipped, needs a person). Only the visible labels change, not the data values (`STATUS_LABEL` and the strings drawn from `r.status`). See: `/run` preview and run-done show the same words.
4. Check phone width: the frame fits 375px wide with no sideways scroll.

## Files
`src/app/phone/page.tsx`, `src/app/run/page.tsx`, `src/app/globals.css` (frame classes), and this plan. Nothing in `src/lib/`.

## Checks
- `npm run lint`, `npm run typecheck`, `npm test` (193 pass, none edited), `npm run build`, with no env vars.
- `git diff origin/main -- src/lib data tests scripts` is empty (wording hashes unchanged).
- Dev server: `/phone?patient=P001` shows the frame; type "How much does it cost?" and see the reply, Arabic block right-to-left, the typed bubble stamp without "planned". `/run`: Monday 2 Nov gives "12 reminders created, 1 skipped, 1 needs a person"; labels match in preview and run-done.
- 375px wide: no sideways scroll on `/phone` and `/run`.
- /ux-check on `/phone` and `/run` at 1440 and 390.

## What could break
The phone page form (`name="text"`, `name="patient"`, the server action): wrapping it in the frame must not move the Send button outside the form. I keep the same form element and only change wrapper markup.

## Not doing
No change to replies, reminders, rules or data. No second Monday picker merge, no compact phone rows, no new pages. No real WhatsApp branding or logo.

## Questions
1. The frame is in the warm green of direction A, not WhatsApp's bright green. OK (recommended), or use WhatsApp green?
2. Merge order: this builds on pull request 10, which builds on pull request 9. OK?

## Verification
- Lint, typecheck, 193 tests (none edited) and the build pass with no env vars. `git diff origin/main -- src/lib data tests scripts` is empty, so the wording hashes are unchanged. Secrets scan of the diff: nothing.
- Dev server (port 3013): `/phone?patient=P001` shows the phone frame (rounded body, green header with "Sara, P001, online", chat, message bar). A typed message shows "Sara, 2026-11-10 20:46" (no "planned"); clinic messages keep "planned". `/run` labels after a run: sent, skipped (booked), needs a person; preview: to send, skipped (booked), needs a person; counts match. At 375px wide no sideways scroll on `/phone` and `/run`.
- Not re-run: the full /ux-check screenshot pass (the same pages passed it with the restyle).

## Codex review
Round 1: FINDINGS(2). #1 MINOR (after-run count said "reminders created", preview said "to send"): Fixed, now "sent". #2 MINOR (white text on the green phone header may be low contrast): Dismissed. Paper `#F6F1E7` on green `#2F5D50` is about 6.5:1 and the 12px status line at 85% opacity is about 5.5:1, both above 4.5:1.
Round 2: FINDINGS(1), the same as round 1 item 2, dismissed again with the same reason. Round 3: VERDICT: PASS.

## Merge order
After pull request 9 (design handoff), then pull request 10 (restyle). This branch builds on both.
