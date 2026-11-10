# Plan: restyle the six screens (direction A, appointment book)

## Goal
After this, every existing screen of Smile Book looks like the approved designs in `design/handoff/` (warm paper, ink, one green, clay red for urgency, serif titles, ledger tables, phone chat, Arabic right-to-left, tables that stack on phones). What each screen does does not change.

## Feature
Not a feature-list ID. It is the styling of F1 to F14's screens. Done check: all six routes match `design/handoff/*.dc.html` and the contracts in `docs/ux/screen-map.md` at 1440 and 390 wide, and every existing test and `data-testid` still works. Serves no acceptance criterion; AC1 to AC5 must not change.

## Steps
1. Tokens and fonts: in `src/app/globals.css` add the handoff tokens (paper, ink, soft, rule, green, clay, chat colours) as CSS variables and Tailwind theme colours; in `src/app/layout.tsx` swap Geist for Newsreader, Source Sans 3 and Noto Naskh Arabic via `next/font/google`. See: any page now shows paper background and the new fonts.
2. Shared parts: restyle `src/app/nav.tsx` (name "Smile Book" with "Liwan Dental" small, active link underline, wraps on phones) and add a few shared class names (ledger row, status dot, strip, primary and quiet button, field) in `globals.css`. See: the nav on every page.
3. `/calls` and `/`: ledger rows, status dot plus word, URGENT row tint, red strip "N urgent patient" shown only when an urgent row exists, count, "Book a visit" link; patients table and Friday calendar as in the handoff. See: both pages match the handoff at 1440.
4. `/run` and `/book`: one large "to send" figure with small other counts, ledger result table, green and clay message strips, fields and the one primary button. See: both pages match.
5. `/phone`: beige chat ground, green outgoing and white incoming bubbles, Arabic as its own right-to-left block with the Arabic font, AI line directly under the bubble in small monospace (no line and no gap when AI is off). See: send "How much does it cost?" and see the reply and AI line.
6. `/wording`: two numbered sets with an approved or not-approved status line, English and Arabic side by side, the AI sentence rules as a numbered list, one Approve button per set. See: the page matches.
7. Phone widths: add the under-640px rules (rows stack, header labels hide, padding 20px, nav wraps) and check all six routes at 390 wide. See: no sideways scrolling.

## Files
`src/app/globals.css`, `src/app/layout.tsx`, `src/app/nav.tsx`, `src/app/page.tsx`, `src/app/run/page.tsx`, `src/app/phone/page.tsx`, `src/app/calls/page.tsx`, `src/app/book/page.tsx`, `src/app/wording/page.tsx`. Nothing under `src/lib/`, `data/`, `tests/` or `scripts/`.

## Checks
- `npm run lint`, `npm run typecheck`, `npm test` all pass with no test edited.
- `npm run build` succeeds (fonts load).
- `grep -rn "data-testid" src/app` shows the same ids as before this branch (none removed or renamed).
- Run `npm run seed`, open each of `/`, `/run`, `/phone`, `/calls`, `/book`, `/wording` on the dev server at 1440 and at 390 wide; each matches its handoff screen, has one green primary button, and has no sideways scroll at 390.
- On `/run` run Monday 2 Nov: "12 to send" shown large. On `/calls` after the pain message "my bracket broke and it hurts" the red strip and URGENT row are first. On `/phone` Arabic text is right-aligned.
- Then run /ux-check against `docs/ux/screen-map.md`.

## What could break
The riskiest step is `/phone` and `/wording` (server actions, forms, Arabic direction): a changed form name or a removed `data-testid` would break sending, approving or a test. I keep every form field name, action and test id exactly as they are and only change class names and wrapper markup.

## Not doing
No new routes, fields, settings, login, dark mode, analytics or animations. No text or rule changes (wording stays in `src/lib`). No real screenshots committed. No change to `docs/`, `design/` or the AI logic.

## Questions
1. Fonts are loaded from Google Fonts at build time through `next/font`. Is that fine for this practice project (yes recommended), or should they be self-hosted files?
2. This branch builds on `docs/design-handoff` (pull request 9). It should be merged after pull request 9. OK?
