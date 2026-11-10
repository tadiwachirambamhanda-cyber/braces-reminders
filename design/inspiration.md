# Inspiration board: Braces Reminders (Liwan Dental)

Method: the inspiration-board skill. References were browsed on dribbble.com in the built-in browser on 2026-11-11 (logged out, nothing saved or downloaded). We take **principles only**. No artwork, text, logo or layout is copied.

## 1. The brief

- **Designing:** the screens of a practice app for a dental clinic front desk: a WhatsApp phone simulator, a call list, wording approval pages, a run screen, a booking form and a patient list. English, plus Arabic right-to-left.
- **Fixed points:** clinic name Liwan Dental; braces patients only; Friday 17:00 to 22:00; patient messages must feel written by a person; no staff login; no new screens. No logo or palette exists yet.
- **Questions to answer:**
  1. How do the better clinic dashboards show "who needs a person first" without a wall of cards?
  2. How do good Arabic interfaces handle mirroring and type?
  3. What is the generic healthcare / AI look, so we can avoid it?
  4. What gives a screen a warm, human, editorial feel without looking like a 2026 template?

## 2. References (searched on Dribbble; principle each one taught)

Searches run: "dental clinic dashboard", "whatsapp chat ui", "arabic dashboard", "healthcare appointment reminder", "warm editorial serif dashboard".

