
HairConnekt
DOC 04 — User Flow & Figma Make Design Brief
Phase 1 MVP  ·  41 Screens  ·  One App · Two Modes
Primary audience: Women & girls  ·  Secondary: Men  ·  Market: Germany
Design language: Warm luxury · Feminine-first · Inclusive · Trustworthy

 
A.  DESIGN SYSTEM — READ THIS BEFORE DESIGNING ANY SCREEN

A1.  Who Is Using This App
The primary user is a Black or African woman aged 18–40 living in Germany. She is style-conscious, values quality, trusts recommendations from her community, and uses her phone for everything. She shares beautiful things in WhatsApp groups. If the app looks cheap or generic she will not use it.
Secondary users are men (barber clients, people booking salons) and non-African clients seeking specialist hair services. The app must feel welcoming to everyone without losing its warmth and character.

Design principle: Design for the woman first. If she loves it, everyone else will too.

A2.  Aesthetic Direction
Warm Luxury. Think: natural hair texture, golden hour lighting, rich earth tones, editorial beauty magazine. Not clinical, not generic, not cold. The app should feel like it was designed by someone who understands hair culture — not a generic booking app with a green logo.

A3.  Colour Palette
Role	Hex	Usage
Primary — Rich Brown	#8B4513	App bar, active nav icons, primary buttons, headings
Secondary — Amber Gold	#C8860A	Highlight rings, star ratings, premium badges, dividers
CTA — Warm Coral	#E05A4E	Book Now button, FAB, urgent actions, notification badges
Accent — Deep Teal	#1A8C85	Provider verified badge, success states, secondary CTA
Background — Warm White	#FFF8F0	App background — warm, never pure white
Surface — Light Cream	#F5E6D3	Cards, bottom sheets, input backgrounds
Dark Text	#1A1A1A	Primary body text
Mid Text	#555555	Secondary labels, metadata
Disabled / Hint	#AAAAAA	Placeholders, disabled states
Success Green	#2E7D32	Confirmed status, payment received
Warning Amber	#BF6000	Pending status, time warnings
Error Red	#C62828	Errors, cancel actions

A4.  Typography
Display / Headings: Playfair Display Bold — feminine, editorial, high-end. Evokes a luxury beauty magazine. Use for screen titles, hero text, provider names.
Body / UI: DM Sans or Nunito — friendly, highly legible, modern. Excellent German umlaut support (ä ö ü ß). Use for all body copy, buttons, labels, form fields.
Monospace (booking numbers, codes): JetBrains Mono — clean, readable. Use for confirmation numbers, voucher codes only.

Minimum body text size: 16sp. Touch targets: minimum 48×48dp. All text must meet WCAG 2.1 AA contrast ratio 4.5:1.

A5.  Component Style Guide
Buttons
•	Primary button: Coral #E05A4E background, white text, 12dp corner radius, 16sp DM Sans Bold, full-width on mobile, 52dp height, subtle drop shadow
•	Secondary button: White background, Brown #8B4513 border (1.5dp), Brown text, same radius and height
•	Destructive button: Red #C62828 text, white background, red border — used only for cancel/delete
•	Disabled state: #CCCCCC background, #888888 text — never hide disabled buttons, always show with reduced opacity

