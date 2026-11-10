# Plan: restyle the six screens (direction A, appointment book)

## Goal
After this, every existing screen of Smile Book looks like the approved designs in `design/handoff/` (warm paper, ink, one green, clay red for urgency, serif titles, ledger tables, phone chat, Arabic right-to-left, tables that stack on phones). What each screen does does not change.

## Feature
Not a feature-list ID. It is the styling of F1 to F14's screens. Done check: all six routes match `design/handoff/*.dc.html` and the contracts in `docs/ux/screen-map.md` at 1440 and 390 wide, and every existing test and `data-testid` still works. Serves no acceptance criterion; AC1 to AC5 must not change.

## Steps
1. Tokens and fonts: in `src/app/globals.css` add the handoff tokens (paper, ink, soft, rule, green, clay, chat colours) as CSS variables and Tailwind theme colours; in `src/app/layout.tsx` swap Geist for Newsreader, Source Sans 3, IBM Plex Mono (the AI line) and Noto Naskh Arabic (with the `arabic` subset) via `next/font/google`; the Arabic font is applied to every Arabic block on every screen, not only /phone and /wording. See: any page now shows paper background and the new fonts.
2. Shared parts: restyle `src/app/nav.tsx` (name "Smile Book" with "Liwan Dental" small, active link underline, wraps on phones) and add a few shared class names (ledger row, status dot, strip, primary and quiet button, field) in `globals.css`. See: the nav on every page.
3. `/calls` and `/`: ledger rows, status dot plus word, URGENT row tint, red strip worded as in the screen map ("1 urgent patient: call Omar first"; "2 urgent patients: call Omar first" when there are two, naming the top urgent row), built from the data the page already reads, shown only when an urgent row exists, above the rows, count, "Book a visit" link; patients table and Friday calendar as in the handoff. See: both pages match the handoff at 1440.
4. `/run` and `/book`: one large "to send" figure with small other counts, ledger result table, green and clay message strips, fields and the one primary button. See: both pages match.
5. `/phone`: beige chat ground, green outgoing and white incoming bubbles, Arabic as its own right-to-left block with the Arabic font, AI line directly under the bubble in small monospace (no line and no gap when AI is off). See: send "How much does it cost?" and see the reply and AI line.
6. `/wording`: two numbered sets with an approved or not-approved status line, English and Arabic side by side, the AI sentence rules as a numbered list, one Approve button per set. See: the page matches.
7. Phone widths: add the under-640px rules (rows stack, header labels hide and each stacked cell shows its own small label through a `data-label` attribute, padding 20px, nav wraps) and check all six routes at 390 wide. See: no sideways scrolling.

## Files
`src/app/globals.css`, `src/app/layout.tsx`, `src/app/nav.tsx`, `src/app/page.tsx`, `src/app/run/page.tsx`, `src/app/phone/page.tsx`, `src/app/calls/page.tsx`, `src/app/book/page.tsx`, `src/app/wording/page.tsx`. Nothing under `src/lib/`, `data/`, `tests/` or `scripts/`.

## Checks
- `npm run lint`, `npm run typecheck`, `npm test` all pass with no test edited.
- `npm run build` succeeds (fonts load).
- `grep -rn "data-testid" src/app` shows the same ids as before this branch (none removed or renamed).
- Run `npm run seed`, open each of `/`, `/run`, `/phone`, `/calls`, `/book`, `/wording` on the dev server at 1440 and at 390 wide; each matches its handoff screen, has one green primary button, and has no sideways scroll at 390.
- On `/run` run Monday 2 Nov: "12 to send" shown large. On `/calls` after the pain message "my bracket broke and it hurts" the red strip and URGENT row are first. On `/phone` Arabic text is right-aligned.
- Before and after: compare every `<form>`, `name=` and `action` in `src/app/**` with the main branch (`git diff` shows only class and wrapper changes, no changed names or actions).
- Click through each job still working: send a message on `/phone`; approve both sets on `/wording` (with a throwaway approval file, then remove it); run Monday 2 Nov on `/run`; book a free slot on `/book`.
- Walk the states against `design/handoff/states.dc.html`: refused run (wording not approved), not a Monday, slot taken, booked but confirmation not sent, empty `/calls`, wording not approved and approved but changed, AI off (no AI line, no gap) and AI on.
- Then run /ux-check against `docs/ux/screen-map.md`.