### Layout and hierarchy
- [Dentify SaaS Dashboard](https://dribbble.com/shots/27813533-Simplifying-Dental-Clinic-Operations-Dentify-SaaS-Dashboard): one pale yellow strip at the top says the single thing that needs action today ("appointments at risk") with its own button, above everything else. Principle: **put the one urgent sentence above the data and give it a different colour from everything else.**
- [Dentify Reports Dashboard](https://dribbble.com/shots/27825860-Simplifying-Dental-Clinic-Operations-Dentify-Reports-Dashboard): status as small coloured text pills in a row list (In treatment, Checked in, No-show). Principle: **status belongs at the end of the row, one word, with a dot and a word, not colour alone.**
- [DentalPro: dentist performance](https://dribbble.com/shots/27212364-DentalPro-Dentist-Performance-Revenue-Insights) and [Zendenta dashboard](https://dribbble.com/shots/24369218-Zendenta-Dashboard-SaaS-of-Dental-Clinic): dense, readable tables with quiet column headers and a lot of row height. Principle: **density is fine when row rhythm and alignment are strict.**
- [Dental Clinic Dashboard (27296089)](https://dribbble.com/shots/27296089-Dental-Clinic-Dashboard), [Dentexa](https://dribbble.com/shots/26646298-Dentexa-Streamlined-HealthTech-Dashboard-for-Dental-Clinics): the strongest ones keep one accent colour and let white space do the grouping. Principle: **one accent, many greys.**

### Arabic and right-to-left
- [Arabic Dashboard: UI/UX](https://dribbble.com/shots/27707688-Arabic-Dashboard-UI-UX-Design): the whole layout is mirrored: navigation rail on the right, text flush right, numbers and chart direction considered. Principle: **mirror the layout, not only the text; keep Latin digits and times (18:00) as left-to-right islands inside Arabic lines.**
- [Arabic Dashboard, expense management](https://dribbble.com/shots/20404614-Arabic-Dashboard-Expense-Management-SaaS-Design-in-Arabic), [Employee Performance Dashboard](https://dribbble.com/shots/27739189-Employee-Performance-Dashboard-Design) (bilingual titles): Arabic needs more line height and a slightly larger size than Latin to look the same weight. Principle: **set Arabic about 10 to 15 percent larger with 1.7 line height, in its own typeface.**

### Messaging
- [WhatsApp chat UI results](https://dribbble.com/search/whatsapp-chat-ui): nearly all are purple-gradient, dark mode, glossy phone mock-ups. Principle (negative): **ours should look like WhatsApp's calm paper, not a product ad.** Take the real WhatsApp behaviours: soft beige chat ground, outgoing bubbles light green, tiny timestamps, corner "tail", no avatars on every message.

### Tone and type
- ["Warm editorial serif dashboard" results](https://dribbble.com/search/warm-editorial-serif-dashboard): a serif headline against a plain sans body gives instant warmth and a human voice. Principle: **a serif for names and page titles, a sans for data.** Caution: italic-serif-on-dark with a glow is already a 2026 template, so we keep ours on a light paper ground, upright, with no gradient.

## 3. Overdone, so we avoid it

Seen again and again in the results (healthcare appointment, chat, dashboards):

- Blue to purple gradients; glassy translucent cards; glow behind the phone.
- Every number in an identical rounded KPI card, four in a row.
- Stock doctor photos, tooth line icons with sparkles, "AI" sparkle badges.
- Huge border radius (16 to 24 px) on everything, drop shadows under every card.
- One geometric sans (Inter-like) for everything, tiny grey 11 px labels.
- Centred hero text on app screens.
- Emoji or filled blobs as icons.
- Dark-mode-only "futuristic" dashboards for a front desk that works in daylight.

## 4. Translation: principle to our design

| Principle | How it shows up in Braces Reminders | Originality note |
|---|---|---|
| One urgent sentence above the data, in its own colour | `/calls`: a single top line "1 urgent patient. Call Omar first" in clay red; below it, the ledger. `/run`: the refused-run message uses the same slot | Our own colour and wording; no KPI row |
| Status = dot + one word, at row end | Every row on `/`, `/run`, `/calls`: "Booked", "Needs a person", "URGENT" with a dot and the word | Never colour alone |
| One accent, many greys | One clinic green (a deep teal-green, not WhatsApp's bright green) for actions and the outgoing bubble; clay red only for URGENT and errors; everything else is warm ink and paper tones | Palette is warm paper + ink + one green + one clay |
| Density with strict rhythm | Tables are a ledger: hairline rules, no boxes, tabular numbers, 44 px rows, left-aligned text | Looks like the clinic's paper appointment book, not a SaaS table |
| Mirror the layout, not only the text | Arabic blocks have their own direction and alignment; whole-page mirroring is shown on `/phone` and `/wording`; times stay left-to-right inside Arabic lines | Applies only where the app shows Arabic |
| Arabic larger, taller, its own typeface | Arabic set about 12 percent larger, line height about 1.7, in a proper Arabic face chosen to match the Latin sans | Not a fallback font |
| Real WhatsApp behaviour | `/phone`: beige chat ground, light green outgoing bubble with a small tail, timestamp inside the bubble corner, no avatars | Quiet, not glossy |
| Serif for names and titles, sans for data | Page titles, patient first names in `/phone` header and call rows in a warm serif; everything else in a sans | Upright, light ground, no italic flourish |
| AI is a margin note, not a feature badge | The AI line is small, grey, set in a monospace-like tabular style directly under the bubble, with no sparkle, no "AI" pill | Opposite of the sparkle trope |

## 5. Concrete changes now (reflected in the brief and the screen map)

1. Point of view: **"the front-desk appointment book"**: warm paper ground, ink text, hairline rules, one green. Written into `design/brief.md`.
2. Rule: no gradients, no glass, no shadows except one soft shadow on the phone frame; corner radius 4 to 6 px, bubbles 10 px; no icon emoji. Written into the brief's rules.
3. `/calls`: top "urgent" line plus ledger rows, URGENT rows first with dot + word. Written into the screen map.
4. `/run`: counts shown as one line of large figures with uneven emphasis ("12 to send" big, the rest small), not four equal cards.
5. `/wording`: English and Arabic as a proof sheet, side by side, with an approval stamp at the top of each set; the AI sentence rules as a plain numbered checklist.
6. `/phone`: the AI line stays under its bubble, a smaller margin-note style; the Arabic blocks are mirrored.
7. Fonts: a serif plus a sans, each with a matching Arabic face (Claude Design picks, and explains).

## 6. Originality check

No single reference supplied more than one idea. Layout (ledger, not card grid), palette (paper, ink, deep green, clay), type (serif titles with matched Arabic) and composition (urgent line over a ledger) all differ from every reference seen. No text, logo or slogan was reused.