Cards
•	White or Cream (#F5E6D3) background
•	8dp corner radius
•	Elevation shadow: 0 2dp 8dp rgba(139,69,19,0.12) — warm brown-tinted shadow, never cold gray
•	Inner padding: 16dp

Input Fields
•	Background: #F5E6D3 (warm cream)
•	Border: 1dp #D4B896 (warm tan), active border: 2dp #8B4513 (brown)
•	Corner radius: 10dp
•	Label above field, 14sp DM Sans Medium, #555555
•	Placeholder text: #AAAAAA
•	Error state: red border + red helper text below + error icon

Bottom Navigation Bar
•	Background: White with warm top border shadow
•	5 items: Startseite, Suchen, Termine, Nachrichten, Profil
•	Active icon: Filled, Brown #8B4513
•	Inactive icon: Outline, #AAAAAA
•	Active label: 12sp DM Sans Bold, #8B4513
•	Badge: Coral #E05A4E filled circle, white count text

Status Badges
•	Bestätigt (Confirmed): #2E7D32 background, white text — pill shape
•	Ausstehend (Pending): #BF6000 background, white text — pill shape
•	Abgesagt (Cancelled): #C62828 background, white text — pill shape
•	Abgeschlossen (Completed): #555555 background, white text — pill shape

A6.  Photography & Imagery Style
Portfolio images are the most important visual element in the app. They must be displayed with care — generous sizing, good contrast overlays for text readability, never stretched.
•	Portfolio grid: 2-column, 4:5 aspect ratio per image, 4dp gap, rounded corners 8dp
•	Provider profile hero: 16:9 cover photo with warm gradient overlay at bottom for text legibility
•	Profile pictures: circular, warm gold ring (#C8860A) border 2dp for verified providers
•	Empty image placeholders: warm cream background with hair-strand SVG icon in #D4B896

A7.  Motion & Micro-interactions
•	Screen transitions: slide from right (forward), slide to right (back) — standard mobile pattern
•	Bottom sheet: spring up from bottom with subtle bounce
•	Like/heart button: pop scale animation (1.0 → 1.3 → 1.0) with coral fill
•	Booking confirmation: checkmark draw animation, then confetti burst
•	Skeleton loading: warm cream shimmer (not gray) — shimmer direction left to right
•	Tab switch: content fades in, active indicator slides smoothly
•	FAB: appears with scale-up spring on scroll-stop

A8.  Screen Layout Rules
•	Status bar: transparent over hero images, white elsewhere
•	Safe area insets: always respected top and bottom
•	Scroll: vertical scroll only on list screens — no horizontal scroll except carousels
•	FAB (Floating Action Button): coral #E05A4E, 56dp, bottom-right, 16dp from edges, always above bottom nav
•	Bottom nav height: 72dp including safe area
•	Section headers: Brown #8B4513, 18sp Playfair Display Bold, with 'Alle anzeigen' link in Teal
•	Pull-to-refresh: Warm spinner using brand colours — never default Android blue

A9.  Tone of Voice (German UI Text)
•	Warm and personal: 'Hallo [Name]!' not 'Willkommen'
•	Encouraging: 'Fast fertig!' not 'Bitte warten'
•	Action-oriented CTA text: 'Jetzt buchen' not 'Senden'
•	Error messages: empathetic, solution-focused — 'Das hat leider nicht geklappt. Bitte versuche es erneut.' — never technical
•	Empty states: motivating, not negative — 'Noch keine Termine — finde deinen perfekten Braider!'

 
B.  SHARED SCREENS  (Both Client & Provider Modes)

S-01  ·  Splash Screen
✅  HAPPY PATH
1.	HairConnekt logo centred on warm cream background — Playfair Display, Rich Brown
2.	Tagline below: 'Verbinde dich mit deinem perfekten Style' — 16sp DM Sans, #555555
3.	Subtle animated hair-strand illustration fades in behind the logo (SVG, not photo)
4.	After 1.5 seconds, smooth fade-out transition to S-02 (Account Type Selection)
5.	Loading indicator: three small brown dots pulsing at bottom

⬜  EMPTY STATE
6.	No empty state — this screen always shows content

❌  ERROR STATE
7.	No error state — if backend unreachable, proceed to S-02 and handle errors there

🎨  DESIGN NOTES
•	Logo should feel premium — consider thin gold ring around the icon
•	Background gradient: warm cream #FFF8F0 at top fading to light tan #F5E6D3 at bottom
•	Hair-strand animation: soft, flowing — not technical, not clinical

S-02  ·  Account Type Selection
✅  HAPPY PATH
8.	Logo top-centre (small, 48dp)
9.	Headline: 'Willkommen bei HairConnekt' — Playfair Display 28sp
10.	Two large cards, stacked vertically with 16dp gap:
11.	Card 1 — CLIENT: Icon of person browsing phone, 'Ich suche einen Friseur' bold, 'Finde Braider, Salons & Stylisten in deiner Nähe' subtitle — Coral border on hover/select
12.	Card 2 — PROVIDER: Icon of scissors/comb, 'Ich biete Friseur-Services an' bold, 'Zeige deine Arbeit und gewinne neue Kunden' subtitle — Coral border on hover/select
13.	Both cards can be selected (user can be both) — checkbox in top-right corner
14.	'Weiter' primary button at bottom — disabled until at least one selected
15.	'Bereits registriert? Anmelden' text link below button

⬜  EMPTY STATE
16.	No empty state — always shows two cards

❌  ERROR STATE
17.	Error: If neither selected and 'Weiter' tapped — cards shake gently with error message 'Bitte wähle mindestens eine Option'

🎨  DESIGN NOTES
•	Cards must feel touchable — elevated shadow, scale down 2% on tap
•	Selected state: Coral left border (4dp) + coral checkbox filled + warm cream background
•	Illustrations: simple, inclusive, warm — not stereotyped

S-03  ·  Client Registration
✅  HAPPY PATH
18.	Header: 'Konto erstellen' — Playfair Display 26sp
19.	Progress: subtle '1 / 2' indicator top-right
20.	Form fields (stacked, 12dp gap): Vorname, Nachname, E-Mail, Telefon (+49 default), Passwort, Passwort bestätigen
21.	Password field: show/hide toggle icon on right, strength bar below (red → orange → green)
22.	Terms checkbox: 'Ich akzeptiere die AGB und Datenschutzerklärung' with tappable links
23.	Marketing opt-in checkbox (unchecked by default): 'Newsletter und Angebote erhalten (optional)'
24.	'Konto erstellen' primary button (full width, coral) — disabled until all required fields valid
25.	Divider: 'Oder registrieren mit' — then 'Mit Google fortfahren' outline button
26.	Footer: 'Bereits registriert? Anmelden' link

⬜  EMPTY STATE
27.	No empty state — form starts blank by design

❌  ERROR STATE
28.	Invalid email: red border + 'Bitte gib eine gültige E-Mail-Adresse ein' below field
29.	Password mismatch: 'Die Passwörter stimmen nicht überein'
30.	Email already registered: top banner — 'Diese E-Mail ist bereits registriert. Möchtest du dich anmelden?'
31.	Server error: banner — 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'

🎨  DESIGN NOTES
•	Fields should have warm cream background — avoid cold white inputs
•	Phone field: country code selector on left (+49 🇩🇪) as tappable pill
•	Google button: white bg, multicolour Google logo, subtle border — no Google blue button

S-04  ·  Login Screen
✅  HAPPY PATH
32.	Logo top-centre (medium, 64dp)
33.	Headline: 'Willkommen zurück!' — Playfair Display 26sp, Brown
34.	E-Mail / Telefon input field
35.	Passwort input with show/hide toggle
36.	'Passwort vergessen?' right-aligned text link in Teal below password field
37.	'Anmelden' primary button full-width (coral)
38.	Divider: 'Oder' — then 'Mit Google fortfahren' button
39.	Footer: 'Noch kein Konto? Jetzt registrieren'

⬜  EMPTY STATE
40.	No empty state — form starts blank

❌  ERROR STATE
41.	Wrong credentials: red banner at top — 'E-Mail oder Passwort falsch. Bitte erneut versuchen.'
42.	Too many attempts: 'Zu viele Versuche. Bitte warte 5 Minuten.' with countdown
43.	No internet: 'Keine Internetverbindung. Bitte überprüfe deine Verbindung.'

🎨  DESIGN NOTES
•	Login screen should feel welcoming and fast — minimal elements, generous spacing

S-05  ·  Password Reset
✅  HAPPY PATH
44.	Step 1: 'Passwort zurücksetzen' headline, E-Mail input, 'Code senden' button
45.	Step 2: '6-stelligen Code eingeben' — 6 individual digit boxes (auto-focus, auto-advance), countdown timer 0:59, 'Code nicht erhalten? Erneut senden' link (disabled until timer expires)
46.	Step 3: New password + confirm password fields with strength indicator
47.	'Passwort ändern' primary button
48.	Step 4: Success — large animated checkmark, 'Passwort erfolgreich geändert!', 'Zur Anmeldung' button

⬜  EMPTY STATE
49.	No empty state

❌  ERROR STATE
50.	Email not found: 'Kein Konto mit dieser E-Mail gefunden'
51.	Wrong OTP code: digit boxes shake, 'Falscher Code. Noch 2 Versuche.'
52.	OTP expired: 'Code abgelaufen. Sende einen neuen Code.'

🎨  DESIGN NOTES
•	6-digit OTP boxes: large (48dp each), cream background, brown border, coral when filled
•	Checkmark animation on success: draw on effect, then green fill

S-06  ·  Notifications Screen
✅  HAPPY PATH
53.	Header: 'Benachrichtigungen' with 'Alle lesen' text link top-right
54.	Filter tabs: 'Alle', 'Buchungen', 'Nachrichten', 'System' — horizontal scroll chips
55.	Grouped by date: 'Heute', 'Gestern', 'Diese Woche'
56.	Each notification card: coloured icon circle left, title bold, message 1-line preview, time right
57.	Unread: warm cream background, bold text
58.	Read: white background, regular text
59.	Swipe left to delete, swipe right to mark read
60.	Tap navigates to relevant screen (booking, chat, etc.)

⬜  EMPTY STATE
61.	Illustration: Bell with a small plant growing from it — 'Alles erledigt!'
62.	'Keine neuen Benachrichtigungen' subtitle

❌  ERROR STATE
63.	Network error: banner at top — 'Benachrichtigungen konnten nicht geladen werden. Erneut versuchen'

🎨  DESIGN NOTES
•	Unread dot: Coral, 8dp, top-right of icon circle

S-07  ·  Settings Screen
✅  HAPPY PATH
64.	Header: 'Einstellungen'
65.	Grouped list sections with section headers: Account, App-Einstellungen, Datenschutz, Rechtliches
66.	Each row: icon (brown), label, chevron right or toggle switch
67.	Account section: Persönliche Informationen, E-Mail & Telefon, Passwort & Sicherheit
68.	App section: Sprache (current: Deutsch), Design (Hell / Dunkel / System), Benachrichtigungen
69.	Datenschutz section: Datenschutzeinstellungen, Daten herunterladen
70.	Rechtliches section: AGB, Datenschutzerklärung, Impressum
71.	Bottom: 'Abmelden' (red text, logout icon), 'Account löschen' (red text, trash icon)
72.	App version: 'HairConnekt v1.0.0' centred, small, light gray

⬜  EMPTY STATE
73.	No empty state

❌  ERROR STATE
74.	Settings load error: show cached settings with warning banner

🎨  DESIGN NOTES
•	Destructive actions (Abmelden, Account löschen) must have confirmation modal before executing

S-08  ·  Chat List Screen
✅  HAPPY PATH
75.	Header: 'Nachrichten' with search icon top-right
76.	Each conversation row: provider/client circular photo (56dp) left, name bold + last message preview 1 line + timestamp right
77.	Unread conversations: coral unread count badge, bold name
78.	Online status: green dot overlay on photo
79.	Booking reference chip below name if related to appointment: '#BK-2025...'
80.	Swipe right: archive, swipe left: delete

⬜  EMPTY STATE
81.	Illustration: Two overlapping chat bubbles with a small heart
82.	'Noch keine Nachrichten'
83.	'Buche einen Termin und starte eine Unterhaltung!'

❌  ERROR STATE
84.	Load error: 'Nachrichten konnten nicht geladen werden' with retry button

🎨  DESIGN NOTES
•	List items must be generously sized (72dp height) — easy to tap with one thumb

S-09  ·  Chat Screen (Individual Conversation)
✅  HAPPY PATH
85.	Header: back arrow, provider/client photo (40dp) + name + online status — all tappable to profile
86.	Booking reference banner (if linked): tappable card showing appointment date + status
87.	Messages: right-aligned (mine) coral bubbles, left-aligned (theirs) cream bubbles
88.	Timestamps below each message group, date separators between days
89.	System messages centred in gray: 'Termin gebucht für 28. Okt.'
90.	Typing indicator: left-aligned bubble with 3 animated dots
91.	Read receipts: single tick (sent), double tick (delivered), coloured double tick (read)
92.	Message input: expandable text field, attachment icon left, send button right (coral, paper plane icon)
93.	Send button disabled when input empty, activates on typing

⬜  EMPTY STATE
94.	No previous messages: centred message 'Beginn deiner Unterhaltung mit [Name]'
95.	Booking context card shown if conversation was started from booking flow

❌  ERROR STATE
96.	Message failed to send: message bubble gets error icon, 'Erneut senden' option on tap
97.	No internet: banner — 'Keine Verbindung — Nachrichten werden gesendet sobald du online bist'

🎨  DESIGN NOTES
•	Chat bubbles: 12dp corner radius, smaller radius on the conversation-facing side
•	Background: subtle warm pattern — very light hair-strand watermark texture

 
C.  CLIENT MODE SCREENS

C-01  ·  Home Screen (Startseite)
✅  HAPPY PATH
98.	Top bar: circular profile picture left (40dp) + 'Hallo, [Vorname]! 👋' (Playfair 20sp), notification bell right with coral badge
99.	Location pill below: '📍 Wuppertal, NRW' tappable — brown border pill
100.	Search bar: prominent, cream background, 'Suche nach Styles, Braiders, Salons...' placeholder, filter icon right
101.	Section: 'Braiders in deiner Nähe' — list of provider cards (see Provider Card design below)
102.	Provider Card: photo (circular 64dp, gold ring if verified), name bold, rating + review count, distance, specialty chips (max 3), price 'ab €35', availability badge 'Heute verfügbar' (green)
103.	Heart icon top-right of each provider card (favourite toggle — coral when active)
104.	Section: 'Beliebte Styles' — horizontal scroll of style image cards with style name + price overlay
105.	FAB: coral '+' or 'Termin buchen' at bottom-right

⬜  EMPTY STATE
106.	No providers found nearby: illustration of a map with a pin, 'Noch keine Braider in deiner Nähe'
107.	'Suche in einer anderen Stadt' button

❌  ERROR STATE
108.	Location permission denied: soft banner — 'Aktiviere deinen Standort für Braiders in deiner Nähe' with button
109.	Load error: skeleton cards shimmer in warm cream while loading, then error toast if still failing

🎨  DESIGN NOTES
•	This is the most important screen — invest design effort here
•	Provider cards must show high-quality circular photo prominently
•	Green availability badge is a conversion driver — make it visible
•	Warm cream background, brown section headers, coral FAB

C-02  ·  Search Results Screen
✅  HAPPY PATH
110.	Search bar at top (pre-filled from home screen or blank)
111.	Filter chips below search bar: horizontal scrollable, toggleable — 'Alle', 'Flechten', 'Locs', 'Salon', 'Mobil', 'Heute verfügbar'
112.	Results count: '24 Braider gefunden' — small, gray, below filters
113.	Sort dropdown: 'Empfohlen' default, options: Bewertung, Preis, Entfernung
114.	Provider cards in vertical list (same design as Home Screen)
115.	Infinite scroll — loading indicator at bottom when fetching more

⬜  EMPTY STATE
116.	No results: illustration magnifying glass with question mark
117.	'Keine Ergebnisse für deine Suche'
118.	'Filter zurücksetzen' coral button

❌  ERROR STATE
119.	Search API error: 'Suche fehlgeschlagen. Erneut versuchen' with retry button

🎨  DESIGN NOTES
•	Active filters shown as dismissible coral chips below the filter row
•	Filter chips: pill shape, 14sp, cream when inactive, brown background + white text when active

C-03  ·  Provider Profile Screen
✅  HAPPY PATH
120.	Hero: cover photo (16:9) with warm gradient overlay, back button + share + heart icons overlaid top-left/right
121.	Profile picture: 100dp circular, white border (3dp), overlapping bottom of cover photo, centred
122.	Gold ring on profile picture if provider is verified
123.	Provider name (Playfair Display 22sp), business name (if salon), rating '4.8 ★' + review count
124.	Address with 'Route' teal link, distance, service type badges (chips)
125.	Sticky tab bar: 'Überblick', 'Services', 'Galerie', 'Bewertungen'
126.	Überblick tab: bio text (expandable), specialisations list with icons, languages, opening hours, location mini map
127.	Services tab: service cards grouped by category, each with name, duration, price, description, 'Auswählen' button
128.	Galerie tab: 2-column grid, 4:5 images, style tag chip overlay, like count overlay
129.	Bewertungen tab: overall rating card with star distribution bars, then review cards
130.	Sticky bottom bar: 'ab €35' + 'Nachricht' outline button + 'Termin buchen' coral button

⬜  EMPTY STATE
131.	If provider has no portfolio: 'Noch keine Portfolio-Bilder' with camera illustration

❌  ERROR STATE
132.	Profile load error: skeleton layout, then error banner

🎨  DESIGN NOTES
•	This screen must be beautiful — it is the main conversion screen
•	Galerie images are the key trust signal — display them large and without clutter
•	Sticky bottom bar always visible — never make the user scroll to find the Book button

C-04  ·  Service Selection Screen
✅  HAPPY PATH
133.	Header: provider name + small photo, 'Services auswählen' title, cart icon with count badge
134.	Category tabs: horizontal scroll — 'Alle', 'Flechten', 'Locs', 'Twists', 'Styling'
135.	Service cards (vertical list, checkboxes on left):
136.	— Service image thumbnail (optional, right side, 56dp square)
137.	— Service name bold, duration + price, short description
138.	— Checked state: coral checkbox + coral left border on card
139.	Selected summary bar (sticky bottom, appears when ≥1 selected):
140.	— 'X Services ausgewählt' | 'Gesamtdauer: X Std.' | 'Gesamt: €X' | 'Weiter' coral button

⬜  EMPTY STATE
141.	No services configured by provider: 'Dieser Anbieter hat noch keine Services hinzugefügt'
142.	'Nachricht senden' button to ask provider directly

❌  ERROR STATE
143.	Load error: 'Services konnten nicht geladen werden'

🎨  DESIGN NOTES
•	Selected services clearly highlighted — coral border left + cream background on selected card

C-05  ·  Date & Time Selection Screen
✅  HAPPY PATH
144.	Header: 'Termin wählen', step indicator 'Schritt 2 von 4'
145.	Collapsible selected services summary card at top
146.	Calendar: full-width month grid — Mo Di Mi Do Fr Sa So headers
147.	Available dates: white, tappable
148.	Selected date: coral filled circle, white text
149.	Unavailable: light gray, no interaction
150.	Today: brown border outline
151.	Below calendar: time slots as chips in 3-column grid, grouped by 'Vormittag / Nachmittag / Abend'
152.	Available slots: cream background, brown border
153.	Selected slot: coral background, white text
154.	Booked/unavailable slots: gray, strikethrough
155.	Booking summary card sticky bottom: date, time, duration, total price, 'Weiter' button

⬜  EMPTY STATE
156.	No availability on selected date: 'Keine verfügbaren Zeiten an diesem Tag'
157.	'Anderen Tag wählen' teal link

❌  ERROR STATE
158.	Calendar load error: spinner, then 'Verfügbarkeit konnte nicht geladen werden. Erneut versuchen'

🎨  DESIGN NOTES
•	Calendar month navigation: swipe horizontally to change month
•	Do not show dates more than 60 days in the future — reduces scrolling

C-06  ·  Booking Details Screen
✅  HAPPY PATH
159.	Header: 'Buchungsdetails', step indicator 'Schritt 3 von 4'
160.	Collapsible booking summary card (provider + services + date/time + price)
161.	Mobile service section: toggle switch 'Mobiler Service gewünscht'
162.	If toggled ON: address dropdown (saved addresses) + 'Neue Adresse hinzufügen' option + address form
163.	Additional mobile fee shown: '+€15 Mobiler Service' — price updates live
164.	Notes section: text area 'Notizen für den Braider', placeholder 'Besondere Wünsche, Haartyp, Allergien...' 500 char limit
165.	Cancellation policy: expandable card showing provider's policy
166.	Payment method: 'Vor Ort bar zahlen' — only option in Phase 1
167.	'Jetzt buchen' primary button full-width (coral)
168.	Confirmation modal before booking: 'Buchung bestätigen?' with summary + 'Ja, buchen' + 'Zurück'

⬜  EMPTY STATE
169.	No empty states on this screen

❌  ERROR STATE
170.	Address required for mobile service: 'Bitte gib eine Adresse für den mobilen Service ein'
171.	Booking failed: 'Buchung fehlgeschlagen. Bitte versuche es erneut.' with retry
172.	Slot no longer available: 'Dieser Termin ist leider nicht mehr verfügbar. Bitte wähle eine neue Zeit.'

🎨  DESIGN NOTES
•	Progress indicator at top (steps 1-4) keeps user aware of where they are in the flow

C-07  ·  Booking Confirmation Screen
✅  HAPPY PATH
173.	Large animated checkmark (coral, draw-on effect) centred — then subtle confetti burst
174.	Headline: 'Termin bestätigt! 🎉' — Playfair Display 28sp
175.	Booking details card: provider photo + name + date + time + services + total + 'Bestätigt' green badge
176.	Booking reference: 'Buchungsnr.: #BK-20251028-0042' — JetBrains Mono font
177.	Action buttons: 'Nachricht an [Provider]' outline, 'Fertig' coral primary
178.	What's next timeline: ✓ Buchung bestätigt → Bestätigungs-E-Mail → 24-Std. Erinnerung → Termin

⬜  EMPTY STATE
179.	No empty state

❌  ERROR STATE
180.	Error: if confirmation not received — 'Buchung wird verarbeitet. Du erhältst eine Bestätigung per E-Mail.'

🎨  DESIGN NOTES
•	This screen is a celebration moment — make it feel joyful
•	Confetti colours: coral, gold, brown, teal — brand-consistent
•	Do not show too many buttons — 'Fertig' is the primary action

C-08  ·  Appointments List Screen (Termine)
✅  HAPPY PATH
181.	Header: 'Meine Termine'
182.	Three tabs: 'Anstehend' (default, badge with count), 'Abgeschlossen', 'Abgesagt'
183.	UPCOMING tab — Appointment cards:
184.	— Coloured left border (green=confirmed, amber=pending, coral=soon)
185.	— Status badge top-right corner
186.	— Date (large, bold) + time + provider photo + name + services chips + price
187.	— If appointment within 24h: countdown timer 'In 2 Std. 15 Min.'
188.	— Action row: 'Route' outline, 'Nachricht' outline, '⋮ Mehr' menu
189.	COMPLETED tab — cards show 'Bewertung abgeben' coral button if not yet reviewed
190.	CANCELLED tab — cards show cancellation reason + 'Erneut buchen' button

⬜  EMPTY STATE
191.	UPCOMING empty: calendar illustration, 'Noch keine anstehenden Termine'
192.	'Jetzt einen Braider finden' coral button
193.	COMPLETED empty: checkmark illustration, 'Noch keine abgeschlossenen Termine'
194.	CANCELLED empty: 'Keine stornierten Termine'

❌  ERROR STATE
195.	Load error: skeleton cards, then 'Termine konnten nicht geladen werden'

🎨  DESIGN NOTES
•	Upcoming tab is the most used — design the appointment card with care
•	Countdown timer for imminent appointments creates urgency and reduces no-shows

C-09  ·  Appointment Detail Screen
✅  HAPPY PATH
196.	Header: back arrow, 'Termindetails', '#BK-...' subtitle, share icon
197.	Status timeline: visual progress line — Gebucht → Bestätigt → Erinnerung → Beginnt → Abgeschlossen
198.	Provider card: large photo (80dp), name, rating, contact buttons (Anrufen, Nachricht)
199.	Appointment details card: date, time, duration, location (with mini map if not mobile), services list, payment method + status
200.	Client notes section: your notes (if any)
201.	Cancellation policy reminder: 'Noch X Std. für kostenlose Stornierung'
202.	Action buttons: 'Nachricht senden' | 'Umbuchung' | 'Stornieren' (red text)

⬜  EMPTY STATE
203.	No empty state — screen only reached from a populated list

❌  ERROR STATE
204.	Load error: 'Termindetails konnten nicht geladen werden'

🎨  DESIGN NOTES
•	Cancellation policy warning uses colour-coded urgency: green (safe) → amber (fee) → red (no refund)

C-10  ·  Reschedule Screen (Simplified)
✅  HAPPY PATH
205.	Header: 'Termin umbuchen'
206.	Current appointment details shown in gray read-only card at top
207.	'Neuen Termin wählen' section header
208.	Calendar picker (same design as C-05)
209.	Time slot selection (same design as C-05)
210.	Optional 'Grund angeben' text field
211.	Price difference notice if applicable: '+€10 Aufpreis für neue Zeit'
212.	'Umbuchung anfordern' coral button
213.	Success: 'Umbuchungsanfrage gesendet — der Anbieter wird benachrichtigt'

⬜  EMPTY STATE
214.	No empty state

❌  ERROR STATE
215.	No availability for requested date: 'Keine verfügbaren Zeiten. Bitte wähle einen anderen Tag.'
216.	Reschedule failed: 'Umbuchung fehlgeschlagen. Bitte versuche es erneut.'


C-11  ·  Cancel Appointment Screen
✅  HAPPY PATH
217.	Modal / bottom sheet (not full screen)
218.	Header: 'Termin stornieren' with red accent
219.	Policy warning card — colour coded:
220.	— Green: 'Kostenlose Stornierung möglich'
221.	— Amber: '50% Stornierungsgebühr anfällt'
222.	— Red: 'Keine Rückerstattung möglich'
223.	Dropdown: 'Grund für Stornierung' — Terminkonflikt, Krankheit, Persönliche Gründe, Sonstiges
224.	Optional notes text area
225.	Refund info: 'Rückerstattung: Bar-Zahlung — keine Rückerstattung möglich' (Phase 1 cash only)
226.	'Termin stornieren' red button | 'Doch nicht' outline button
227.	Success: screen closes, appointment moves to Abgesagt tab, toast 'Termin storniert'

⬜  EMPTY STATE
228.	No empty state

❌  ERROR STATE
229.	Cancellation failed: 'Stornierung fehlgeschlagen. Bitte versuche es erneut.'

🎨  DESIGN NOTES
•	This is a destructive action — confirm modal style, red button, clear warning language

C-12  ·  Write Review Screen
✅  HAPPY PATH
230.	Header: 'Bewertung abgeben'
231.	Provider info card at top: photo + name + service + date
232.	Large star selector: 5 stars, tap or drag to rate, stars animate to coral on selection
233.	Text area: 'Teile deine Erfahrung...' 500 char limit, counter below
234.	Optional: 'Foto hinzufügen' — up to 3 photos from gallery
235.	Style tag: 'Welchen Service hattest du?' — chip selection
236.	'Bewertung abgeben' coral button (full width)
237.	Success: 'Vielen Dank für deine Bewertung!' with checkmark animation

⬜  EMPTY STATE
238.	No empty state — always pre-populated with appointment context

❌  ERROR STATE
239.	Review not saved: 'Bewertung konnte nicht gespeichert werden. Erneut versuchen.'
240.	Less than 1 star selected: star selector shakes, 'Bitte wähle eine Bewertung'

🎨  DESIGN NOTES
•	Star rating interaction is the focal point — make stars large (48dp each) and satisfying to tap

C-13  ·  Client Profile Screen
✅  HAPPY PATH
241.	Header: 'Profil', settings icon + edit icon top-right
242.	Profile picture (120dp circular, camera icon overlay at bottom-right for edit)
243.	Name (Playfair Display 22sp), email, phone below — centred
244.	Verification badges: '✓ E-Mail verifiziert' + '✓ Telefon verifiziert' (teal text, small)
245.	Sections (list with icons and chevrons):
246.	— Persönliche Informationen
247.	— Meine Adressen (X gespeichert)
248.	— Meine Bewertungen
249.	— Buchungshistorie
250.	— Meine Favoriten (NEW — shows count)
251.	Provider mode switch: 'Zum Anbieter-Modus wechseln' card with arrow icon — teal accent
252.	'Abmelden' and 'Account löschen' at the bottom in red

⬜  EMPTY STATE
253.	No empty state — always shows profile data

❌  ERROR STATE
254.	Profile load error: cached data shown with soft warning banner

🎨  DESIGN NOTES
•	Profile picture edit: bottom sheet with 'Foto aufnehmen', 'Aus Galerie', 'Foto entfernen'
•	Provider mode switch card should be visible but not dominant — it is secondary to client use

C-14  ·  Favourites Screen
✅  HAPPY PATH
255.	Header: 'Meine Favoriten'
256.	Grid: 2-column provider cards (same card design as search results)
257.	Heart icon on each card: coral filled (favourite), tap to unfavourite with confirmation
258.	Unfavourite confirmation: gentle 'heart empties' animation, undo toast for 5 seconds
259.	Tap card: navigates to Provider Profile (C-03)

⬜  EMPTY STATE
260.	Illustration: empty heart with sparkles
261.	'Noch keine Favoriten gespeichert'
262.	'Entdecke Braider und tippe auf das Herz um sie zu speichern'
263.	'Jetzt entdecken' coral button

❌  ERROR STATE
264.	Load error: 'Favoriten konnten nicht geladen werden. Erneut versuchen.'

🎨  DESIGN NOTES
•	This screen is simple — the value is the content, not the layout. Keep it clean.

 
D.  PROVIDER MODE SCREENS

P-01  ·  Provider Type Selection
✅  HAPPY PATH
265.	Header: 'Welchen Service bietest du an?'
266.	Subtext: 'Du kannst mehrere Optionen auswählen'
267.	Four large selection cards (multi-select, checkboxes):
268.	— Einzelperson / Freelancer: comb icon, 'Ich arbeite selbstständig'
269.	— Salon / Barbershop: building icon, 'Ich habe ein Geschäft'
270.	— Mobiler Service: car/pin icon, 'Ich komme zu meinen Kunden'
271.	— Barber: scissors icon, 'Haar- und Bartpflege'
272.	'Weiter' coral button (disabled until at least one selected)

⬜  EMPTY STATE
273.	No empty state

❌  ERROR STATE
274.	None selected on 'Weiter': cards pulse gently, 'Bitte wähle mindestens eine Option'

🎨  DESIGN NOTES
•	Multi-select — provider can be salon AND mobile — checkboxes not radio buttons

P-02  ·  Provider Registration — Step 1 (Basic Info)
✅  HAPPY PATH
275.	Header: 'Persönliche Angaben', step indicator '1 / 5'
276.	Progress bar at top: 20% filled, Brown
277.	Fields: Vorname, Nachname, E-Mail, Telefon (+49), Passwort (with strength indicator), Passwort bestätigen
278.	Terms checkboxes: AGB für Anbieter (required), Datenschutzerklärung (required), Marketing E-Mails (optional)
279.	'Weiter zu Schritt 2' coral button

⬜  EMPTY STATE
280.	Form starts blank

❌  ERROR STATE
281.	Validation errors shown per field — same pattern as client registration

🎨  DESIGN NOTES
•	Same visual style as client registration — consistent onboarding feel

P-03  ·  Provider Registration — Step 2 (Business Info)
✅  HAPPY PATH
282.	Header: 'Über dein Business', step indicator '2 / 5', progress bar 40%
283.	Business name field (optional for freelancers, required for salons)
284.	Business type: pre-filled from P-01, editable chips
285.	Address fields (if not mobile-only): Straße, PLZ, Stadt, Bundesland dropdown
286.	Mobile service radius slider (if mobile selected): 0–50 km — 'Ich biete Service im Umkreis von 15 km'
287.	Optional: Gewerbeanmeldungsnummer, Steuer-ID (with info tooltips explaining purpose)
288.	'Weiter zu Schritt 3' coral button, 'Zurück' text link

⬜  EMPTY STATE

❌  ERROR STATE
289.	Address validation: PLZ not found — 'Diese Postleitzahl konnten wir nicht finden'

🎨  DESIGN NOTES
•	Radius slider: show visual circle on mini map as user drags — makes it tangible

P-04  ·  Provider Registration — Step 3 (Services)
✅  HAPPY PATH
290.	Header: 'Deine Dienstleistungen', step indicator '3 / 5', progress bar 60%
291.	Grouped service checkboxes: Flechten (Box Braids, Knotless, Cornrows, Micro Braids, Senegalese Twists, Passion Twists, Goddess Braids, Fulani Braids), Locs (Starter, Maintenance, Retwist, Styling), Natural Hair, Barber, Salon, Andere
292.	Each category: expandable/collapsible — tap header to expand
293.	Years experience slider: 0–20+ Jahre
294.	Languages multi-select: Deutsch, Englisch, Französisch, Türkisch, Arabisch, Andere
295.	Optional specialisations chips: Kinderfreundlich, Hochzeitsstyling, Natürliche Produkte, Männer-Styling
296.	'Weiter zu Schritt 4' coral button

⬜  EMPTY STATE

❌  ERROR STATE
297.	Nothing selected on 'Weiter': 'Bitte wähle mindestens einen Service'

🎨  DESIGN NOTES
•	Checkboxes grouped visually — category headers in bold brown, items indented below

P-05  ·  Provider Registration — Step 4 (Verification & Portfolio)
✅  HAPPY PATH
298.	Header: 'Verifizierung & Portfolio', step indicator '4 / 5', progress bar 80%
299.	ID upload section: dashed upload zone + camera/gallery buttons, preview thumbnail when uploaded
300.	Profile picture: circular 120dp preview placeholder + upload buttons + crop tool after upload
301.	Portfolio section: 3-column grid with '+' add buttons — 'Mindestens 1 Foto erforderlich'
302.	Each uploaded portfolio image: thumbnail + delete X button
303.	Copyright checkboxes (required): 'Ich besitze die Rechte an diesen Bildern' + 'Ich habe Einwilligung des Kunden'
304.	Accepted formats noted: JPG, PNG, max 10MB
305.	'Weiter zu Schritt 5' coral button

⬜  EMPTY STATE

❌  ERROR STATE
306.	Upload failed: 'Datei konnte nicht hochgeladen werden. Max. 10MB, Format: JPG oder PNG'
307.	No profile photo: 'Profilbild ist erforderlich' — field highlighted
308.	No portfolio: 'Bitte lade mindestens 1 Portfolio-Bild hoch'

🎨  DESIGN NOTES
•	Upload zones: dashed border (#D4B896), cream background, cloud-up icon centred
•	After upload: clean thumbnail with red × remove button top-right corner
•	ID upload: reassuring privacy note — '🔒 Deine Daten werden vertraulich behandelt'

P-06  ·  Provider Registration — Step 5 (Review & Submit)
✅  HAPPY PATH
309.	Header: 'Zusammenfassung', step indicator '5 / 5', progress bar 100%
310.	Four summary cards (each with 'Bearbeiten' teal link):
311.	— Persönliche Informationen: name, email, phone
312.	— Geschäftsinformationen: business name, type, address, radius
313.	— Services & Expertise: selected services, experience, languages
314.	— Verifizierung: ID ✓, profile photo ✓, portfolio (X Fotos) ✓
315.	'Was passiert jetzt?' timeline: Eingereicht → Überprüfung (1–3 Tage) → Freischaltung → Start!
316.	Required confirmation checkbox: 'Ich bestätige, dass alle Angaben korrekt sind'
317.	'Profil zur Prüfung einreichen' coral button (shows spinner while processing)

⬜  EMPTY STATE

❌  ERROR STATE
318.	Submission failed: 'Profil konnte nicht eingereicht werden. Bitte versuche es erneut.'

🎨  DESIGN NOTES
•	Final screen — this should feel like a moment of achievement. Timeline card is motivating.

P-07  ·  Pending Approval Screen
✅  HAPPY PATH
319.	Large animated hourglass or sparkle illustration centred
320.	Headline: 'Wir prüfen dein Profil!' — Playfair Display 26sp
321.	Subtext: 'Dies dauert normalerweise 1–3 Werktage. Du erhältst eine E-Mail sobald du freigeschaltet bist.'
322.	Status card: 'Profil in Überprüfung' amber badge + submission date
323.	Progress indicator: Eingereicht ✓ → In Prüfung (animated pulse) → Freigegeben
324.	'Was du jetzt tun kannst:' section with links to preview profile, explore app
325.	'Support kontaktieren' teal text link at bottom

⬜  EMPTY STATE
326.	No empty state — this screen IS the state

❌  ERROR STATE
327.	If status check fails: show last known status with 'Zuletzt aktualisiert' timestamp

🎨  DESIGN NOTES
•	Warm, patient tone — the provider is excited and waiting. Acknowledge that.

P-08  ·  Provider Dashboard
✅  HAPPY PATH
328.	Header: 'Willkommen zurück, [Name]! 👋' + date + notification bell + settings icon
329.	Status toggle card (prominent): large toggle 'Verfügbar / Nicht verfügbar' — green pulse when ON
330.	'Kunden können dich jetzt buchen' when ON / 'Du erscheinst nicht in den Suchergebnissen' when OFF
331.	Quick stats grid (2×2): Heute's Termine (number + trend arrow), Nächster Termin (time + client name + countdown), Diese Woche (earnings stub — cash only in Phase 1, shows appointment count), Bewertung (4.8★)
332.	'Heutiger Zeitplan' section: vertical timeline of today's appointments
333.	Each timeline item: time range, client photo + name, service, status badge, 'Starten'/'Nachricht'/'Mehr' buttons
334.	Empty slots shown as dashed 'Frei' lines
335.	Current time red indicator line across timeline
336.	'Neueste Bewertungen' section: last 3 compact review cards with 'Antworten' link

⬜  EMPTY STATE
337.	No appointments today: 'Keine Termine heute — genieße deinen freien Tag! 😊'
338.	Dashed lines still show available slots with '+ Termin' link

❌  ERROR STATE
339.	Load error: skeleton dashboard, then 'Dashboard konnte nicht geladen werden'

🎨  DESIGN NOTES
•	Status toggle is the #1 action on this screen — make it impossible to miss
•	Green animated pulse when available creates a satisfying 'live' feeling
•	Timeline is the most valuable part — clear time blocks, easy to read at a glance

P-09  ·  Calendar Screen (Month View)
✅  HAPPY PATH
340.	Header: 'Terminkalender', filter + more menu icons
341.	View toggle: 'Monat' (active), 'Woche', 'Tag' — pill toggle
342.	Month navigator: '< Oktober 2025 >' with 'Heute' button
343.	Calendar grid: each date cell shows coloured dots for appointments (green=confirmed, amber=pending, blue=in progress, gray=blocked)
344.	'+2' indicator if more than 3 appointments on one day
345.	Selected date: coral filled circle
346.	Tap a date: bottom sheet slides up with day's appointments list + earnings potential + 'Neue Buchung' button
347.	Tap appointment in bottom sheet: navigates to P-11 Appointment Detail

⬜  EMPTY STATE
348.	Month with no appointments: calendar grid shows clean — 'Keine Termine in diesem Monat'
349.	Below grid: 'Lege deine Verfügbarkeit fest' teal link

❌  ERROR STATE
350.	Load error: calendar grid shows but appointment data fails — banner 'Termine konnten nicht geladen werden'

🎨  DESIGN NOTES
•	Dot colours match status badge colours exactly — consistent visual language
•	Bottom sheet is swipeable — drag handle at top, snaps to 30% and 80% of screen height

P-10  ·  Booking Request Screen
✅  HAPPY PATH
351.	Alert styling: coral accent top border, 'Neue Buchungsanfrage!' header with animated bell icon
352.	Client info card: photo (80dp), name, member since, '3. Termin bei dir' if repeat
353.	Requested details card: date, time, services list, duration, mobile service (yes/no + address if yes), client notes
354.	Your availability check: green 'Verfügbar' or amber 'Teilweise belegt' status
355.	Earnings estimate: 'Du erhältst: €85.50' (gross minus platform fee, Phase 1 = no fee so full amount)
356.	Timer (if set): 'Bitte antworte innerhalb von 2 Stunden' with countdown
357.	Action buttons: 'Annehmen' coral (full width) | 'Ablehnen' outline red text
358.	On accept: confirmation animation + auto-notification to client
359.	On decline: reason dropdown bottom sheet + optional message

⬜  EMPTY STATE
360.	No empty state — only reached from a notification

❌  ERROR STATE
361.	Accept/decline API error: 'Antwort konnte nicht gesendet werden. Erneut versuchen.'

🎨  DESIGN NOTES
•	This screen requires fast action — make the Accept button large and obvious
•	Client's previous appointment count builds trust and reduces hesitation

P-11  ·  Appointment Detail Screen (Provider View)
✅  HAPPY PATH
362.	Header: 'Termindetails', appointment number, more menu (Bearbeiten, Rechnung senden, Löschen)
363.	Large status badge: Bestätigt / Ausstehend / In Bearbeitung / Abgeschlossen / Abgesagt
364.	Client info card: photo (64dp), name, repeat visit info, total spent, contact buttons (Anrufen, Nachricht, WhatsApp)
365.	Appointment details: date/time, location (mobile address or salon), services list with prices, total
366.	Payment: method (bar/cash), 'Zahlung als erhalten markieren' button (if not yet marked)
367.	Client notes + internal notes (editable, private)
368.	Status timeline: Gebucht → Bestätigt → Beginnt → Abgeschlossen
369.	Action buttons depend on status:
370.	— Ausstehend: 'Annehmen' + 'Ablehnen' + 'Gegenvorschlag'
371.	— Bestätigt: 'Termin starten' (only on appointment day) + 'Nachricht' + 'Stornieren'
372.	— In Bearbeitung: 'Termin abschließen'
373.	— Abgeschlossen: 'Rechnung anzeigen' + 'Erneut buchen'

⬜  EMPTY STATE
374.	No empty state

❌  ERROR STATE
375.	Action API error: 'Aktion fehlgeschlagen. Erneut versuchen.'

🎨  DESIGN NOTES
•	Internal notes section: lock icon to signal these are private — client cannot see them

P-12  ·  Block Time Screen
✅  HAPPY PATH
376.	Header: 'Zeit blockieren'
377.	Reason buttons: pill chips — 'Pause', 'Mittagspause', 'Urlaub', 'Krankheit', 'Termin außerhalb', 'Sonstiges'
378.	'Sonstiges' reveals text input field
379.	'Ganztägig' checkbox
380.	Date picker: same calendar component
381.	Time range: start time + end time pickers (if not ganztägig)
382.	Repeat toggle: 'Wiederholen?' — if ON: frequency chips (Täglich, Wöchentlich) + end date
383.	'Zeit blockieren' coral button
384.	Success: toast 'Zeit blockiert', slot appears gray on calendar

⬜  EMPTY STATE
385.	No empty state

❌  ERROR STATE
386.	Overlapping block: 'Dieser Zeitraum überschneidet sich mit einem bestehenden Termin'

🎨  DESIGN NOTES
•	Keep this screen simple — it is a quick utility action, not a main feature

P-13  ·  Services Management Screen
✅  HAPPY PATH
387.	Header: 'Services & Preise', '+' FAB bottom-right
388.	Grouped list: category headers (bold brown) with service cards below
389.	Each service card: image thumbnail (optional), name bold, duration + price, active/inactive toggle, edit pencil icon, drag handle for reordering
390.	Active services: full opacity | Inactive: 60% opacity with 'Inaktiv' badge
391.	Swipe left to delete (with confirmation), swipe right to duplicate
392.	Empty category: 'Keine Services in dieser Kategorie' with '+' link

⬜  EMPTY STATE
393.	No services added yet: illustration of a price tag
394.	'Füge deinen ersten Service hinzu'
395.	'Service hinzufügen' coral button centred

❌  ERROR STATE
396.	Delete failed: 'Service konnte nicht gelöscht werden — er ist in zukünftigen Terminen verwendet'

🎨  DESIGN NOTES
•	Services with upcoming appointments cannot be deleted — show warning instead

P-14  ·  Add / Edit Service Screen
✅  HAPPY PATH
397.	Header: 'Service hinzufügen' or 'Service bearbeiten'
398.	Service category dropdown (required)
399.	Service name field (required)
400.	Description text area (300 chars)
401.	Duration: hours + minutes inputs OR 'Geschätzte Dauer' range toggle
402.	Price type: radio — 'Festpreis', 'Ab Preis', 'Preisspanne'
403.	Price input(s) with € symbol
404.	Service image: optional upload — shows thumbnail if uploaded
405.	Active toggle: 'Service aktiv schalten'
406.	'Service speichern' coral button full width
407.	'Abbrechen' text link below

⬜  EMPTY STATE
408.	Fields start empty for add, pre-filled for edit

❌  ERROR STATE
409.	Required fields empty: highlighted in red on save attempt
410.	Save failed: 'Service konnte nicht gespeichert werden'

🎨  DESIGN NOTES
•	Price type radio selection dynamically shows the right input fields — clean conditional logic

P-15  ·  Availability Settings Screen
✅  HAPPY PATH
411.	Header: 'Verfügbarkeit festlegen', 'Vorschau' teal button top-right
412.	Each day row (Mo–So): day name + active/inactive toggle + time slots
413.	Active day: shows time slots (e.g. '09:00–13:00', '14:00–18:00') with '+' add slot + trash delete
414.	Inactive day: 'Geschlossen' gray text
415.	'Auf andere Tage kopieren' link below each day's slots
416.	Buffer time slider (0–60 min): 'Pufferzeit zwischen Terminen: 15 Min.'
417.	Booking settings: advance booking days (1–90), same-day booking toggle + min. lead time
418.	'Verfügbarkeit speichern' coral button sticky bottom

⬜  EMPTY STATE

❌  ERROR STATE
419.	Save failed: 'Verfügbarkeit konnte nicht gespeichert werden'

🎨  DESIGN NOTES
•	Time slot pickers: native time picker — familiar UX, no custom implementation needed

P-16  ·  Portfolio Management Screen
✅  HAPPY PATH
420.	Header: 'Mein Portfolio', '+' upload button top-right, edit mode toggle
421.	2-column image grid (4:5 ratio, 4dp gap)
422.	Normal mode: images with style tag chip overlay, like count overlay (Phase 1: no likes — just count placeholder)
423.	Edit mode: checkboxes appear on images, drag handles for reorder, delete buttons
424.	Tap image: opens P-18 Upload/Edit Portfolio Image
425.	Bulk action bar (edit mode, when items selected): 'X ausgewählt' + 'Löschen' + 'Verstecken'
426.	FAB: coral '+' for quick upload

⬜  EMPTY STATE
427.	No portfolio images yet: camera illustration + 'Lade deine ersten Arbeiten hoch'
428.	'Fotos hinzufügen' coral button centred
429.	Tip card: '💡 Anbieter mit 6+ Fotos erhalten 3× mehr Buchungen'

❌  ERROR STATE
430.	Delete failed: 'Foto konnte nicht gelöscht werden'

🎨  DESIGN NOTES
•	This screen is the provider's shop window — make the grid look beautiful and editorial

P-17  ·  Upload Portfolio Image Screen
✅  HAPPY PATH
431.	Upload method: 'Foto aufnehmen' | 'Aus Galerie wählen' — bottom sheet or top toggle
432.	After selection: image preview (full width, 4:5 crop tool)
433.	Crop tool: handles, grid overlay, confirm/reset buttons
434.	Form below (scrollable): Style-Typ dropdown (required), Caption text area (200 chars), Style-Tags chips (Knotless, Jumbo, Medium, Farbig, Kinderfreundlich etc.), Haarlänge dropdown, Arbeitszeit slider
435.	Price optional: toggle 'Preis anzeigen' → min/max inputs
436.	Visibility: 'Öffentlich' default
437.	Copyright checkboxes (required before upload)
438.	'Hochladen' coral button — shows progress bar during upload
439.	Success: 'Foto hochgeladen!' + thumbnail preview + 'Weiteres hochladen' link

⬜  EMPTY STATE

❌  ERROR STATE
440.	Upload failed (network): 'Upload fehlgeschlagen. Bitte überprüfe deine Verbindung.'
441.	File too large: 'Datei zu groß. Maximale Größe: 10MB'
442.	Wrong format: 'Format nicht unterstützt. Bitte JPG oder PNG verwenden.'

🎨  DESIGN NOTES
•	Progress bar: coral fill, percentage shown — feedback is essential for uploads
•	Style tags: horizontal scrollable chips — do not require scrolling the whole form

P-18  ·  Provider Profile Edit Screen
✅  HAPPY PATH
443.	Header: 'Profil bearbeiten', 'Vorschau' teal button, auto-save indicator ('Gespeichert ✓')
444.	Sections (tabbed or scrollable with headers):
445.	— Grundinfo: business name, personal name, bio (500 chars), specialisations
446.	— Fotos: cover photo (replace + crop), profile picture (replace + circular crop)
447.	— Kontakt: phone, email, website (optional), Instagram, Facebook
448.	— Stornierungsbedingungen: text area with template suggestions as tappable chips
449.	— Zahlungsmethoden: checkboxes — Bar, Karte, PayPal (display only in Phase 1 — all unchecked except Bar)
450.	'Änderungen speichern' coral button sticky bottom

⬜  EMPTY STATE

❌  ERROR STATE
451.	Save failed: 'Änderungen konnten nicht gespeichert werden'
452.	Image upload error: same as P-17 error states

🎨  DESIGN NOTES
•	Auto-save on field blur reduces frustration — show small 'Gespeichert' tick when saved

P-19  ·  Public Profile Preview Screen
✅  HAPPY PATH
453.	Top banner: brown background, white text 'Vorschau-Modus — So siehst du für Kunden aus'
454.	'Bearbeiten' teal button top-right
455.	Below banner: exact render of C-03 Provider Profile Screen in read-only mode
456.	All buttons on the profile (e.g. 'Termin buchen') are non-functional / show toast 'Vorschau-Modus'

⬜  EMPTY STATE
457.	No empty state

❌  ERROR STATE

🎨  DESIGN NOTES
•	This screen reassures providers their profile looks professional before going live

P-20  ·  Reviews Screen (Provider)
✅  HAPPY PATH
458.	Header: 'Bewertungen', filter + sort icons
459.	Overall rating card: large '4.8' (Playfair Display 48sp), 5-star visual, '234 Bewertungen'
460.	Star distribution bars: 5★ ████████████ 180, 4★ ████ 40, etc.
461.	Filter chips: 'Alle', 'Unbeantwortet' (badge with count), 'Mit Fotos', '5 Sterne', '< 5 Sterne'
462.	Review cards (vertical list):
463.	— Client photo + name + 'Verifizierter Kunde' badge + star rating + date
464.	— Review text (expandable)
465.	— Service chip: 'Box Braids'
466.	— 'Antworten' coral button if no response yet
467.	— If already responded: your response shown indented with different background
468.	Tap 'Antworten': opens reply text area bottom sheet (500 chars, template chips)

⬜  EMPTY STATE
469.	No reviews yet: illustration of empty stars + speech bubble
470.	'Noch keine Bewertungen — Bewertungen erscheinen nach abgeschlossenen Terminen'

❌  ERROR STATE
471.	Reply failed: 'Antwort konnte nicht gesendet werden'

🎨  DESIGN NOTES
•	Unanswered review badge is the key action driver — make the count badge very visible

P-21  ·  Provider Settings Screen
✅  HAPPY PATH
472.	Header: 'Einstellungen'
473.	Account section: Persönliche Informationen, E-Mail & Telefon, Passwort & Sicherheit
474.	Business section: Mein Profil bearbeiten, Services & Preise, Verfügbarkeit
475.	Notifications section: toggles per category (Buchungsanfragen, Bestätigungen, Nachrichten, Bewertungen)
476.	App section: Sprache, Benachrichtigungseinstellungen, Datenschutz
477.	Legal: AGB, Datenschutzerklärung, Impressum
478.	'Account pausieren' (amber, pause icon) — temporarily hides profile from search
479.	'Abmelden' (red, logout icon) + 'Account löschen' (red, trash icon)
480.	App version at bottom

⬜  EMPTY STATE

❌  ERROR STATE

🎨  DESIGN NOTES
•	Identical visual structure to client settings — consistent mental model for users who switch modes

 
E.  USER FLOW SUMMARY — PHASE 1

E1.  Client Core Booking Flow
1. S-01 Splash → S-02 Account Type → S-03 Register (or S-04 Login)
2. S-04 Login → C-01 Home Screen
3. C-01 Home → C-02 Search Results → C-03 Provider Profile
4. C-03 Provider Profile → C-04 Service Selection
5. C-04 Service Selection → C-05 Date & Time Selection
6. C-05 Date & Time → C-06 Booking Details
7. C-06 Booking Details → C-07 Booking Confirmation
8. C-07 Confirmation → C-08 Appointments List (Anstehend tab)
9. C-08 Appointments → C-09 Appointment Detail
10. C-09 Detail → C-10 Reschedule OR C-11 Cancel
11. After appointment completed → C-12 Write Review prompt on C-08
12. Any screen → S-08 Chat (via Nachricht button) → S-09 Chat Screen
13. Any provider card → heart tap → C-14 Favourites saved

E2.  Provider Core Flow
1. S-02 Account Type → P-01 Provider Type → P-02–P-06 Registration Steps → P-07 Pending Approval
2. After approval: S-04 Login → P-08 Provider Dashboard
3. Push notification → P-10 Booking Request → Accept → P-11 Appointment Detail
4. P-08 Dashboard → P-09 Calendar → tap day → P-11 Appointment Detail
5. P-11 Detail → status changes: start → in progress → complete → mark payment received
6. P-08 Dashboard → P-13 Services → P-14 Add/Edit Service
7. P-08 Dashboard → P-15 Availability Settings
8. P-08 Dashboard → P-16 Portfolio → P-17 Upload Portfolio Image
9. P-08 Dashboard → P-18 Edit Profile → P-19 Public Profile Preview
10. P-08 Dashboard → P-20 Reviews → respond to reviews
11. P-09 Calendar → P-12 Block Time
12. Any screen → S-08 Chat → S-09 Chat Screen (respond to client messages)

E3.  Screen Count Confirmation
Total Phase 1 screens to design in Figma Make:

Shared screens (S-01 to S-09):  9 screens
Client screens (C-01 to C-14):  14 screens
Provider screens (P-01 to P-21):  21 screens
TOTAL:  44 screens

⚠  Design ONLY these screens. Zero extras. Every screen has happy path, empty state, and error state.
