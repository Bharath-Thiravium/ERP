# Phase 1.1 — Technology Stack

## Summary table

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| **Backend framework** | Django | 5.2.9 |
| | Django REST Framework | 3.16.1 |
| | DRF Spectacular (OpenAPI docs) | 0.29.0 |
| | Django Channels (WebSockets) | 4.3.2 + channels-redis 4.3.0 |
| **Frontend framework** | React | 19.1.1 |
| | Vite (build tool) | 7.1.2 |
| | TypeScript | ~5.8.3 |
| **Mobile** | React Native | 0.81.4 (`EmployeeAttendanceApp`) |
| **Database** | PostgreSQL | via `psycopg2-binary` 2.9.11, DB name `modernsap` |
| **Cache / Broker / Channel layer** | Redis | `redis` 7.1.0 (DB 0 broker/channels, DB 1 cache) |
| **Task queue** | Celery | 5.6.1 + django-celery-beat 2.8.1 + django-celery-results 2.6.0 |
| **Auth** | SimpleJWT | 5.5.1 (+ token blacklist) **and** custom service-user session auth |
| **State mgmt (FE)** | Zustand | 5.0.8 (auth, service-user, theme stores) |
| **Server state (FE)** | TanStack React Query | 5.87.1 |
| **Styling (FE)** | Tailwind CSS 3.4 + Ant Design 5.27 + Headless UI + Framer Motion | |
| **HTTP client (FE)** | Axios | 1.11.0 |
| **Forms/validation (FE)** | react-hook-form 7.62 + zod 4.1 + @hookform/resolvers | |
| **Web server (prod)** | Gunicorn 23.0 + Uvicorn 0.40 (ASGI) + WhiteNoise 6.11 | behind nginx |
| **CI/CD** | GitHub Actions → SSH deploy (`appleboy/ssh-action`) | single VPS |
| **Process mgmt (prod)** | systemd (`gunicorn`, `nginx` services) | inferred from deploy.yml |

## Backend stack (detail)

**Core:** Django 5.2.9 + DRF. Settings in [backend/sap_backend/settings.py](../backend/sap_backend/settings.py).
Uses `python-decouple` for env config (with an `os.environ` fallback shim).

**Default user model:** Django's built-in `auth.User` (the custom `AUTH_USER_MODEL` is
**commented out** in settings). Tenant/role data is layered on via the `authentication` app
(`MasterAdmin`, `CompanyUser`, `CompanyServiceUser`).

**API documentation:** drf-spectacular — `/api/schema/`, `/api/docs/` (Swagger),
`/api/redoc/` — **only exposed when `IS_PRODUCTION` is false**.

**Notable libraries (from `requirements.txt`):**
- **PDF / documents:** `weasyprint` 67, `reportlab` 4.4.7, `qrcode`, `Pillow` — invoice/quotation/PO PDF generation.
- **Data / reports:** `pandas` 2.3.3, `numpy`, `openpyxl` (Excel), `matplotlib`, `seaborn`.
- **AI / ML (heavy):** `torch` 2.9.1, `transformers` 4.57, `sentence-transformers` 5.2,
  `huggingface-hub`, `tokenizers`, `safetensors` — used by `ai_assistant` (document embeddings / semantic query).
- **Computer vision / biometrics:** `face-recognition` 1.3, `dlib` 20, `opencv-python`,
  `scikit-learn` — used by HR attendance / mobile face recognition.
- **Security:** `cryptography` (Fernet email-credential encryption), `pyotp` (2FA TOTP), `pyjwt`.
- **Scheduling:** `python-crontab`, `cron-descriptor` (email automation cron setup).
- **Misc:** `python-magic` (file type sniffing), `user-agents`, `psutil` (system metrics).

> ⚠️ The ML/CV stack (`torch`, `dlib`, `face-recognition`, `transformers`) is the single
> biggest install-cost driver. Tiered requirement files exist:
> `requirements-lite.txt`, `requirements-prod.txt`, `requirements_pandas.txt`,
> `requirements_weasyprint.txt`.

