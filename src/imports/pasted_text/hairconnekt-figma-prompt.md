Here is your Figma Make prompt. Copy and paste this entire block:

---

**HAIRCONNEKT — FIGMA MAKE DESIGN PROMPT**

Design a mobile app called **HairConnekt** — a hair braiding and styling marketplace for Germany. One app, two modes: Client and Provider.

---

**AESTHETIC DIRECTION**

Soft Premium. Think high-end beauty brand meets modern fintech — clean white backgrounds, warm gold accents, editorial typography. Inspired by Glossier, Fenty Beauty, and Treatwell but warmer and more personal. Primary users are women aged 18–40 who are style-conscious and share beautiful things. Design for them first.

---

**COLOUR PALETTE**

- Background: `#FFFFFF` pure white — all screens
- Surface / Cards: `#FAFAFA` off-white — subtle card lift
- Primary: `#8B4513` rich brown — buttons, active nav, headings
- Gold Accent: `#C8860A` — star ratings, verified badges, divider lines, highlights
- CTA Button: `#E05A4E` warm coral — Book Now, FABs, primary actions
- Teal: `#1A8C85` — verified provider badge, success, secondary links
- Dark Text: `#1A1A1A`
- Mid Text: `#6B6B6B`
- Hint / Placeholder: `#AAAAAA`
- Confirmed Green: `#2E7D32`
- Pending Amber: `#BF6000`
- Error Red: `#C62828`
- Input Background: `#F5F5F5` light gray — form fields only
- Divider: `#EEEEEE`

---

**TYPOGRAPHY**

- Display / Screen Titles: **Playfair Display Bold** — elegant, feminine, editorial
- All UI / Body / Buttons / Labels: **DM Sans** — friendly, modern, highly legible
- Booking numbers and codes only: **JetBrains Mono**
- Minimum body text: 16sp
- Touch targets: 48×48dp minimum

---

**COMPONENT RULES**

**Buttons**
- Primary: `#E05A4E` coral background, white DM Sans Bold text, 12dp radius, 52dp height, full width, soft drop shadow `rgba(224,90,78,0.25) 0 4dp 16dp`
- Secondary: white background, `#8B4513` border 1.5dp, brown text, same size
- Destructive: white background, `#C62828` border, red text — cancel and delete only
- Disabled: `#E0E0E0` background, `#AAAAAA` text

**Cards**
- Background: `#FFFFFF` white
- Border: none
- Shadow: `0 2dp 12dp rgba(0,0,0,0.08)` — clean modern shadow
- Corner radius: 12dp
- Inner padding: 16dp

**Input Fields**
- Background: `#F5F5F5`
- Border: none in default, `2dp #8B4513` border on focus
- Corner radius: 10dp
- Label above field: 13sp DM Sans Medium `#6B6B6B`
- Error: `#C62828` label + helper text below

**Bottom Navigation**
- White background, top shadow
- 5 tabs: Startseite, Suchen, Termine, Nachrichten, Profil
- Active: `#8B4513` filled icon + bold label
- Inactive: `#AAAAAA` outline icon
- Badge: `#E05A4E` coral pill, white count

**Provider Cards (the most important component)**
- White card, 12dp radius, clean shadow
- Circular provider photo: 64dp, `#C8860A` gold ring 2dp if verified
- Name: 16sp DM Sans Bold `#1A1A1A`
- Rating: gold star `#C8860A` + review count gray
- Distance: small, `#6B6B6B`
- Specialty chips: max 3, `#F5F5F5` background, `#8B4513` text, 20dp radius
- Price: `#8B4513` bold
- Availability badge: `#2E7D32` background white text pill — "Heute verfügbar"
- Heart icon top-right: outline default, `#E05A4E` filled when favourited

**Status Badges** — all pill shaped, white text
- Bestätigt: `#2E7D32`
- Ausstehend: `#BF6000`
- Abgesagt: `#C62828`
- Abgeschlossen: `#6B6B6B`
- In Bearbeitung: `#1A8C85`

**Portfolio Image Grid**
- 2 columns, 4:5 ratio, 4dp gap, 8dp corner radius
- Style tag chip overlaid bottom-left: semi-transparent dark bg, white text
- No heavy overlays — let the images breathe on white

---

**SCREENS TO DESIGN — 44 TOTAL**

Design every screen with 3 states: **Happy Path**, **Empty State**, **Error State**.

**SHARED (9 screens)**
S-01 Splash Screen — logo centred on white, animated hair-strand SVG, tagline, loading dots
S-02 Account Type Selection — two large white cards (Client / Provider), multi-select checkboxes
S-03 Client Registration — clean form, warm field backgrounds, Google login button
S-04 Login Screen — minimal, welcoming, quick
S-05 Password Reset — 3-step: email → 6-digit OTP boxes → new password → success
S-06 Notifications — grouped list, coloured icon circles, unread coral badge
S-07 Settings — grouped list with icons, destructive actions at bottom in red
S-08 Chat List — conversation rows with circular photos, online status dots, unread badges
S-09 Chat Screen — coral right bubbles (mine), light gray left bubbles (theirs), white background

