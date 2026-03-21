PRODUCT REQUIREMENTS DOCUMENT
Barmer Pizzeria
Website Design & Development
Heubruch 17 · 42275 Wuppertal-Barmen


1. BUSINESS OVERVIEW

Business Name	Barmer Pizzeria
Owner Surname	Honarmand (هنرمند — Farsi: 'skilled craftsman / artist')
Address	Heubruch 17, 42275 Wuppertal (Barmen)
Phone	0202 553869
Type	Imbiss / Trattoria — Pizza, Grill, Döner, Pasta
Current Web	No owned website. Auto-stub on barmer-pizzeria.edan.io only
Social Media	None found
Delivery	Yes — from 17:00 Uhr, phone only
Google Rating	4.1–4.3 ★ across platforms (100+ reviews)
Target Domain	barmer-pizzeria-wuppertal.de

Opening Hours
Montag – Freitag	11:00 – 22:00 Uhr
Samstag	GESCHLOSSEN ⚠️
Sonntag	16:00 – 22:00 Uhr

2. STRATEGIC CONTEXT

The Opportunity
Barmer Pizzeria has genuine quality and a loyal local following, but is completely invisible online. Searching 'Pizza Barmen Wuppertal' or 'Imbiss Heubruch' returns zero results. Every customer who finds them does so by walking past or by word of mouth — there is no digital discovery path at all.
The owner (Honarmand) is a respected, long-time Barmen community figure. Customers describe him as warm, fair, and committed to quality. This positive reputation is an asset that is simply not being communicated anywhere online.

What a Website Fixes
•	Zero Google discoverability → site + SEO puts them on the map for 'Pizza Barmen' searches
•	No menu online → customers can't check before visiting → unmet expectations → negative reviews
•	Delivery service unknown → nobody knows they deliver from 17:00 → lost evening revenue every day
•	No contact information online → potential customers call competitors instead

Honest Constraints
Some recent reviews mention quality dips after a staff change. A website does not fix food quality. The pitch is purely about visibility and menu transparency, not about reputation repair. The website should reflect the real, current business — not over-promise.

3. TARGET USERS

Primary — The Local Walk-In
People who live or work in Barmen, searching for a quick lunch or dinner nearby. They want to know: what's on the menu, how much does it cost, are they open right now. Phone or WhatsApp to order delivery.

Secondary — The Delivery Customer
Barmen residents who want food delivered in the evening. They don't know the pizzeria delivers — because there is no online presence promoting it. A dedicated delivery section changes this.

Tertiary — The Curious Passer-By
Foot traffic on Heubruch who scan a QR code from the window or search the name on their phone. They need hours, menu, and a 'call to order' button within 3 seconds.

4. DESIGN DIRECTION

Design Concept: 'Barmen Trattoria'
Warm Italian trattoria energy meets honest neighbourhood Imbiss. Not luxury, not clinical. Gemütlich, welcoming, the kind of place where regulars sit for coffee and everyone knows the owner. The design should feel as familiar and trustworthy as the food.
Inspired by classic Italian trattorias — checkered tablecloth patterns, warm reds, hand-written chalk-style typography accents, rustic cream backgrounds. Every element says 'real food, real people, no pretence.'

Colour Palette
Swatch	Name / Hex	Usage
 	Trattoria Red  #C0392B	Primary: hero, section headers, CTAs, price highlights
 	Warm Cream  #FDF6EC	Page background, card backgrounds
 	Charcoal  #2C2C2C	All body text and headings
 	Muted Gold  #B7860B	Accent details, dividers, secondary highlights
 	Blush  #FADBD8	Subtle section alternation, tag backgrounds
 	White  #FFFFFF	Card surfaces, nav background on scroll

Typography
Role	Font	Source
Display (Hero, Section H2)	Playfair Display	Google Fonts
Sub-heading (cards, categories)	Lora (Italic)	Google Fonts
Body (menu, paragraphs)	Inter	Google Fonts

