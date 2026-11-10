# Screen map: Smile Book (Liwan Dental)

One row per screen. Each screen is judged against its row, on a screenshot of the running app. These are the six screens the app already has; no screen is added. Every screen is read at 1440 and at 390 wide, in English (left to right) and with Arabic text (right to left) where patient or reminder text appears.

| Route | Type | User | Job (one line) | Main content (must stand out) | Primary action (exactly one) | Other actions | States |
|---|---|---|---|---|---|---|---|
| `/` | list | Receptionist | See who the 60 patients are and which Fridays still have free braces times. | The patient table with the braces badge and "Booking" column; the calendar summary ("12 free") sits beside or under it. | Go to **Run this week** | Move through the nav | empty ("No patients yet, run the seed"), loading, error |
| `/run` | form + result | Receptionist | Pick a Monday and send that week's reminders, then see who was sent, skipped or needs a person. | The four counts (to send / skipped / needs person / other) and the result table under them. | **Run this week** | Preview (quiet button, changes nothing), change Monday | empty (no data), loading, error, "wording not approved" (run refused, link to `/wording`), "not a Monday", done (result shown) |
| `/phone` | detail (chat) | Receptionist, playing the patient | See exactly what a patient sees on WhatsApp and type a reply as them. | The chat bubbles. The AI line sits directly under each bubble that was read or worded by AI, small, quiet, never louder than the message. | **Send** (the patient's typed message) | Pick another patient in the list | empty ("No messages yet"), loading, error, sending, AI off (no AI line, fixed wording), AI on (engine, meaning, confidence, time, cost, "warm sentence: written by AI, passed the checks" or "fixed wording" with the reason) |
| `/calls` | list | Receptionist | Know who to call or answer, most urgent first. | The call rows. URGENT rows come first with a clear red badge and the patient's first name; the reason is one plain line. | Go to **Book** (existing nav link, to book a patient once they have been spoken to) | none | empty ("Nobody is on the call list"), loading, error, urgent, normal |
| `/book` | form | Receptionist | Book a braces patient into a free Friday time. | The two choices: patient and free time. | **Book** | none | empty (no data, or no free times), loading, error, booked, booked but confirmation not sent, slot taken, patient already booked, not a braces patient |
| `/wording` | form (approval) | Receptionist (front-desk manager) | Read the reminders, the replies and the AI sentence rules, and approve each set once. | The wording boxes, English and Arabic side by side on desktop, stacked on a phone; the approved / not approved status at the top of each set. | **Approve this wording** (one per set, so each set has its own button) | none | not approved yet, approved (name and time), approved but changed since (needs approving again), loading, error (name missing, could not save) |

Notes on the rows above:

- `/calls` has no per-row button (that would be a new feature). Its one action is the existing link to `/book`; the list itself is what the receptionist works from.
- `/wording` has two sets (Reminders, Confirmation and replies). Each set has one Approve button. Inside a set there is exactly one.
- The AI sentence rules on `/wording` are a short list that sits above the second Approve button; the rules are read, not edited.

## Look and feel per screen (from `design/inspiration.md`)

- `/` ledger of patients (hairline rows, braces shown as a word with a dot, "Booking" column) and, beside or under it, the Friday calendar as plain text rows. No stat cards.
- `/run` one line of figures: "12 to send" large, the other counts small beside it. Result table as a ledger. The error "wording not approved" sits in the top attention slot.
- `/phone` beige chat ground, light-green outgoing bubble, small tail, timestamp in the bubble corner, no avatars. AI line directly under the bubble: small, grey, tabular, no sparkle, no "AI" pill. Arabic bubble text right-aligned and larger.
- `/calls` top attention line ("1 urgent patient: call Omar first"), then the ledger; URGENT rows first, with a dot plus the word URGENT in clay red, not colour alone.
- `/book` two plain fields and one button, a short result line above them (green for booked, clay for refused).
- `/wording` proof sheet: English and Arabic side by side (stacked at 390 wide), approval status at the top of each set, the AI sentence rules as a plain numbered list.

## Users and access

- Receptionist / front-desk manager: the only real user. No sign-in. Can reach all six routes.
- Patient (simulated): has no screen of their own. The receptionist sees the patient's view on `/phone`.
- Nobody signs in, and nothing in this design adds a login, settings, or analytics.
