# Phase 1.3 — Frontend Analysis

Source: `frontend/` (React 19 + Vite + TypeScript SPA). Router in
[frontend/src/lib/router.tsx](../frontend/src/lib/router.tsx).

## Route map

| Path | Component (lazy) | Guard |
|------|------------------|-------|
| `/login` | `auth/LoginPage` | public (redirects authed users by role) |
| `/2fa` | `auth/TwoFactorPage` | public (TOTP step) |
| `/service-login` | `auth/ServiceUserLogin` | public |
| `/` | → redirect to `/login` | public |
| `/unauthorized` | inline 403 view | public |
| `*` | `NotFoundPage` | public |
| `/master-admin` | `master-admin/EnhancedDashboard` | `requireMasterAdmin` |
| `/master-admin/settings` | `master-admin/UltraSecureSettings` | `requireMasterAdmin` |
| `/company` | `company/Dashboard` | `requireCompanyUser` + `requireApproved` |
| `/company/detailed-info` | `company/DetailedInfoForm` | `requireCompanyUser` |
| `/company/waiting-approval` | `company/WaitingApproval` | `requireCompanyUser` |
| `/company/services` | `company/ServiceSelection` | `requireCompanyUser` + `requireApproved` |
| `/employee` | `EmployeeApp` | (service-user / employee) |
| `/jobs`, `/jobs/:jobId`, `/jobs/:jobId/apply`, `/public/jobs/:jobId` | `public/JobPortal`, `JobApplication`, `PublicJobDetail` | public (recruitment portal) |
| `/services/finance/dashboard` | `services/finance/pages/Dashboard` | `requireServiceUser` |
| `/services/finance/purchase-orders` | `services/finance/pages/PurchaseOrders` | `requireServiceUser` |
| `/services/finance/invoices` | finance invoices page | `requireServiceUser` |
| `/services/hr/dashboard` | `services/hr/pages/Dashboard` | `requireServiceUser` |
| `/services/inventory/dashboard` | `services/inventory/pages/Dashboard` | `requireServiceUser` |
| `/services/crm/*` | `services/crm/index` (sub-router) | `requireServiceUser` |
| `/services/dashboard` | generic service dashboard | `requireServiceUser` |
| `/services/procurement/dashboard` | procurement dashboard | `requireServiceUser` |
| `/services/analytics/dashboard` | analytics dashboard | `requireServiceUser` |
| `/services/sustainability/dashboard` | sustainability dashboard | `requireServiceUser` |
| `/services/athens_sustainability/*` | → redirect `/login?redirect=athens` | — |

All non-public routes are lazy-loaded (`React.lazy` + `Suspense`), keeping the initial bundle small.

## Three user personas / portals

The SPA serves **three distinct audiences** behind one app:

1. **Master Admin** (`/master-admin/*`) — platform operator. JWT auth, `user.is_master_admin`.
2. **Company User / admin** (`/company/*`) — a tenant's administrator. JWT auth,
   `user.is_company_user`, gated by approval + profile completion lifecycle.
3. **Service User** (`/services/*`, `/employee`) — operational users within a company's
   service (finance/hr/inventory/crm). Custom **session-key** auth (separate store).

Plus a **public recruitment portal** (`/jobs/*`) requiring no auth.

## Layouts & components

- **Root composition** ([App.tsx](../frontend/src/App.tsx)): `QueryClientProvider` →
  `ErrorBoundary` → `Router` → `AuthWrapper` → routes, with a global `Toaster`
  (react-hot-toast) and React Query Devtools. Theme (`dark` class) toggled on `<html>`.
- **`AuthWrapper`** ([components/auth/AuthWrapper.tsx](../frontend/src/components/auth/AuthWrapper.tsx)):
  globally renders a **forced** `PasswordChangeModal` whenever `mustChangePassword` or
  `forcePasswordReset` is set — cannot be dismissed.
- **Component areas:** `ui/` (primitives incl. `ErrorBoundary`, `LoadingSpinner`), `layout/`,
  `forms/`, `modals/`, `auth/`, `security/`, `profile/`, `ai-assistant/`, `company/`.
- **Service modules** under `pages/services/<area>/` each have their own `pages/`,
  `components/`, and (for CRM) a nested router — a feature-folder structure.

## API integration

- **Central client:** [frontend/src/lib/api.ts](../frontend/src/lib/api.ts) (~1,651 lines) —
  Axios instance, base URL from `import.meta.env.VITE_API_URL` (and `VITE_API_BASE_URL`),
  request/response interceptors, token attach + refresh handling, error normalization.
- **Token store:** `lib/tokenManager.ts` — access/refresh token persistence.
- **Per-domain API modules:** `services/financeApi.ts`, `analyticsApi.ts`, `employeeAPI.ts`,
  `governmentApi.ts` (GSTIN/government), `integrationApi.ts`.
- **Server state:** TanStack React Query (config in `App.tsx`): `staleTime` 10 min,
  `gcTime` 30 min, **no** refetch on focus/mount, retry disabled on 401, max 2 retries
  otherwise with exponential backoff.
- **Sanitization:** `lib/sanitizer.ts` + `dompurify` for any HTML rendering.

## State management flow

```
Zustand stores (persisted to localStorage)
 ├─ authStore        → JWT users (master/company): user, tokens, firstLoginRequired,
 │                      approvalPending, mustChangePassword, forcePasswordReset
 ├─ serviceUserStore → service users: serviceUser, sessionKey (also sessionStorage)
 └─ themeStore       → light/dark

React Query → server data cache (per-endpoint), independent of Zustand.
```

`authStore.initializeAuth()` runs on app mount: reads token via `tokenManager`, rehydrates
user + lifecycle flags from `sessionStorage`/persisted state, and validates the token with the
backend **in the background** (does not log out on validation failure — only logs).

## Authentication flow (frontend)

1. **Login** (`LoginPage`) → `authStore.login(credentials, userType)` where `userType` ∈
   `'master' | 'company' | 'athens'`. Posts to backend, receives `access`/`refresh`.
2. If response indicates 2FA (`requires_2fa`), redirect to `/2fa` (`TwoFactorPage`) for TOTP.
3. On success, tokens stored, `firstLoginRequired` / `approvalPending` flags set and mirrored
   to `sessionStorage`.
4. **Service users** use a separate `/service-login` → `serviceUserStore`, persisting a
   `service_session_key` to `sessionStorage` + `localStorage`.
5. **Logout** clears tokens, stores, and redirects to `/login`.

## Permission / access-gating flow

Enforced by `ProtectedRoute` (frontend) — **mirrors the backend "Athens" access-state model**:

```
isLoading?                         → spinner
not authenticated (no token)?      → /login  (or /2fa, or /service-login for service routes)
requireMasterAdmin & !is_master    → /unauthorized
requireCompanyUser & !is_company   → /unauthorized
company user & firstLoginRequired  → /company/detailed-info   (must complete profile)
company user & approvalPending     → /company/waiting-approval (pending admin approval)
mustChange/forceReset password     → forced PasswordChangeModal (global, blocking)
else                               → render route
```

> ⚠️ This is **UI-level gating only**. Per `AGENTS.md`, the authoritative access-state must be
> enforced **server-side** (DRF permissions). When auditing security, do not trust these
> redirects alone — verify the matching backend permission checks (report 04).