## Frontend stack (detail)

**Build:** Vite 7 (`vite.config.ts`, plus `vite.config.performance.ts`), `pnpm` package
manager (`pnpm-lock.yaml`), PWA via `vite-plugin-pwa` + Workbox.

**UI:** Tailwind 3.4 (+ forms & typography plugins), Ant Design 5.27, Headless UI,
`lucide-react` + `@ant-design/icons`, `framer-motion`.

**Data & charts:** `chart.js` + `react-chartjs-2`, `recharts`.

**Routing:** `react-router-dom` 7.8 (custom router in `src/lib/router.tsx`).

**Client-side PDF:** `jspdf` + `html2canvas` (in addition to server-side WeasyPrint).

**Realtime:** `socket.io-client` 4.8 (note: backend realtime is Django Channels — verify
protocol compatibility; this may be vestigial or a separate gateway).

**Security/util:** `dompurify` (HTML sanitization), `date-fns` + `dayjs` + `moment` (three
date libs present — duplication, see code-quality report).

## Mobile stack (`EmployeeAttendanceApp`)

React Native 0.81.4 + React Navigation 7 + Redux Toolkit 2.9 + `react-native-vision-camera`
+ `react-native-image-picker` + `@react-native-community/geolocation` +
`react-native-permissions`. Purpose: employee attendance with camera (face) capture and geo-location.

## Authentication system

Two parallel mechanisms (configured in `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`):

1. **`rest_framework_simplejwt.authentication.JWTAuthentication`** — Bearer JWT for
   **Master Admin** and **Company Users**. Access token 60 min, refresh 1440 min, rotation +
   blacklist enabled.
2. **`authentication.authentication.ServiceUserSessionAuthentication`** — custom session-key
   auth for **Service Users** (`CompanyServiceUser` + `ServiceUserSession`), keyed by a
   `service_session_key` stored in browser `sessionStorage`/`localStorage`.

Plus **2FA (TOTP)** via `pyotp` (see `TwoFactorPage` on frontend).

## State management

- **Frontend global:** Zustand stores — `authStore.ts` (JWT users), `serviceUserStore.ts`
  (service-user sessions), `themeStore.ts` (light/dark).
- **Frontend server cache:** TanStack React Query (10 min stale, 30 min gc, no refetch on focus).
- **Mobile:** Redux Toolkit (`src/store/slices`).

## Third-party services & external integrations

| Service | Purpose | Where |
|---------|---------|-------|
| **SMTP (Hostinger)** `smtp.hostinger.com` | Transactional + business email (invoices, quotations) | `settings.py` EMAIL_*, `finance/email_utils.py` |
| **GSTIN verification API** | GST number validation (`GSTINCHECK_API_KEY`) | configuration/finance |
| **Hugging Face Hub** | Model downloads for `ai_assistant` embeddings | `transformers`/`sentence-transformers` |
| **Redis** | Broker, result backend, cache, channel layer | settings |
| Company-level SMTP | Per-company outbound email creds (Fernet-encrypted) | `company_dashboard.CompanyEmailSettings` |

> No AWS/GCP/Azure SDKs were found in `requirements.txt` — deployment is a **self-managed VPS**.
> "Cloud integrations" are limited to the VPS + external SMTP + GSTIN API + Hugging Face.

## Build & deployment tools

- **Backend build/run:** `manage.py`, `gunicorn`, `collectstatic` + WhiteNoise, `run_dev.py`.
- **Frontend build:** `pnpm run build` (Vite), output `dist/`.
- **Deploy:** `.github/workflows/deploy.yml` (test job + SSH deploy job) plus a large set of
  shell scripts (`deploy.sh`, `deploy_production.sh`, `deploy_live_production.sh`,
  `update_production.sh`, `restart_services.sh`, `secure_production.sh`, etc.).
- **No Dockerfile / docker-compose / Kubernetes manifests exist** in the repo.