**CLIENT MODE (14 screens)**
C-01 Home Screen — greeting + location pill + search bar + "Braiders in deiner Nähe" provider list + "Beliebte Styles" horizontal scroll + coral FAB
C-02 Search Results — search bar + horizontal filter chips + provider card list
C-03 Provider Profile — hero cover photo + circular profile photo overlapping + sticky tabs (Überblick / Services / Galerie / Bewertungen) + sticky bottom booking bar
C-04 Service Selection — checkboxes left, service cards, sticky selected-summary bottom bar
C-05 Date & Time Selection — full-width calendar + time slot chips grid + sticky booking summary
C-06 Booking Details — mobile service toggle + address + notes + cancellation policy accordion + coral book button
C-07 Booking Confirmation — animated coral checkmark + confetti + celebration card + booking number in JetBrains Mono
C-08 Appointments List — 3 tabs (Anstehend / Abgeschlossen / Abgesagt), appointment cards with coloured left border, countdown timer for imminent appointments
C-09 Appointment Detail — status timeline + provider card + appointment info + action buttons by status
C-10 Reschedule — current appointment card (read only gray) + new calendar + new time slots
C-11 Cancel Appointment — bottom sheet modal, colour-coded policy warning, dropdown reason, red button
C-12 Write Review — large 5-star selector (coral on select) + text area + optional photos
C-13 Client Profile — circular 120dp photo, verification badges, section list, provider mode switch card
C-14 Favourites — 2-column provider grid, empty heart illustration when empty

**PROVIDER MODE (21 screens)**
P-01 Provider Type Selection — 4 cards multi-select (Freelancer, Salon, Mobile, Barber)
P-02 Registration Step 1 — basic info, progress bar 20%
P-03 Registration Step 2 — business info, address, service radius slider with mini map
P-04 Registration Step 3 — services checkboxes grouped by category, expandable, experience slider
P-05 Registration Step 4 — ID upload zone + profile photo circular crop + portfolio grid upload
P-06 Registration Step 5 — summary cards + "Was passiert jetzt?" timeline + submit button
P-07 Pending Approval — hourglass illustration, progress steps, warm encouraging copy
P-08 Provider Dashboard — status toggle (green pulse when on) + 2×2 stats grid + today's timeline + recent reviews
P-09 Calendar Month View — appointment dots per day + bottom sheet on date tap
P-10 Booking Request — coral accent alert, client info, requested details, big Accept button
P-11 Appointment Detail (Provider) — status badge + client card + contact buttons + status action buttons
P-12 Block Time — reason chips + date/time + repeat toggle
P-13 Services Management — grouped service cards, toggles, drag handles
P-14 Add / Edit Service — form with conditional price type inputs
P-15 Availability Settings — day-by-day rows, time slot pairs, buffer slider
P-16 Portfolio Management — 2-column grid, edit mode with checkboxes and drag handles
P-17 Upload Portfolio Image — image crop tool + scrollable form with tags
P-18 Provider Profile Edit — tabbed sections, auto-save indicator
P-19 Public Profile Preview — brown "Vorschau-Modus" banner + read-only client profile view
P-20 Reviews Screen — large rating display + star distribution bars + review cards with reply option
P-21 Provider Settings — same structure as client settings, with Account pausieren option

---

**DESIGN RULES — NON-NEGOTIABLE**

- White `#FFFFFF` backgrounds on all screens — no gradients on backgrounds
- Every primary action button is coral `#E05A4E` — never brown for the main CTA
- Provider photos are always circular — never square
- Portfolio images are always displayed full quality with minimal overlay — images are the product
- All error messages are in German, empathetic in tone, never technical
- Empty states always have an illustration and a call-to-action button
- Sticky bottom bars on booking flow screens — the user must never scroll to find the Next button
- The Provider Dashboard status toggle must be the most prominent element on that screen
- All German text must support umlauts: ä ö ü ß
- Screen titles use Playfair Display, everything else DM Sans
- No emojis in the UI except where explicitly stated in the screen descriptions above

---

**FIGMA FILE STRUCTURE**

Organise frames as:
- 📁 00 Design System (colours, typography, components)
- 📁 01 Shared Screens (S-01 to S-09)
- 📁 02 Client Mode (C-01 to C-14)
- 📁 03 Provider Mode (P-01 to P-21)

Each screen frame: 390×844dp (iPhone 14 size — standard for React Native design)
Each screen has 3 frames side by side: Happy Path | Empty State | Error State

---

That is the complete prompt. Paste it into Figma Make exactly as written. The screen IDs (S-01, C-01, P-01 etc.) match the DOC 04 document exactly, so when Claude does the Stage 3b build prompts, every reference will line up perfectly.