Visual Motif — Checkered Pattern
The signature visual element is a subtle red-and-cream checkered pattern (inspired by classic Italian tablecloths). It appears as:
•	A thin decorative border strip in the Hero section
•	A repeated background texture at very low opacity in section dividers
•	A corner accent on the menu category headers
Implementation: SVG or CSS repeating pattern — zero performance cost, no images required.

5. SECTION-BY-SECTION SPECIFICATIONS

5.1  Navbar
•	Fixed, transparent on load → bg-white/95 + shadow on scroll
•	Logo: 'BARMER PIZZERIA' in Playfair Display + small pizza slice icon (Lucide or SVG)
•	Nav links: Speisekarte · Lieferung · Über Uns · Öffnungszeiten · Kontakt
•	CTA button: 'Jetzt Bestellen' → scrolls to Booking / calls phone
•	Mobile: hamburger menu with slide-down panel, bg-white

5.2  Hero Section
Full-screen (100vh). Dark overlay over a warm barbershop/pizzeria background image (Unsplash placeholder). Checkered accent border strip at the bottom of the hero.
Content (centred):
•	Small badge: 'Ihr Imbiss in Wuppertal-Barmen' (uppercase, tracked, gold)
•	Main headline: 'Barmer Pizzeria' in Playfair Display, large, white
•	Sub-headline: 'Pizza · Grill · Döner · Pasta' in Lora italic, cream
•	Tag line: 'Hausgemacht. Frisch. Seit Jahren in Barmen.' in Inter, white/80
•	Dual CTAs: primary gold button 'Speisekarte ansehen' + ghost button 'Jetzt anrufen'
•	Animation: staggered word-by-word reveal on headline using Motion (Framer Motion)

5.3  Menu Section — THE UNIQUE FEATURE
This is the most important section and the main reason the website has value. A fully categorised, price-transparent digital menu reduces unmet expectations and is the #1 trust signal for a food business.

Layout: tabbed or accordion-style categories. Each category has a header and item rows.

Menu Categories & Items:

🍕  PIZZA
Margherita (Ø 28cm)	6,50 €
Salami	7,50 €
Schinken (Ham)	7,50 €
Tonno (Thunfisch)	8,00 €
Mista (gemischter Belag)	8,50 €
Pizza Spezial (Haus)	9,00 €
Calzone (gefüllt)	9,00 €
🔥  GRILL — Griechisch
Bifteki (Hackfleisch gegrillt)	10,50 €
Souvlaki (Schweinespieß)	10,50 €
Gyros mit Pommes & Salat	9,50 €
Schnitzel mit Pommes	10,00 €
Hähnchenbrust gegrillt	10,50 €
🥙  DÖNER & TÜRKISCH
Dönertasche	5,50 €
Döner Box (mit Pommes)	8,00 €
Lahmacun (1 Stück)	3,50 €
Lahmacun mit Salat	6,00 €
🍝  PASTA
Spaghetti Bolognese	8,50 €
Spaghetti Carbonara	9,00 €
Penne Arrabiata (vegan)	8,00 €
Tortellini in Sahnesauce	9,50 €
🥗  SALATE
Bauernsalat	6,00 €
Griechischer Salat	6,50 €
Salat mit Hähnchen	8,50 €
🍟  SNACKS & BEILAGEN
Pommes Frites	3,00 €
Currywurst mit Pommes	6,00 €
Käsebrot / Knoblauchbrot	2,50 €
Dip Saucen (Tzatziki etc.)	1,00 €

⚠️  Note: All prices above are placeholder estimates based on comparable Barmen Imbiss businesses. Owner must confirm/correct all prices before launch.

