# HairConnekt Admin Panel — Technical Specification

> **Document Version:** 1.0  
> **Date:** 2026-08-11  
> **Scope:** Web-based administration panel for HairConnekt platform operators

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure](#2-file-structure)
3. [Frontend Stack & Dependencies](#3-frontend-stack--dependencies)
4. [Routing & Page Architecture](#4-routing--page-architecture)
5. [Authentication & Security](#5-authentication--security)
6. [API Contracts](#6-api-contracts)
7. [Frontend Data Types](#7-frontend-data-types)
8. [Environment Configuration](#8-environment-configuration)
9. [Backend Controllers](#9-backend-controllers)
10. [UI Component Library](#10-ui-component-library)
11. [Styling System](#11-styling-system)
12. [Audit Logging](#12-audit-logging)
13. [Error Handling](#13-error-handling)
14. [Testing Specification](#14-testing-specification)
15. [CI/CD Pipeline](#15-cicd-pipeline)
16. [Feature Pages — Detailed Specs](#16-feature-pages--detailed-specs)
17. [Deployment & Build](#17-deployment--build)

---

## 1. Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Admin Panel (Web)                  │
│  React 19 + TypeScript + Vite + React Router v7    │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Pages     │  │  Components │  │   Utils     │ │
│  │ Dashboard   │  │  Layout     │  │  api.ts     │ │
│  │ Providers   │  │  UI (modals)│  │  apiError   │ │
│  │ Users       │  │  ErrorBndry │  │             │ │
│  │ Categories  │  │             │  │             │ │
│  │ Pop. Styles │  │             │  │             │ │
│  │ Login       │  │             │  │             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│         └────────────────┼────────────────┘        │
│                          │                         │
│                    ┌─────▼─────┐                   │
│                    │  Axios    │  (HTTP Client)    │
│                    │  + CSRF   │                   │
│                    │  + Retry  │                   │
│                    └─────┬─────┘                   │
└──────────────────────────┼─────────────────────────┘
                           │ HTTPS / Cookie Session
                           │
┌──────────────────────────▼─────────────────────────┐
│              NestJS Backend API (v1)                │
│  Controllers → Services → TypeORM → PostgreSQL     │
│  JWT Auth + AdminGuard + CSRF + Audit Logs         │
└────────────────────────────────────────────────────┘
```

### Architectural Principles

| Principle | Implementation |
|-----------|----------------|
| **Authentication** | Cookie-based JWT session (`admin-session` cookie) + CSRF token header |
| **Authorization** | `JwtAuthGuard` + `AdminGuard` on all `/admin/*` routes |
| **State Mgmt** | Local component state (`useState`) — no global store (Redux/Zustand) |
| **Routing** | `react-router-dom` v7 with `BrowserRouter` (client-side only, no SSR) |
| **Data Fetching** | Axios instance with interceptors (CSRF injection, 401 handling, retry) |
| **Type Safety** | Strict TypeScript (`strict: true`, `noUnusedLocals: true`) |
| **Error Boundary** | Top-level class-based `ErrorBoundary` with Sentry integration hook |
| **Audit Trail** | Backend-only; all admin mutations logged via `AuditService` |

---

## 2. File Structure

```
apps/admin/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── scripts/
│   └── audit-ci.mjs              # Custom npm audit gate (suppresses React Router RSC-only GHASAs)
├── src/
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/
│   │   ├── ErrorBoundary.tsx      # Class-based React ErrorBoundary with Sentry hook
│   │   ├── Layout.tsx             # Sidebar + Topbar shell, renders <Outlet/>
│   │   ├── ui.tsx                 # Shared primitives (Toasts, Modals, Spinners)
│   │   └── error-boundary.css
│   ├── pages/
│   │   ├── Login.tsx              # Unauthenticated entry point
│   │   ├── Dashboard.tsx          # Stats overview (4 metric cards)
│   │   ├── Providers.tsx          # Provider approval/reject/suspend workflow
│   │   ├── Users.tsx              # User CRUD + bulk delete + pagination
│   │   ├── Categories.tsx         # Category CRUD + inline toggle
│   │   └── PopularStyles.tsx      # Style CRUD + image upload + preview
│   ├── utils/
│   │   └── apiError.ts            # Axios error formatter + name-field error extractor
│   ├── App.tsx                    # Route tree + ProtectedRoute wrapper
│   ├── App.css
│   ├── api.ts                     # Core: Axios instance + CSRF + all API calls + TS types
│   ├── index.css                  # Global CSS variables + utility classes
│   └── main.tsx                   # React root bootstrap
├── .env                           # Local Vite env (VITE_API_URL)
├── index.html
├── package.json
├── tsconfig.json                  # References tsconfig.app.json + tsconfig.node.json
├── tsconfig.app.json              # Strict TS config for src/
├── tsconfig.node.json
├── vite.config.ts                 # Vite + @vitejs/plugin-react (Oxc)
├── eslint.config.js               # Flat-config ESLint 9
└── README.md
```

**Code References:**
- [App.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/App.tsx)
- [api.ts](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/api.ts)
- [Layout.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/components/Layout.tsx)

---

## 3. Frontend Stack & Dependencies

### Runtime Dependencies (`dependencies`)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.4 | UI framework |
| `react-dom` | ^19.2.4 | DOM renderer |
| `react-router` | ^7.14.0 | Router core (used via react-router-dom) |
| `react-router-dom` | ^7.14.0 | DOM router bindings (`BrowserRouter`, `NavLink`, etc.) |
| `axios` | ^1.14.0 | HTTP client with interceptors |
| `lucide-react` | ^1.7.0 | SVG icon library |
| `clsx` | ^2.1.1 | Class name utility |
| `tailwind-merge` | ^3.5.0 | Tailwind class merger (used sparingly via inline `style`) |

### Build/Dev Dependencies (`devDependencies`)

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^8.0.1 | Build tool + dev server |
| `@vitejs/plugin-react` | ^6.0.1 | React plugin (Oxc-based, not SWC) |
| `typescript` | ~5.9.3 | TypeScript compiler |
| `@types/node` | ^24.12.0 | Node types |
| `@types/react` | ^19.2.14 | React types |
| `@types/react-dom` | ^19.2.3 | React DOM types |
| `@hairconnekt/types` | `file:../../packages/types` | Shared cross-package types |
| `eslint` | ^9.39.4 | Linter |
| `@eslint/js` | ^9.39.4 | ESLint JS config |
| `typescript-eslint` | ^8.57.0 | TypeScript ESLint plugin + parser |
| `eslint-plugin-react-hooks` | ^7.0.1 | Hooks rules |
| `eslint-plugin-react-refresh` | ^0.5.2 | Fast Refresh rules |
| `globals` | ^17.4.0 | Global type definitions |

### Shared Types Package

Resolved via: `@hairconnekt/types → ../../packages/types`

**Exports (from `packages/types/src/index.ts`):**
- `UserRole = 'client' | 'provider' | 'admin'`
- `ProviderType = 'freelancer' | 'salon' | 'mobile' | 'barber'`
- `ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended'`
- `BookingStatus`, `CancellationPolicy`, `ServicePriceType`, `PaymentStatus`, `CancelledBy`, `Gender`
- DTOs: `AuthTokens`, `UserDto`, `ProviderSummaryDto`, `ProviderPublicDto`, `ServiceDto`, `BookingResponseDto`, etc.

**Code Reference:** [index.ts](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/packages/types/src/index.ts)

---

## 4. Routing & Page Architecture

### Route Tree (from `App.tsx`)

```
<BrowserRouter>
├── /login                           → Login.tsx (public, no auth)
│
└── /  (ProtectedRoute → validates session)
    │   Layout: sidebar + topbar + outlet
    │
    ├── (index redirect)            → /dashboard
    ├── /dashboard                  → Dashboard.tsx
    ├── /providers                  → Providers.tsx
    ├── /users                      → Users.tsx
    ├── /popular-styles             → PopularStyles.tsx
    └── /categories                 → Categories.tsx

<Route path="*" → redirect to />
```

### ProtectedRoute Flow (`App.tsx:L17-L86`)

1. On mount → calls `getAdminSession()`
2. **Cache TTL:** 5 minutes (300,000 ms) in-memory
3. States: `'loading' → 'ready' | 'unauthorized'`
4. 401 / unauthorized → `navigate('/login', { replace: true })`
5. On auth expiry callback → redirects to `/login` or full `window.location.replace`

---

## 5. Authentication & Security

### 5.1 Session Flow

```
┌──────────┐                    ┌──────────┐
│  Login   │ POST /auth/admin-login         │
│  Page    │ → identifier + password        │
│          │ → returns { user } + SET-COOKIE│
└────┬─────┘                    └─────┬────┘
     │                                │
     │  HTTP-only, Secure cookie:     │
     │  admin-session=<JWT>           │
     │  + CSRF cookie set             │
     ▼                                ▼
┌──────────────────────────────────────────────┐
│          Subsequent Requests                  │
│                                              │
│  Cookie: admin-session   (auto-sent)         │
│  Header: X-CSRF-Token     (unsafe methods)   │
│  withCredentials: true                       │
└──────────────────────────────────────────────┘
```

### 5.2 CSRF Protection

**Mechanism (in `api.ts`):**
- `csrfClient` fetches `GET /auth/admin-csrf` → returns `{ csrfToken }`
- Token cached in-memory as `adminCsrfToken`
- Request interceptor auto-injects `X-CSRF-Token` header for **unsafe methods** (`POST`, `PUT`, `PATCH`, `DELETE`)
- CSRF bootstrap request is excluded from injection to prevent circular dependency
- **Retry logic on 403 + CSRF keyword:** fetches fresh token (1 retry max, flagged via `__csrfRetried`)

**Key Code:**
- CSRF fetch: [api.ts:L87-L111](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/api.ts#L87-L111)
- Request interceptor: [api.ts:L113-L122](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/api.ts#L113-L122)
- Response interceptor (401 + 403 retry): [api.ts:L129-L163](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/api.ts#L129-L163)

### 5.3 Rate Limiting (Backend-side)

| Endpoint | Guard | Throttle Limit |
|----------|-------|----------------|
| `POST /auth/admin-login` | `AdminLoginThrottlerGuard` | 5 attempts / 15 min |
| `POST /auth/admin-login` | `IpThrottlerGuard` | Same as above |

### 5.4 Guards

All admin endpoints protected by guard chain: `@UseGuards(JwtAuthGuard, AdminGuard)`
- `JwtAuthGuard` → validates JWT from `admin-session` cookie
- `AdminGuard` → checks `user.role === UserRole.ADMIN`

### 5.5 Login Page Specifics

- Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password min length: 8 chars
- Error mapping:
  - 401 → "Falsches Passwort oder falsche E-Mail!"
  - 429/423 → Rate limit warning (15 min)
  - 403 → Account locked / no admin rights
  - Network Error → CORS / backend unreachable

**Code Reference:** [Login.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/pages/Login.tsx)

---

## 6. API Contracts

> All URLs are relative to `VITE_API_URL` (normalized to always end in `/api/v1`).  
> All admin endpoints require valid admin session + CSRF token on write operations.

### 6.1 Auth Endpoints

| Method | Path | Purpose | Request | Response | Auth |
|--------|------|---------|---------|----------|------|
| `POST` | `/auth/admin-login` | Admin login (sets session cookie) | `{ identifier: string, password: string }` | `{ user: AdminUserSummary }` | ❌ Public |
| `GET` | `/auth/admin-csrf` | Fetch CSRF token | — | `{ csrfToken: string }` | ❌ Public (sets CSRF cookie) |
| `GET` | `/auth/admin-session` | Validate session + get user | — | `{ user: AdminUserSummary }` | ✅ Admin |
| `POST` | `/auth/admin-logout` | Invalidate session | — | void (clears cookie) | ✅ Admin |

### 6.2 Stats Endpoint

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| `GET` | `/admin/stats` | Dashboard overview | — | `AdminStatsResponse` |

**Response shape:**
```typescript
{
  pendingProviders: number;
  approvedProviders: number;
  activeCategories: number;
  activePopularStyles: number;
}
```

### 6.3 Provider Endpoints

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| `GET` | `/admin/providers` | List providers (filterable by status) | Query: `?status=pending\|approved\|rejected\|suspended` | `AdminProvider[]` |
| `GET` | `/admin/providers/:id` | Get single provider detail | — | `AdminProvider` |
| `GET` | `/admin/providers/:id/id-document` | **302 Redirect** to signed ID doc URL (60s TTL, audited) | — | Redirect to R2 signed URL |
| `GET` | `/admin/providers/geocoding/report` | Geocoding coverage report | — | `{ summary, missingDetails }` |
| `PATCH` | `/admin/providers/:id/approve` | Approve pending provider | — | `{ success: true }` |
| `PATCH` | `/admin/providers/:id/reject` | Reject provider (reason optional) | `{ reason?: string }` | `{ success: true }` |
| `PATCH` | `/admin/providers/:id/suspend` | Suspend approved provider (reason required by UI, API-optional) | `{ reason?: string }` | `{ success: true }` |
| `PATCH` | `/admin/providers/:id/status` | Generic status change (all 4 statuses) | `{ status: ProviderStatus, reason?: string }` | `{ success: true }` |
| `DELETE` | `/admin/providers/:id` | Soft-delete provider | — | `{ success: true }` |

### 6.4 User Endpoints

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| `GET` | `/admin/users` | Paginated user list | Query: `limit` (max 50), `offset`, `includeDeleted=0\|1\|true\|false` | `AdminUsersListResponse` |
| `DELETE` | `/admin/users/:id` | Soft-delete single user (admins cannot be deleted) | — | **204 No Content** |
| `POST` | `/admin/users/bulk-delete` | Batch soft-delete | `{ ids: string[] }` | `AdminUsersBulkDeleteResponse` |

**Notes:**
- Hard page size cap: `MAX_PAGE_SIZE = 50` → throws `400 BadRequestException`
- `includeDeleted=true` returns both active + soft-deleted users; default returns only active users
- Admin users are skipped in both single and bulk delete (counted in `skippedAdmin`)

### 6.5 Category Endpoints

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| `GET` | `/admin/categories` | List all categories (incl. inactive) | — | `Category[]` |
| `POST` | `/admin/categories` | Create category | `CreateCategoryDto` | `Category` |
| `PATCH` | `/admin/categories/:id` | Update category | `UpdateCategoryDto` (partial) | `Category` |
| `DELETE` | `/admin/categories/:id` | Delete category | — | **204 No Content** |

**Notes:**
- Unique name constraint → 409 Conflict
- Sort order zero-based

### 6.6 Popular Styles Endpoints

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| `GET` | `/admin/popular-styles` | List all styles (admin view) | — | `PopularStyle[]` |
| `POST` | `/admin/popular-styles` | Create style | `CreatePopularStyleInput` | `PopularStyle` |
| `PATCH` | `/admin/popular-styles/:id` | Update style | `UpdatePopularStyleInput` (partial) | `PopularStyle` |
| `PATCH` | `/admin/popular-styles/reorder` | Batch reorder | `{ ids: string[] }` ordered by desired sequence | `{ success: true }` |
| `DELETE` | `/admin/popular-styles/:id` | Delete style | — | **204 No Content** |
| `POST` | `/admin/popular-styles/:id/image` | Upload image (multipart) | FormData: `styleImage` (max 5MB, JPEG/PNG/WEBP) | `{ imageUrl: string }` |
| `DELETE` | `/admin/popular-styles/:id/image` | Remove style image | — | **204 No Content** |

### 6.7 Public Popular Styles Endpoint (Non-Admin)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/popular-styles` | Active styles for mobile app | ❌ Public |

---

## 7. Frontend Data Types

All defined in `apps/admin/src/api.ts`.

### Core User Types

```typescript
type AdminUserSummary = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
  role?: 'client' | 'provider' | 'admin';
};

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'client' | 'provider' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
};

type AdminUsersListResponse = {
  data: AdminUser[];
  total: number;
  limit: number;
  offset: number;
};

type AdminUsersBulkDeleteResponse = {
  deleted: number;
  skippedAdmin: number;
  notFound: number;
  alreadyDeleted: number;
};
```

### Provider Types

```typescript
type AdminProvider = {
  id: string;
  status: ProviderStatus;
  isEmailVerified?: boolean;
  createdAt: string;
  city?: string | null;
  providerType?: string | null;
  businessName?: string | null;
  avatarUrl?: string | null;
  hasIdDocument?: boolean;
  user?: AdminUserSummary | null;
};
```

### Category & Style Types

```typescript
type Category = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

type PopularStyle = {
  id: string;
  name: string;
  imageUrl: string | null;
  emoji: string;
  colorHex: string;
  sortOrder: number;
  isActive: boolean;
};

type CreatePopularStyleInput = {
  name: string;
  emoji?: string;
  colorHex?: string;
  sortOrder?: number;
};

type UpdatePopularStyleInput = Partial<CreatePopularStyleInput> & {
  isActive?: boolean;
};
```

---

## 8. Environment Configuration

### 8.1 Admin Panel Environment (`.env`)

**File:** `apps/admin/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | `https://api.hairconnekt.de/api/v1` | Backend base URL. Normalized to always append `/api/v1` if missing. Local default: `http://localhost:3000/api/v1` |

**Normalization rules (from `api.ts:normalizeBaseUrl`):**
1. Trim trailing slashes
2. Empty string → fallback to `https://api.hairconnekt.de/api/v1`
3. If URL doesn't end in `/api/v1` → append it

### 8.2 Backend Environment (for Admin features)

**File:** `packages/backend/.env.example`

| Variable | Description | Relevance to Admin |
|----------|-------------|--------------------|
| `NODE_ENV` | Runtime environment | Affects CORS, cookie security |
| `PORT` | Backend port | Admin connects here via VITE_API_URL |
| `DATABASE_URL` | PostgreSQL (Neon) DSN | Data source |
| `DATABASE_SSL` | Enable SSL (true for Neon) | Required for Neon |
| `JWT_ACCESS_SECRET` | JWT signing key | Signs `admin-session` cookie |
| `JWT_ACCESS_EXPIRES` | Access token lifetime (default 15m) | Session duration |
| `BCRYPT_ROUNDS` | Password hash cost | Admin password verification |
| `CORS_ORIGIN` | CSV CORS allowlist | **Must include** Admin panel origin (`https://admin.hairconnekt.de` in production) |
| `R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_ENDPOINT / R2_PUBLIC_URL` | Cloudflare R2 storage | ID document signed URLs + popular-style images |
| `BREVO_API_KEY / SMTP_FROM` | Email provider | Provider approval/rejection notifications |

---

## 9. Backend Controllers

### 9.1 Admin Controllers Inventory

| Controller | File | Mount Path | Guards | Operations |
|------------|------|------------|--------|------------|
| `AdminUsersController` | [admin-users.controller.ts](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/packages/backend/src/admin/admin-users.controller.ts) | `admin/users` | `JwtAuthGuard + AdminGuard` | `GET findAll`, `DELETE :id`, `POST bulk-delete` |
| `AdminProvidersController` | [admin-providers.controller.ts](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/packages/backend/src/admin/admin-providers.controller.ts) | `admin/providers` | `JwtAuthGuard + AdminGuard` | `GET findAll`, `GET :id`, `GET :id/id-document`, `PATCH :id/approve`, `PATCH :id/reject`, `PATCH :id/suspend`, `PATCH :id/status`, `DELETE :id`, `GET geocoding/report` |
| `AdminCategoriesController` | [admin-categories.controller.ts](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/packages/backend/src/admin/admin-categories.controller.ts) | `admin/categories` | `JwtAuthGuard + AdminGuard` | `GET findAll`, `POST create`, `PATCH :id`, `DELETE :id` |
| `AdminStatsController` | [admin-stats.controller.ts](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/packages/backend/src/admin/admin-stats.controller.ts) | `admin/stats` | `JwtAuthGuard + AdminGuard` | `GET getStats` |
| `AdminPopularStylesController` | [popular-styles.controller.ts:L42-L104](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/packages/backend/src/popular-styles/popular-styles.controller.ts#L42-L104) | `admin/popular-styles` | `JwtAuthGuard + AdminGuard` | `GET getAll`, `POST create`, `PATCH :id`, `DELETE :id`, `POST :id/image`, `DELETE :id/image`, `PATCH reorder` |
| `AuthController` (admin routes) | [auth.controller.ts](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/packages/backend/src/auth/auth.controller.ts) | `auth/*` | Mixed (admin-login has throttle) | `POST admin-login`, `GET admin-csrf`, `GET admin-session`, `POST admin-logout` |

### 9.2 Key Dependencies Injected

| Service | Used By | Purpose |
|---------|---------|---------|
| `AuditService` | All admin controllers | Records every admin mutation (success + failure) |
| `NotificationsService` | AdminProviders | Sends `provider_approved` push notification |
| `R2Service` | AdminProviders + PopularStyles | Signed URLs for ID docs + image storage |
| `PopularStylesService` | AdminPopularStyles | Style business logic |
| Repositories (TypeORM) | All | Database access (`User`, `Provider`, `ServiceCategory`, `PopularStyle`, `Service`, `RefreshToken`) |

---

## 10. UI Component Library

All custom UI primitives live in `components/ui.tsx` (no external UI lib like Radix/MUI).

### 10.1 Component Inventory

| Component | Props / Hooks | Purpose |
|-----------|---------------|---------|
| **`useDialogLifecycle(open, onClose, ref)`** | Hook | Manages: Esc-to-close, Tab focus-trap, save-restore focus, `body.overflow=hidden` |
| **`LoadingSpinner`** | `{ label?: string }` | Centered spinner + label; `role="status"` |
| **`PageError`** | `{ message: string, onRetry?: () => void }` | Top-level error banner with retry button; `role="alert"` |
| **`ConfirmDialog`** | `{ open, onClose, title, description?, confirmLabel?, cancelLabel?, confirmVariant?: 'primary'\|'success'\|'danger', onConfirm }` | Destructive-action confirmation (approve/delete patterns) |
| **`AlertDialog`** | `{ open, onClose, title, description?, confirmLabel? }` | Info/error alert (OK-only) |
| **`PromptDialog`** | `{ open, onClose, title, description?, confirmLabel?, cancelLabel?, placeholder?, multiline?, initialValue?, required?, confirmVariant?, onConfirm(value) }` | Text input dialog — reject/suspend reasons. Supports single-line or multiline (textarea) |
| **`ToastProvider`** | Wraps children (Layout) | Context provider. Renders fixed bottom-right toast stack (success/error, auto-dismiss 4.5s) |
| **`useToasts()`** | Hook → `{ success(msg), error(msg) }` | Push toast; safe fallback no-op if provider not mounted |

**Code Reference:** [ui.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/components/ui.tsx)

### 10.2 ErrorBoundary (Class-Component)

**File:** [ErrorBoundary.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/components/ErrorBoundary.tsx)

- Catches uncaught render errors in entire app tree
- Integrates with `window.Sentry.captureException()` (if Sentry loaded globally)
- UI options: **Seite neu laden** / **Zum Start**
- Expandable `<details>` section with: error name, message, Sentry event ID, stack trace

---

## 11. Styling System

**Strategy:** Pure CSS (no Tailwind classes used despite `tailwind-merge` dev dep; all styling via CSS custom properties + utility classes).

### 11.1 Design Tokens (`:root` in `index.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-color` | `#f8fafc` | Page background |
| `--surface` | `#ffffff` | Cards, modals, sidebar |
| `--text-main` | `#0f172a` | Body text |
| `--text-muted` | `#64748b` | Secondary text, labels |
| `--primary` | `#3b82f6` | Brand (blue) |
| `--primary-hover` | `#2563eb` | Hover state |
| `--danger` | `#ef4444` | Delete / reject actions |
| `--success` | `#22c55e` | Approve / success |
| `--warning` | `#f59e0b` | Warnings (pending badge via amber) |
| `--border` | `#e2e8f0` | Dividers, inputs |
| `--radius` | `12px` | Uniform corner radius |
| `--shadow` | (2 values) | Card shadows |

### 11.2 Utility Classes

| Class | Applies To |
|-------|------------|
| `.btn` | Base button (inline-flex, gap, radius, weight-500) |
| `.btn-primary` / `.btn-danger` / `.btn-success` / `.btn-outline` | Button variants |
| `.input-field` | Text inputs + textarea |
| `.card` | Surface + shadow + padding block |
| `.layout` / `.sidebar` / `.sidebar-nav` / `.nav-link` / `.main-content` / `.topbar` / `.page-content` | App shell |
| `.table-container` / `table` / `th` / `td` | Table system |
| `.badge` + `.badge-pending/.badge-approved/.badge-rejected/.badge-suspended` | Status pills |
| `.modal-overlay` / `.modal` / `.modal-header` / `.modal-body` / `.modal-footer` | Modal system |
| `.tabs` / `.tab` / `.tab.active` | Tab filter row |
| `.login-page` / `.login-card` | Login page shell |
| `.spinner` | Inline animated spinner (for uploads etc.) |

**Code Reference:** [index.css](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/index.css)

---

## 12. Audit Logging

Every admin mutation is recorded via the backend `AuditService.record()`. Below are the registered action names:

| Action Name | Controller | Trigger | Data Captured |
|-------------|------------|---------|---------------|
| `auth.admin.login` | Auth | Admin login success/failure | identifier, outcome, reason |
| `admin.user.delete` | AdminUsers | Single user delete | beforeState (role, isActive, deletedAt), afterState |
| `admin.users.bulk_delete` | AdminUsers | Bulk delete | per-item result, counts, ids |
| `admin.provider.approve` | AdminProviders | Approve | before/after status, notificationType |
| `admin.provider.reject` | AdminProviders | Reject | reason, before/after status |
| `admin.provider.suspend` | AdminProviders | Suspend | reason, before/after status |
| `admin.provider.status_change` | AdminProviders | Generic status PATCH | reason, desired status |
| `admin.provider.delete` | AdminProviders | Provider soft-delete | beforeState |
| `admin.provider.id_document_accessed` | AdminProviders | ID doc view (every GET) | documentKey, expiresInSeconds |
| `category.created` | AdminCategories | Create | afterState (name, desc, sort, active) |
| `category.updated` | AdminCategories | Update | beforeState + afterState |
| `category.deleted` | AdminCategories | Delete | beforeState |

All audit records include: `actorUserId`, `actorRole`, `targetType`, `targetId(s)`, `outcome`, `request` metadata (IP, user-agent).

---

## 13. Error Handling

### 13.1 Frontend

**`formatApiError(err)` → Human-readable string (in `utils/apiError.ts`):**

Priority order for Axios errors:
1. `Status: XXX • backend_message • requestId: <x-request-id header>`
2. `Error.message`
3. `"Unbekannter Fehler."`

**`tryExtractNameFieldError(err)` → `string | null`:**
- Scans 400/409/422 responses for name-related keywords (duplicate key, unique constraint, "Name ist erforderlich", etc.)
- Used in Categories + PopularStyles forms to show per-field validation instead of generic alert

### 13.2 HTTP Status → UI Mapping (Login Page)

| Status | UI Message |
|--------|------------|
| 401 | "Falsches Passwort oder falsche E-Mail!" |
| 429 / 423 | "Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie 15 Minuten..." |
| 403 | "Zugriff verweigert. Dieses Konto ist gesperrt oder hat keine Admin-Rechte." |
| Network Error | "Verbindung fehlgeschlagen. Backend ist möglicherweise nicht erreichbar oder blockiert CORS." |

### 13.3 Per-Page Error Pattern

Every page implements this consistent 3-state pattern:
```typescript
const [isLoading, setIsLoading] = useState(true);
const [pageError, setPageError] = useState('');
const [rowErrors, setRowErrors] = useState<Record<string, string>>({}); // inline row errors
```

Display hierarchy:
1. **PageError banner** (top) — unrecoverable load failures with retry button
2. **Toast.error()** — transitory failures; auto-dismiss
3. **Inline row error** — per-row toggle/action failures
4. **AlertDialog** — mutation confirmation failures that need explicit user dismiss
5. **Form field errors** — client-side validation + extracted backend field errors

---

## 14. Testing Specification

### 14.1 Current State

⚠️ **No tests exist** in `apps/admin/**/*.test.{ts,tsx}` (glob returned empty).
The Admin panel currently has zero unit/integration/e2e tests.

### 14.2 Recommended Test Strategy

#### Unit Tests (Jest + React Testing Library)

| Test File | Coverage Scope |
|-----------|----------------|
| `api.test.ts` | CSRF interceptor, 401 handling, 403 retry, URL normalization, session cache |
| `apiError.test.ts` | `formatApiError` (all error shapes), `tryExtractNameFieldError` (409/400/422) |
| `ui.test.tsx` | Dialog lifecycle (Esc, Tab trap, focus restore), Toast auto-dismiss, Confirm/Prompt variants |
| `pages/Login.test.tsx` | Form validation (email regex, min 8 pw), status-code → message mapping, submission loading state |
| `pages/Users.test.tsx` | Pagination logic, select-all, bulk-delete confirmation, admin skip, deleted-user toggle |
| `pages/Providers.test.tsx` | Filter tabs, approve confirm flow, reject prompt (reason min 6), suspend prompt (required reason), ID doc image |
| `pages/Categories.test.tsx` | Create/edit modal validation, inline toggle optimistic + rollback, delete confirm |
| `pages/PopularStyles.test.tsx` | Create/edit form (color hex regex, sort min 0, name required), image upload (<=5MB, type check), delete image/style |
| `pages/Dashboard.test.tsx` | Loading → 4 cards, retry on error |
| `App.test.tsx` | ProtectedRoute redirect flow (ready/unauthorized/loading), wildcard → `/`, session cache expiry |

#### Contract Tests

Validate frontend `api.ts` call signatures against backend OpenAPI spec:
- Every method in `api.ts` has matching backend route + method
- Request/response DTOs structurally match backend DTOs
- HTTP status error codes (400/401/403/404/409/422) are all handled

#### E2E Tests (Playwright recommended)

| Test Suite | Scenarios |
|-----------|-----------|
| `auth.spec.ts` | Login → session → auto-logout on 401 → rate-limit lockout |
| `providers.spec.ts` | Approve pending provider → notification fired → reject with reason → suspend required reason → ID document renders |
| `users.spec.ts` | Paginate → select 5 users → bulk delete → admin not deletable → includeDeleted filter |
| `categories-crud.spec.ts` | Create category (unique name enforced) → edit → toggle active → delete (confirm) |
| `styles-crud.spec.ts` | Create style (validate color hex, emoji) → upload jpeg (<5MB) → upload png > 5MB rejected → delete image → delete style |
| `security.spec.ts` | CSRF token rotation on 403, session cookie HttpOnly flag, API calls without session → 401, DELETE user as non-admin → blocked |

### 14.3 Test Utilities (Recommended Additions)

```typescript
// tests/server.ts — MSW to mock backend
//   - /auth/admin-session (mock valid admin)
//   - /auth/admin-csrf (return token)
//   - All /admin/* endpoints with fixtures

// tests/fixtures.ts
//   - makeAdminUser(), makeProvider(status='pending'), makeCategory(), makePopularStyle()

// tests/wrappers.tsx
//   - <WithRouter(children, initialEntries)>
//   - <WithToast(children)>
```

---

## 15. CI/CD Pipeline

### 15.1 NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Local dev server (HMR) |
| `build` | `tsc -b && vite build` | Type-check + production build |
| `lint` | `eslint .` | ESLint 9 flat-config lint |
| `preview` | `vite preview` | Serve built `dist/` locally |
| `audit:ci` | `node scripts/audit-ci.mjs` | Custom audit gate (CI use) |

### 15.2 CI Audit Gate (`audit-ci.mjs`)

Since React Router v7 pulls in RSC/SSR-only vulnerabilities that don't affect the BrowserRouter+axios setup, the audit script:

1. Runs `npm audit --omit=dev --audit-level=high --json`
2. Extracts GHSA IDs from each advisory
3. **Suppresses a hardcoded allowlist** of 16 React Router GHSA IDs that only affect RSC/SSR/Actions features
4. **Blocks on:**
   - Any CRITICAL advisory (any package)
   - Any HIGH advisory not in the allowlist
5. Exits non-zero if blocked vulnerabilities exist

**Code Reference:** [audit-ci.mjs](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/scripts/audit-ci.mjs)

### 15.3 Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-<hash>.js
│   ├── index-<hash>.css
│   └── ...other assets
```

Vite build config (from `vite.config.ts`):
- Plugin: `@vitejs/plugin-react` (Oxc compiler, not Babel/SWC)
- No explicit `build.outDir` → default `dist`

---

## 16. Feature Pages — Detailed Specs

### 16.1 Dashboard (`/dashboard`)

**File:** [Dashboard.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/pages/Dashboard.tsx)

| Aspect | Spec |
|--------|------|
| **Data source** | `GET /admin/stats` (single call) |
| **Loading** | `LoadingSpinner` label: "Statistiken werden geladen…" |
| **Error state** | `PageError` with retry |
| **Layout** | CSS grid auto-fit 280px minimum |
| **Cards (4)** | 1. Ausstehende Anbieter (pending, amber) |
| | 2. Genehmigte Anbieter (approved, green) |
| | 3. Kategorien Aktiv (blue/primary) |
| | 4. Beliebte Styles Aktiv (amber) |
| **Accessibility** | Each card `<section>` with `aria-labelledby`, count has `aria-live="polite"` |

### 16.2 Providers Management (`/providers`)

**File:** [Providers.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/pages/Providers.tsx)

| Aspect | Spec |
|--------|------|
| **Tabs / Filters** | Alle · Ausstehend · Genehmigt · Abgelehnt · Gesperrt |
| **Table columns** | Name (avatar, email, verified badge) · Business/Typ · Stadt · Status · Registriert · Aktionen |
| **Row click** | Opens detail modal (contact + business + ID doc image) |
| **Action matrix (buttons)** | **PENDING** → ✓ Approve (confirm) · ✗ Reject (prompt, reason ≥6 optional)<br>**APPROVED** → ⊖ Suspend (prompt, reason ≥6 REQUIRED)<br>**SUSPENDED** → ✓ Re-activate (approve path) |
| **Reject validation** | If reason provided → min 6 chars |
| **Suspend validation** | Reason required → min 6 chars |
| **Audit trail** | Reasons persisted via `reason` field in `AuditService.record()` |
| **Notification** | Provider approval fires push notification `provider_approved` |

### 16.3 Users Management (`/users`)

**File:** [Users.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/pages/Users.tsx)

| Aspect | Spec |
|--------|------|
| **Pagination** | `limit=20` fixed, offset-based, `MAX_PAGE_SIZE=50` enforced backend |
| **Pagination UI** | Window of 7 page buttons, Prev/Next disabled at boundaries |
| **Select-all** | Checkbox in header; selects all non-admin, non-deleted rows on current page |
| **Bulk delete** | Button disabled when 0 selected; confirm dialog shows count |
| **Show deleted toggle** | Resets to page 1, clears selection |
| **Admin protection** | Admin users have **no checkbox + no delete button + skipped in bulk delete** |
| **Status display** | Aktiv / Inaktiv / Gelöscht + email-verified badge (✓/✉) |
| **After bulk delete** | Recalculates total; auto-jumps to previous page if current page emptied |
| **Bulk delete response** | Uses `AdminUsersBulkDeleteResponse` — shows `deleted` count in toast |

### 16.4 Categories Management (`/categories`)

**File:** [Categories.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/pages/Categories.tsx)

| Aspect | Spec |
|--------|------|
| **CRUD** | Modal-based create/edit + inline isActive toggle + delete (confirm) |
| **Create modal fields** | Name* (required), Beschreibung (textarea, optional), Sortier-Reihenfolge (min 0), Aktiv checkbox |
| **Validation** | Name required, sortOrder ≥ 0, name uniqueness (409 Conflict → field error focus) |
| **Inline toggle** | Optimistic update first; if API fails → rolls back + shows inline row error |
| **Empty state** | ShieldAlert icon + "Keine Kategorien vorhanden." |

### 16.5 Popular Styles Management (`/popular-styles`)

**File:** [PopularStyles.tsx](file:///Users/eseosaedosomwan/Downloads/Hairconnekt%20redefined/apps/admin/src/pages/PopularStyles.tsx)

| Aspect | Spec |
|--------|------|
| **Split layout** | 60% left: table list; 40% right: mobile-viewport preview |
| **Preview panel** | Horizontally-scrollable card row showing active styles sorted by sortOrder |
| **Card dimensions** | 130×170px, colorHex background, emoji overlay if no image, name bottom-bar on dark overlay |
| **CRUD** | Modal create/edit + inline toggle + delete (confirm) |
| **Image upload** | Camera button → hidden file input → FormData POST; 5MB cap; JPEG/PNG/WEBP only; spinner overlay during upload |
| **Image delete** | X button → confirm "Das Bild wird vom Server gelöscht." |
| **Live preview in modal** | 80×110px card renders with current form values (color + emoji + name) |
| **Create modal fields** | Name* (max 50), Emoji (max 4), Color (color picker + hex text input, regex `^#[0-9A-Fa-f]{6}$`), Sortier-Reihenfolge (min 0) |
| **Status toggle UI** | Custom animated switch (not checkbox) with `aria-pressed` |

---

## 17. Deployment & Build

### 17.1 TypeScript Configuration

**`tsconfig.app.json` (strict mode):**
```json
{
  "target": "ES2023",
  "lib": ["ES2023", "DOM", "DOM.Iterable"],
  "module": "ESNext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedSideEffectImports": true,
  "erasableSyntaxOnly": true,
  "verbatimModuleSyntax": true,
  "skipLibCheck": true
}
```

### 17.2 CORS Requirements

The backend `CORS_ORIGIN` must **explicitly include** the Admin origin:
- **Production:** `https://admin.hairconnekt.de` (already in `.env.example` allowlist)
- **Local dev:** `http://localhost:5173` (Vite default port) must be added for local development

`withCredentials: true` is set on the Axios instance → CORS must allow credentials (origin cannot be `*`).

### 17.3 Production Checklist

1. **`VITE_API_URL`** → `https://api.hairconnekt.de` (or `/api/v1`-suffixed)
2. **Cookie flags** → `Secure=true`, `HttpOnly=true`, `SameSite=Lax` (enforced backend when `NODE_ENV=production`)
3. **CORS_ORIGIN** → includes admin hostname (not `*`)
4. **ID document access** → every view is audited (verify R2 signed URLs expire ≤ 60s)
5. **Admin user creation** → must be seeded via SQL/migration (no public admin registration endpoint)
6. **Rate limiting** → verify throttler limits in production (5 attempts/15min on admin login)

### 17.4 Adding New Features (Template)

When adding a new admin feature:

1. **Backend:**
   - Add route in relevant controller under `src/admin/` with `@UseGuards(JwtAuthGuard, AdminGuard)`
   - Add `AuditService.record()` call for every mutation (success + failure branches)
   - Add DTO in `src/admin/dto/` for request bodies
   - Register controller in `app.module.ts`

2. **Frontend:**
   - Add API call wrapper + TS types in `src/api.ts`
   - Add route in `App.tsx` inside `ProtectedRoute`
   - Add NavLink in `Layout.tsx` sidebar
   - Create page in `src/pages/<Feature>.tsx` following the 3-state pattern (loading/pageError/data)
   - Use `LoadingSpinner`, `PageError`, `useToasts()`, `ConfirmDialog/PromptDialog/AlertDialog` for UX consistency
   - Accessibility: `role` + `aria-*` attributes on tables, dialogs, status badges
   - Error display: `formatApiError()` + per-field extraction if applicable

3. **Security:**
   - Verify the endpoint returns 401 without session
   - Verify the endpoint returns 403 for non-admin users
   - CSRF: unsafe methods must have `X-CSRF-Token` (interceptor handles this automatically)
   - IDOR: all resource IDs must be checked against admin permissions (not just URL param)

4. **Testing:**
   - Jest unit test for new page/component
   - Contract test: frontend types match backend DTOs
   - (Optional) Playwright E2E happy-path test

---

*End of Technical Specification*
