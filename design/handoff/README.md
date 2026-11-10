# Handoff: Smile Book, direction A "Appointment book"

For the coding agent that restyles the app. Restyle only. No new route, field, screen or feature. Do not change what any screen does. Canvas (private): https://claude.ai/artifact/7wC5T5JgoYkJSMe28yu64t

Files (each is a design prototype in the .dc.html format; read the markup and inline styles for exact values): `patients.dc.html` (/), `run.dc.html` (/run), `phone.dc.html` (/phone), `calls.dc.html` (/calls), `book.dc.html` (/book), `wording.dc.html` (/wording), `states.dc.html` (empty, loading, error for every screen). Open the canvas to see them rendered.

## Tokens (exact)
| Token | Value | Use |
|---|---|---|
| paper | `#F6F1E7` | page background |
| ink | `#2A2620` | text |
| soft | `#675F52` | secondary text (passes 4.5:1 on paper) |
| rule | `#DDD3C0` | hairlines between rows |
| strong rule | `#2A2620` 1px | top of every table |
| field border | `#B9AD96`, field fill `#FFFDF8` | inputs and selects |
| green | `#2F5D50` (hover `#1F4238`), text on it `#F6F1E7` | the one primary button, active nav underline, "sent/braces" dots |
| clay | `#B4472B` dot, `#8F3820` text, `#F3DDD0` strip, `#FBF0E8` urgent row | URGENT and errors only |
| good strip | `#DCE8D2` on text `#1F4238` | "Booked" message |
| chat ground | `#EAE1CF`; outgoing bubble `#DCE8D2`; incoming `#FFFFFF` | /phone |
| Fonts | Newsreader 500 (titles, first names), Source Sans 3 400/600 (everything else), Noto Naskh Arabic 400 (Arabic text, 18px, line height 1.8 to 1.9) | Google Fonts |
| Sizes | h1 40px, section h2 26-28px, body 16px, labels 13px caps with 0.04em, row min-height 48-56px, controls min-height 44px | |
| Radius | 4px controls and strips, 6px chat ground, bubbles 10px with a 2px tail corner | |
| Shadows, gradients | none | |

## Screens
- `/` Patients: ledger of patients (ID, first name, phone, treatment, booking) plus the Friday calendar as text rows. Primary action: Run this week (link to /run). Braces = green dot + the word. Missing phone in clay bold.
- `/run`: Monday select, **Run this week** (primary), Preview (outlined). Result: "12 to send" in large green serif, other counts small beside it (not equal cards). Ledger of results below. Needs a person = clay dot + words.
- `/phone`: patient list left, chat right. Beige ground, green outgoing bubbles. Reminder bubbles carry English then a ruled Arabic block (`dir="rtl"`, `lang="ar"`, right-aligned). The AI line is directly under the bubble, outside it: 12px monospace, soft colour, no icon. When AI is off, render no AI line and no empty gap. Primary: Send.
- `/calls`: title, one-line clay strip ("1 urgent patient. Call Omar first.") shown only when an urgent row exists, count "5 to call", ledger. URGENT rows first with clay dot, the word URGENT, and a `#FBF0E8` row tint. Other rows: grey dot + "Needs a person". Primary action: Book a visit (link to /book).
- `/book`: result line (green strip when booked, clay strip when refused), Patient and Free time selects, **Book** (primary).
- `/wording`: two numbered sets. Each set header shows status (green dot "Approved by ... on ..." or clay dot "Not approved yet"). Each wording is English left, Arabic right (stacks at phone width). The AI sentence rules are a numbered list in a tinted box above the second set's Approve button. One **Approve this wording** per set.

## Rules to keep
- One primary (green filled) button per screen. Status is always a dot plus a word, never colour alone.
- Arabic is always its own right-to-left block with Noto Naskh Arabic. Times such as 18:00 stay left-to-right.
- Text must pass 4.5:1. Controls at least 44px tall. Layout must not scroll sideways at 390px: header links wrap, tables scroll inside their own box.
- Copy comes from the existing app (reply and reminder wording lives in code); sample names and numbers in the prototypes are made up.

## Choices and open points
- Chose a serif only for titles and first names; ledger rows instead of cards; one green; clay red kept for urgency so it keeps its meaning.
- 390px frames: `calls-390`, `phone-390`, `run-390`, `wording-390` (same markup, shown in a 390 wide frame). Under 640px: table rows stack as one block per row (status, name, why, week), header labels hide, page padding drops to 20px, the nav wraps. Checked in a browser at 375px: no sideways scroll on /, /calls, /phone.
- The wording samples in `wording.dc.html` are illustrative; the real text comes from `src/lib`.