5.4  Lieferung (Delivery) Section
A dedicated section that many customers don't know about. This is purely informational — no third-party delivery platform, just phone ordering.
•	Background: bg-brand-red with cream text — visually distinct, unmissable
•	Headline: 'Wir liefern — ab 17:00 Uhr' in Playfair Display, large, white
•	Sub-text: 'Rufen Sie uns einfach an. Lieferung ins Barmen-Gebiet.'
•	Large phone CTA button: '0202 553869 — Jetzt bestellen' with phone icon
•	Minimum order note if applicable (placeholder — confirm with owner)
•	Delivery area note: 'Liefergebiet: Wuppertal-Barmen und Umgebung'
•	Animation: phone icon with gentle ring animation on loop

5.5  Über Uns (About) Section
Short, human, genuine. This is not a corporate 'About Us' — it's a neighbourhood story.
Layout: two columns — left column: photo (Unsplash placeholder of warm restaurant interior), right column: text.
Copy direction:
•	Opening: Name meaning — 'Honarmand bedeutet auf Persisch: Handwerker, Künstler. Und genau das leben wir hier jeden Tag.'
•	Story: 'Seit Jahren kochen wir in Barmen für Barmen. Kein Schnickschnack — echtes Essen, faire Preise, und ein herzliches Willkommen für jeden der hereinkommt.'
•	3 value icons: 🍕 Frisch zubereitet · 🕐 Schnell & unkompliziert · ❤️ Seit Jahren im Viertel
⚠️  Copy is placeholder. Owner to review and personalise before launch.

5.6  Öffnungszeiten (Opening Hours) Section
Prominent, standalone section. Many negative reviews come from customers arriving on a Saturday when the restaurant is closed — a clear hours display prevents this.
•	Layout: centred card on cream background
•	Saturday row highlighted in red with 'GESCHLOSSEN' label — must be visually obvious
•	'Walk-ins willkommen' badge below the hours table
•	'Lieferung ab 17:00 Uhr' secondary note

5.7  Kontakt & Anfahrt (Contact / Map) Section
•	Two-column layout: left = contact details, right = Google Maps iframe embed
•	Contact: address, phone number (clickable tel: link), 'No email / booking system — just call'
•	Map: iframe embed for Heubruch 17, 42275 Wuppertal — grayscale default, colour on hover
•	WhatsApp CTA for delivery orders: wa.me link
•	Map address pin label: 'Barmer Pizzeria · Heubruch 17'

