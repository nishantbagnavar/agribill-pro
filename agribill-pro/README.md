# AgriBill Pro

Billing and inventory management software for Indian agri-shops — fertilizer, pesticide, and seed dealers. Built for offline-first use on Windows laptops. Single-tenant SQLite per shop.

---

## What It Does

- **Billing & POS** — create GST-compliant invoices, manage payments, print thermal/standard receipts
- **Inventory** — track products, variants, stock levels, expiry dates, batch numbers
- **Customers** — customer ledger, payment history, due amounts
- **GST Reports** — GSTR-1 ready reports in JSON, PDF, and Excel formats
- **WhatsApp** — send bills and reminders to customers via WhatsApp Web
- **Dashboard** — sales analytics, low stock alerts, due payment reminders
- **Cloud Backup** — automatic SQLite backup to Cloudflare R2
- **Auto-updater** — background update checks with delta ZIP support
- **License Gate** — Supabase-backed licensing with HWID fingerprinting

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express (CommonJS) |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Frontend | React 18 + Vite + TailwindCSS |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Monitoring | Sentry |
| Licensing | Supabase |
| Backup | Cloudflare R2 |

---

## Project Structure

```
agribill-pro/
├── backend/
│   ├── src/
│   │   ├── config/        ← db.js, env.js
│   │   ├── db/            ← migrate.js, schema.js, seed-data.js
│   │   └── modules/       ← auth, billing, inventory, customers,
│   │                         reports, whatsapp, backup, updater,
│   │                         license, printer, reminders, dashboard
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/         ← Auth, Billing, Inventory, Customers,
│   │   │                     Dashboard, Reports, WhatsApp, Settings
│   │   ├── components/    ← Layout, Sidebar, Topbar
│   │   ├── store/         ← Zustand stores (auth, cart, notifications)
│   │   ├── hooks/         ← TanStack Query hooks
│   │   └── api/           ← Axios API layer
│   └── package.json
├── installer/
│   ├── BUILD-ZIP.ps1      ← packaging script (creates distributable ZIP)
│   ├── BUILD-ZIP.bat      ← double-click wrapper for BUILD-ZIP.ps1
│   ├── BUILD-ZIP.md       ← step-by-step build and test guide
│   └── assets/            ← nssm.exe, icon.ico, env.production
├── data/                  ← SQLite database (agribill.db)
└── package.json           ← root scripts
```

---

## Development Setup

**Prerequisites:** Node.js v20+, npm

```bash
# Install all dependencies
cd agribill-pro
npm run install:all

# Start dev server (frontend: :3000, backend: :5000)
npm run dev
```

Copy `.env.example` to `.env` and fill in your values before starting.

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Backend port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `DB_PATH` | SQLite file path (default `./data/agribill.db`) |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `SUPABASE_URL` | Supabase project URL (license DB) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `LICENSE_HMAC_SECRET` | HMAC secret for license verification |
| `SENTRY_DSN` | Sentry DSN for crash monitoring |
| `VITE_SENTRY_DSN` | Sentry DSN for frontend |
| `R2_ENDPOINT` | Cloudflare R2 endpoint (cloud backup) |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET` | R2 bucket name |
| `UPDATE_MANIFEST_URL` | URL to update manifest JSON |

---

## Database

SQLite database at `<app-root>/data/agribill.db`.

```bash
# Run migrations (creates all tables)
npm run db:migrate

# Seed initial data
npm run db:seed
```

Migrations are idempotent — safe to run multiple times.

---

## Building the Windows Installer (ZIP)

The app distributes as a self-contained ZIP for Windows. The ZIP includes bundled Node.js v24, nssm.exe (Windows service manager), and all app files.

```powershell
# From agribill-pro\installer\
powershell -ExecutionPolicy Bypass -File BUILD-ZIP.ps1
```

Or double-click `BUILD-ZIP.bat`.

**Output:** `installer\output\AgriBillPro-v1.0.0-Windows.zip` (~74 MB)

See [installer/BUILD-ZIP.md](installer/BUILD-ZIP.md) for the full step-by-step guide including prerequisites, manual verification steps, and post-build test protocol.

---

## Customer Installation Flow

1. Customer receives the ZIP file
2. Extracts to any folder (e.g. `C:\AgriBillPro\`)
3. Right-clicks `AgriBill Pro - Install.bat` → Run as administrator
4. Clicks Yes on UAC prompt
5. App installs as a Windows service (auto-starts with Windows)
6. Browser opens at http://localhost:5000
7. Customer registers their shop
8. Enters license key (issued from admin portal)
9. App is fully unlocked

**Data location:** `<extracted-folder>\AgriBillPro-v1.0.0-Windows\data\agribill.db`

---

## API Routes

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/shop
PUT    /api/shop

GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

GET    /api/categories
GET    /api/inventory
POST   /api/inventory/adjust

GET    /api/customers
POST   /api/customers
GET    /api/customers/:id/ledger

GET    /api/billing
POST   /api/billing
GET    /api/billing/:id
GET    /api/billing/:id/pdf

GET    /api/dashboard
GET    /api/reports/gst-summary

GET    /api/license/status
POST   /api/license/activate

GET    /api/updater/check
POST   /api/updater/apply

POST   /api/backup/trigger
GET    /api/backup/list
```

---

## Key Conventions

- **Money is stored as paise (integers).** ₹100 = 10000. Never store floats for money.
- **Backend is CommonJS.** Always use `require()` / `module.exports`.
- **Frontend is ES modules.** Always use `import` / `export`.
- **Design tokens over hardcoded colors.** Use `var(--primary)`, `var(--gray-900)`, etc.

---

## License

Private — all rights reserved. Contact bagnavarnishant@gmail.com.
