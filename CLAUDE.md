# CLAUDE.md — HairConnekt v2
## AI Agent Briefing Document · Read this first, every session

---

## PROJECT
HairConnekt — a two-sided marketplace connecting clients with Afro-hair braiding professionals in Germany.
One app, two modes (Client / Provider). Target: Google Play Store (Android first, iOS Phase 4).

---

## STACK
- Frontend: React Native + Expo (TypeScript) · `apps/mobile/`
- Backend:  NestJS + TypeORM + PostgreSQL · `packages/backend/`
- Storage:  Cloudflare R2 (all image uploads)
- Auth:     JWT access tokens (15min) + refresh tokens (30d)
- State:    React Context (auth) + React Query (server state)
- Navigation: Expo Router (file-based)
- Push notifs: Expo Notifications + FCM
- Real-time: Socket.io (chat)
- Shared types: `packages/types/`

---

## MONOREPO STRUCTURE
```
hairconnekt/
├── apps/
│   ├── mobile/          ← Expo React Native app
│   └── admin/           ← React/Vite admin dashboard (Phase 3)
├── packages/
│   ├── backend/         ← NestJS API
│   └── types/           ← Shared TypeScript interfaces
└── DevDocs/             ← DOC 06–17
```

---

## MOBILE APP STRUCTURE (apps/mobile/src/)
```
├── app/                 ← Expo Router file-based navigation
│   ├── (auth)/          ← splash, account-type, register, login, password-reset
│   ├── (client)/        ← Home, Search, Provider Profile, Booking flow, Appointments
│   ├── (provider)/      ← Dashboard, Calendar, Booking Requests, Services, Portfolio
│   └── (shared)/        ← Notifications, Settings, Chat
├── components/          ← Shared components (see DOC 14)
├── contexts/            ← AuthContext
├── hooks/               ← Custom hooks
├── services/            ← API service (axios)
├── theme/               ← Design tokens (see DOC 13)
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── index.ts
├── types/               ← Local type aliases (imports from packages/types)
└── utils/               ← error-messages.ts, token-storage.ts
```

---

## BACKEND STRUCTURE (packages/backend/src/)
```
├── auth/                ← JWT, guards, decorators
├── users/               ← User entity + CRUD
├── providers/           ← Provider entity + CRUD
├── bookings/            ← Booking flow
├── services/            ← Provider services catalogue
├── availability/        ← Provider availability slots
├── portfolio/           ← Portfolio image management
├── reviews/             ← Reviews + responses
├── chat/                ← WebSocket chat
├── notifications/       ← Push notifications
├── uploads/             ← Cloudflare R2 uploads
├── entities/            ← All 12 TypeORM entities
└── common/              ← Shared filters, guards, decorators
```

---

## THE 5 MOST IMPORTANT RULES

### 1. FIELD NAME CONTRACT
File upload `FileInterceptor` name MUST exactly match `FormData.append()` name.

| Endpoint | formData field | FileInterceptor |
|---|---|---|
| POST /users/me/avatar | `avatar` | `FileInterceptor('avatar')` |
| POST /providers/me/avatar | `avatar` | `FileInterceptor('avatar')` |
| POST /providers/me/id-document | `idDocument` | `FileInterceptor('idDocument')` |
| POST /providers/me/portfolio | `portfolio` | `FileInterceptor('portfolio')` |

### 2. GERMAN STRINGS EVERYWHERE
Every user-facing string must be in German.
Never render `error.message` — map HTTP codes via `mapHttpError()` in `src/utils/error-messages.ts`:

| Code | German message |
|---|---|
| 400 | Ungültige Eingabe. Bitte prüfe deine Daten. |
| 401 | Nicht autorisiert. Bitte melde dich erneut an. |
| 403 | Zugriff verweigert. |
| 404 | Nicht gefunden. |
| 409 | Diese E-Mail-Adresse ist bereits registriert. |
| 422 | Ungültige Daten. Bitte alle Felder prüfen. |
| 500 | Serverfehler. Bitte versuche es später erneut. |

### 3. DESIGN TOKENS ONLY
Never hardcode: colours, pixel sizes, font names.
```ts
// CORRECT
import { colors, spacing, fonts } from '@/theme';
backgroundColor: colors.coral

// WRONG
backgroundColor: '#E05A4E'
marginHorizontal: 24
```

### 4. ONE SCREEN AT A TIME
Never build multiple screens in one session.
Each must pass the DOC 12 Definition of Done on a **REAL Android device** before moving on.

### 5. EXPO IMAGE PICKER ONLY
Never use `expo-image-manipulator`.
```ts
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.7,   // always 0.7
  exif: false,    // always false
});
```

---

## DEFINITION OF DONE (every screen)
- [ ] Screen renders without errors on real Android device (not emulator)
- [ ] All German strings correct — no English visible to user
- [ ] Loading state shows while API calls are in progress
- [ ] Error state shows German error message (mapped from status code)
- [ ] Empty state shows when list has zero items
- [ ] Navigation works (back button, deep links)
- [ ] All buttons and touch targets are at least 44×44pt
- [ ] No hardcoded colours or pixel values (design tokens only)
- [ ] API field names match DOC 08 exactly
- [ ] `tsc --noEmit` passes — zero TypeScript errors

---

## /me vs /:id — CRITICAL API CONTRACT

| | /me | /:id |
|---|---|---|
| Auth | Always required | Usually public |
| Data | Full private + public | Public only — private stripped |
| Example | GET /providers/me → own status, idDocumentUrl | GET /providers/:id → public profile |

**Never include in /:id responses:** `status`, `idDocumentUrl`, `street`, `houseNumber`, `postalCode`, `bufferMinutes`, `lat`, `lng`

---

## DOCS REFERENCE
| Doc | Name | When to read |
|---|---|---|
| DOC 06 v2 | Technical Spec | Before building any screen |
| DOC 07 v2 | Architecture Spec | Before writing any module or pattern |
| DOC 08 v4 | API Contract ← GATE | Before writing ANY code |
| DOC 09 | .env Definitions | When setting up environment |
| DOC 10 v2 | Screen Build Prompts | For each screen — copy prompt |
| DOC 11 | Test Specs | After each screen — run test cases |
| DOC 13 | Design Tokens | When writing any StyleSheet |
| DOC 14 | Component Specs | Before building any shared component |
| DOC 15 v3 | DB Schema | Before creating any TypeORM entity |
| DOC 16 | Prompt Templates | Template for writing Antigravity prompts |
| DOC 17 | Figma Dev Links | One-click Figma Dev Mode access |

---

## FIGMA
File key: `nDwVaZoQo7e6zpx8YijMSj`
Base URL: `https://www.figma.com/design/nDwVaZoQo7e6zpx8YijMSj/Hairconnekt-redefined?node-id=NODE_ID&m=dev`

---

## PHASE 1 CONSTRAINTS
- Payments: cash only (`Vor Ort bar zahlen`). No Stripe.
- All providers: free tier. `platformFeePercent = 0`. `providerPayout = totalPrice`.
- UI Language: German only
- Target device: Android (Play Store submission first)
- Booking number format: `HC-YYYYMMDD-XXXX` (4-digit zero-padded daily counter)