5.8  Footer
•	Background: bg-charcoal (#2C2C2C), text white/80
•	4-column: Logo+tagline | Navigation | Öffnungszeiten | Kontakt
•	Bottom bar: © year + Impressum link + Datenschutz link
•	No social media links (none exist yet — add TODO comment for future)

6. ANIMATIONS & INTERACTIONS

Page-Level Animations (Motion / Framer Motion)
•	Hero headline: staggered word-by-word fade-up (0.1s per word, ease-out)
•	Hero CTAs: fade-up with 0.8s delay after headline completes
•	All section content: fade-up on scroll (whileInView, once: true, margin: -100px)
•	Menu category tabs: smooth tab switch with AnimatePresence (no layout shift)
•	Delivery phone button: gentle scale pulse (1.0 → 1.03 → 1.0) on 3s loop

Micro-interactions
•	Navbar: bg transition transparent → white + shadow on scrollY > 60
•	Menu cards: subtle border-colour reveal on hover (red border traces all 4 sides)
•	Phone CTA: scale 1.02 on hover, scale 0.98 on tap
•	Gallery images (if added): scale 1.05 on hover with overlay label

7. SEO & TECHNICAL REQUIREMENTS

Meta Tags (index.html)
Title	Barmer Pizzeria Wuppertal – Pizza, Grill & Döner in Barmen | Heubruch 17
Description	Barmer Pizzeria in Wuppertal-Barmen – Pizza, Grill, Döner, Pasta. Lieferung ab 17 Uhr. Heubruch 17, 42275 Wuppertal. Tel: 0202 553869.
Keywords	Pizza Barmen, Pizzeria Wuppertal Barmen, Döner Heubruch, Imbiss Barmen, Lieferservice Wuppertal
OG Title	Barmer Pizzeria – Ihr Imbiss in Wuppertal-Barmen
OG Type	website
Canonical	https://barmer-pizzeria-wuppertal.de
Robots	index, follow

JSON-LD Structured Data (LocalBusiness)
•	@type: FoodEstablishment
•	name: Barmer Pizzeria
•	address: Heubruch 17, 42275 Wuppertal, DE
•	telephone: +492025538690
•	geo: latitude 51.2735, longitude 7.2010
•	openingHours: Mo-Fr 11:00-22:00, Su 16:00-22:00
•	servesCuisine: ['Italian', 'Turkish', 'Greek', 'German']
•	priceRange: €

Stack
•	React 18 + Vite 6 (same as all 3 salons)
•	Tailwind CSS v4, Motion (Framer Motion v12)
•	React Router v7 for /impressum and /datenschutz routes
•	No backend — WhatsApp + phone only
•	Deployment: Vercel free tier, static deploy
•	Domain: barmer-pizzeria-wuppertal.de via Ionos (~€12/year)
•	vercel.json with SPA rewrites for legal pages

8. SALES PRICING

Line Item	Min	Max
Website Design & Development	€400	€600
Domain (barmer-pizzeria-wuppertal.de)	€12/yr	€12/yr
Menu PDF (printable A4 version)	€50	€80
Monthly Maintenance	€15/mo	€20/mo

Suggested total first invoice: €460–€680 (website + domain + menu PDF).

9. FIGMA MAKE PROMPT

Copy this prompt exactly into Figma Make to generate the UI designs:

Design a warm, inviting website for BARMER PIZZERIA, a neighbourhood Imbiss/Trattoria at Heubruch 17, 42275 Wuppertal-Barmen, Germany.  DESIGN CONCEPT: 'Barmen Trattoria' — Warm Italian trattoria energy meets honest neighbourhood Imbiss. Gemütlich, welcoming, not luxury. Classic checkered tablecloth pattern as a recurring decorative motif (subtle, not overwhelming). The visual language of a place where regulars sit for coffee and the owner knows everyone by name.  COLOUR PALETTE: - Primary (Trattoria Red): #C0392B - Background (Warm Cream): #FDF6EC - Text (Charcoal): #2C2C2C - Accent (Muted Gold): #B7860B - Soft accent (Blush): #FADBD8 - Cards/Nav: #FFFFFF  TYPOGRAPHY: - Display headlines: Playfair Display (bold, elegant but accessible) - Sub-headings / menu categories: Lora italic - Body / menu items / prices: Inter  SECTIONS TO DESIGN (in order):  1. NAVBAR — Fixed. Transparent on load, white with shadow on scroll. Logo left: "BARMER PIZZERIA" in Playfair Display + tiny pizza icon. Nav links right: Speisekarte · Lieferung · Über Uns · Öffnungszeiten · Kontakt. Red CTA button: "Jetzt Bestellen". Mobile hamburger.  2. HERO — Full viewport height. Dark overlay on warm restaurant background image. Checkered red/cream decorative border strip at the very bottom of the hero. Centre-aligned content: gold badge "Ihr Imbiss in Wuppertal-Barmen" · large white headline "Barmer Pizzeria" in Playfair Display · italic sub-headline "Pizza · Grill · Döner · Pasta" · body text "Hausgemacht. Frisch. Seit Jahren in Barmen." · two CTAs: gold button "Speisekarte ansehen" + ghost/outline button "Jetzt anrufen". Staggered word reveal animation.  3. MENU SECTION — The most important section. Tabbed navigation for categories: Pizza | Grill | Döner | Pasta | Salate | Snacks. Each tab shows a clean two-column list of items and prices. Category tab header has subtle checkered accent on the left edge. Item rows alternate between white and cream background. Prices right-aligned in Trattoria Red, bold. "ab" prefix where applicable. The menu is clean, readable, and scannable on mobile. Example items: Pizza Margherita 6,50€ · Gyros mit Pommes 9,50€ · Dönertasche 5,50€ · Spaghetti Bolognese 8,50€.  4. DELIVERY SECTION — Full-width red background (#C0392B) with cream text. Large Playfair Display headline: "Wir liefern — ab 17:00 Uhr". Sub-text: "Rufen Sie uns einfach an. Lieferung ins Barmen-Gebiet." Giant white phone CTA button: "0202 553869 — Jetzt bestellen" with phone icon. Delivery area note below: "Liefergebiet: Wuppertal-Barmen und Umgebung". Phone icon has subtle pulsing animation.  5. ABOUT SECTION — Two-column layout on warm cream background. Left: photograph (placeholder — warm restaurant interior with red-white checkered tablecloths). Right: heading "Handwerk seit Jahren in Barmen" · body text about owner Honarmand (meaning: Persian for 'skilled craftsman') and neighbourhood roots · 3 value icons in a row: 🍕 Frisch zubereitet · 🕐 Schnell & gut · ❤️ Seit Jahren im Viertel.  6. ÖFFNUNGSZEITEN SECTION — Centred card on cream background. Clean hours table. SATURDAY row highlighted visually with red background and "GESCHLOSSEN" label — this must be immediately obvious. Badge below: "Walk-ins willkommen" in green. Note: "Lieferung ab 17:00 Uhr täglich".  7. KONTAKT & MAP SECTION — Two-column. Left: contact details (address, phone as clickable link, delivery note). Right: Google Maps iframe for Heubruch 17 Wuppertal (greyscale default, colour on hover). WhatsApp order button below map.  8. FOOTER — Dark charcoal background. 4 columns: Brand logo + tagline | Navigation | Öffnungszeiten summary | Kontakt. Bottom bar: copyright · Impressum · Datenschutz.  TECHNICAL STACK: - React 18 + Vite 6 - Tailwind CSS v4 - Motion (Framer Motion) for animations - Radix UI + shadcn/ui components - Lucide React icons - react-responsive-masonry if gallery is added - No backend required  INTERACTIONS: - Navbar scroll behaviour (transparent → white) - Smooth scroll for all nav links - Menu tab switching with AnimatePresence - Phone button pulse animation - All section content fade-up on scroll (whileInView) - Hover: menu card border colour reveal - Image hover: colour (from greyscale) on map iframe  CONTENT LANGUAGE: German (Deutsch) throughout. Prices in € with comma decimal notation (e.g. 6,50 €).  LEGAL PAGES: Include routes for /impressum and /datenschutz as simple text pages using the same Navbar and Footer.

10. PRE-LAUNCH CHECKLIST

Owner Must Confirm Before Launch
•	Verify all menu prices — all prices in this PRD are estimates
•	Confirm Saturday is closed (currently shown as Geschlossen)
•	Confirm delivery hours (shown as 'ab 17:00')
•	Provide real phone number for WhatsApp delivery link
•	Review About section copy — personalise with real story
•	Supply real interior/food photos (replace Unsplash placeholders)
•	Provide Impressum details: full legal name, tax ID, email

Developer Checklist
•	Google Fonts loaded in index.html (Playfair Display, Lora, Inter)
•	All SEO meta tags and JSON-LD in index.html
•	Menu items imported from src/config/menu.ts (not hardcoded)
•	Phone/WhatsApp numbers imported from src/config/contact.ts
•	vercel.json created with SPA rewrite rules
•	Impressum and Datenschutz pages created at /impressum and /datenschutz
•	All images lazy-loaded except hero (eager)
•	Vite build chunk splitting configured
•	npm run build completes without TypeScript errors


Barmer Pizzeria PRD  ·  Prepared by Eseosa  ·  Wuppertal-Barmen Freelance Web Agency