## What could break
The riskiest step is `/phone` and `/wording` (server actions, forms, Arabic direction): a changed form name or a removed `data-testid` would break sending, approving or a test. I keep every form field name, action and test id exactly as they are and only change class names and wrapper markup.

## Not doing
No new routes, fields, settings, login, dark mode, analytics or animations. No text or rule changes (wording stays in `src/lib`). No real screenshots committed. No change to `docs/`, `design/` or the AI logic.

## Questions
1. Fonts are loaded from Google Fonts at build time through `next/font`. Is that fine for this practice project (yes recommended), or should they be self-hosted files?
2. This branch builds on `docs/design-handoff` (pull request 9). It should be merged after pull request 9. OK?

## Plan check
A fresh reviewer returned five findings; all were accepted.
- Tests do not open pages, so a broken form would pass: added the form `name=`/`action` comparison and click-through checks.
- States were not covered: added the state walk against `states.dc.html`.
- No monospace font and no Arabic subset named: added IBM Plex Mono and the `arabic` subset, applied on every Arabic screen.
- Strip wording differed from the screen map: step 3 now uses the screen map wording.
- Stacked phone cells lose their labels: added `data-label` in step 7.

## Changes from the plan
- Added one extra `data-testid="urgent-strip"` on the `/calls` red strip. No other id was added, removed or renamed.
- The status dot is drawn with `::after` (not `::before`) so the phone-width label can sit before it.

## Verification
- `npm run lint`, `npm run typecheck`: pass. `npm test`: 12 files, 193 tests pass, no test edited. `npm run build`: succeeds with the new fonts.
- Form names, hidden fields, `action={...}` and `method="get"` compared with main: identical. Test ids: identical plus the one new id above.
- Seeded and run on the dev server (port 3012, own data folder): approved both wording sets through the real forms with a throwaway name; ran Monday 2 Nov: "12 reminders created, 1 skipped, 1 needs a person"; ran Monday 9 Nov preview: 24 to send; on `/phone` sent "How much does it cost?" (AED 300 reply, Arabic block right-to-left) and "my bracket broke and it hurts"; `/calls` then showed the red strip "1 urgent patient: call Sara first" and the URGENT row first; `/book` booked a free slot and showed the green strip.
- At 375px wide none of the six pages scrolls sideways; table rows stack with their own labels (a label overlap on status cells was found and fixed).
- Not yet walked: every state on the states sheet (refused run, not a Monday, slot taken, empty call list, AI on and off) beyond the ones above; `/ux-check` not run.

## UX check (2026-11-11, 13 screens and states, 1440 and 390 wide)
Round 1 critic: 5 screens failed, 2 distinct P0 defects. Fixed: the refused run (`/run`) and "booked, confirmation not sent" (`/book`) now link to the Wording page; empty labels hidden on phones; the nav brand has its own row on phones; the patient list is shorter on phones; the calendar sits first on phones; the approve button is quiet ("Approve again") once a set is approved; the AI prompt text is readable size; a hint line shows on `/run` before a run.
Round 2 critic: no P0. Remaining P1, dismissed because they would change app behaviour or wording, which this restyle must not do (ideas for later): two Monday pickers on `/run` (two forms: run and preview); different names for the same outcome ("skipped booked" vs "skipped (booked)"); "planned" on typed patient messages; "URGENT:" repeated in the call reason; the preview shown under a refused run; the booked-but-not-sent result shown in clay; the form not resetting after a booking; 5-line stacked rows on phones (a compact two-line row is a later design choice). Not checked: empty states with no data and AI-on on `/phone` (needs keys).

## Codex review
Round 1: FINDINGS(1). #1 MINOR, ledger rows lost table semantics for screen readers: Fixed (table, row, columnheader and cell roles added).
Round 2: VERDICT: PASS (no findings).
Reply and reminder wording: `git diff origin/main -- src/lib data tests scripts` is empty, so `wordingHash()` and `repliesWordingHash()` inputs are unchanged and no re-approval is needed.

## Merge order
Merge after pull request 9 (design handoff), which this branch builds on.
