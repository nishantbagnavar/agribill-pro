# AgriBill Pro

A complete **Agriculture Shop Management System** built for Indian shopkeepers. Handles billing, inventory, GST reporting, customer ledgers, thermal printing, and automatic backups — all running locally on a Windows PC via a single `.exe` installer.

---

## What's Inside

This repository contains three separate apps:

| Folder | What it is |
|---|---|
| `agribill-pro/` | The main desktop app (Node.js + React). This is what shopkeepers install. |
| `agribill-admin/` | Owner dashboard to manage all shop licenses (React, deployed on Vercel). |
| `agribill-portal/` | Shopkeeper self-service portal — activate license, reset HWID (React, deployed on Vercel). |

---

## Features

### For the Shopkeeper
- **POS Billing** — Fast billing with product search autocomplete, cart editing, payment modes (Cash/UPI/Credit)
- **GST Billing** — Auto-calculates CGST/SGST/IGST per product, generates PDF invoices
- **Inventory** — Track stock, categories, low-stock alerts, expiry alerts
- **Customer Ledger** — Track who owes how much, add notes, view payment history
- **GST Reports** — Monthly GSTR-1 style reports exported to PDF + Excel
- **WhatsApp Integration** — Send bill links directly via WhatsApp Web
- **Thermal Printer** — ESC/POS support for 58mm/80mm receipt printers; also supports standard Windows printers
- **Automatic Backups** — Daily SQLite snapshots uploaded to Cloudflare R2 with a 3-step restore wizard
- **Auto-Updater** — In-app update banner; downloads and applies delta updates without reinstalling
- **Keyboard Shortcuts** — F2 (new bill), F4 (search), F10 (checkout) for fast billing

### For You (the App Owner)
- **License System** — Hardware fingerprinting (HWID), 7-day offline grace, 2-reset quota per year
- **Admin Dashboard** — Suspend/activate shops, extend license, reset HWID, add private notes
- **Telegram Alerts** — Notified instantly when a new shop registers
- **Crash Monitoring** — Sentry integration for both backend and frontend

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Express, SQLite (via Drizzle ORM) |
| Frontend | React 18, Vite, Tailwind CSS, Zustand, TanStack Query |
| Charts | Recharts |
| PDF | pdfkit |
| Excel | exceljs |
| Printing | node-thermal-printer, pdf-to-printer |
| Auth | JWT (access + refresh tokens), bcrypt |
| License | Supabase (license DB), node-machine-id (HWID), HMAC (offline grace) |
| Backup | Cloudflare R2 via AWS SDK |
| Monitoring | Sentry |
| Installer | Inno Setup 6 (bundles Node.js + NSSM Windows service) |
| Admin/Portal | React + Vite, deployed to Vercel |

---

## Project Architecture

```
agribill-pro/
├── backend/
│   └── src/
│       ├── modules/         # Feature modules (auth, billing, inventory…)
│       │   ├── auth/
│       │   ├── billing/
│       │   ├── categories/
│       │   ├── customers/
│       │   ├── dashboard/
│       │   ├── inventory/
│       │   ├── license/
│       │   ├── printer/
│       │   ├── products/
│       │   ├── reminders/
│       │   ├── reports/
│       │   ├── shop/
│       │   ├── updater/
│       │   └── whatsapp/
│       ├── db/              # Drizzle schema, migrations, seed
│       ├── config/          # env, db connection, version
│       └── utils/
├── frontend/
│   └── src/
│       ├── pages/           # One folder per feature
│       ├── components/      # Shared UI (Layout, UpdateBanner…)
│       ├── hooks/           # TanStack Query hooks per feature
│       ├── store/           # Zustand stores (auth, cart, notification)
│       ├── api/             # Axios API clients per module
│       └── utils/           # formatCurrency, formatDate, gstCalculator
├── installer/               # Inno Setup script + build assets
├── scripts/                 # create-delta.js, make-icon.js
└── update-manifest.json     # Current version + download URL for updater
```

---

## Prerequisites

Before you start, make sure you have:

- [Node.js v20+](https://nodejs.org/) installed
- [Git](https://git-scm.com/) installed
- A [Supabase](https://supabase.com/) account (free tier is fine) — for the license system
- [Inno Setup 6](https://jrsoftware.org/isdl.php) — only needed to build the `.exe` installer

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/agribill-pro.git
cd agribill-pro
```

### 2. Install all dependencies

```bash
cd agribill-pro
npm run install:all
```

This installs root, backend, and frontend dependencies in one command.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values (see [Environment Variables](#environment-variables) below).

### 4. Run database migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start development server

```bash
npm run dev
```

This starts both backend (port 5000) and frontend (port 3000) simultaneously.

Open `http://localhost:3000` in your browser.

**Default seed credentials:**
- Email: `admin@agribill.com`
- Password: `admin123`

---

## Environment Variables

Copy `.env.example` to `.env` and fill these in:

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Backend server port (default: 5000) |
| `NODE_ENV` | Yes | `development` or `production` |
| `JWT_SECRET` | Yes | Random 32+ char string for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Random 32+ char string for refresh tokens |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (keep secret!) |
| `LICENSE_HMAC_SECRET` | Yes | Random 32+ char string for offline grace tokens |
| `SENTRY_DSN` | No | Backend Sentry DSN (leave blank in dev) |
| `VITE_SENTRY_DSN` | No | Frontend Sentry DSN (leave blank in dev) |
| `R2_ENDPOINT` | No | Cloudflare R2 endpoint for backups |
| `R2_ACCESS_KEY_ID` | No | R2 API token |
| `R2_SECRET_ACCESS_KEY` | No | R2 API secret |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot for new-shop alerts |
| `TELEGRAM_CHAT_ID` | No | Telegram chat/group ID for alerts |

**Generate a secure secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Building the Windows Installer (.exe)

### Prerequisites
1. Install [Inno Setup 6](https://jrsoftware.org/isdl.php)
2. Download [Node.js v20 standalone](https://nodejs.org/en/download) (`node.exe`) → place in `installer/assets/node/node.exe`
3. Download [NSSM](https://nssm.cc/download) (`nssm.exe`) → place in `installer/assets/nssm/nssm.exe`

### Build

```bash
cd agribill-pro
double-click installer/BUILD-INSTALLER.bat
```

The installer will be created at `installer/output/AgriBillPro-Setup-1.0.0.exe`.

See [installer/INSTALLER_GUIDE.md](agribill-pro/installer/INSTALLER_GUIDE.md) for full details.

---

## Releasing an Update

When you make code changes and want to push them to existing customers:

1. **Bump the version** in `agribill-pro/backend/package.json` (e.g., `1.0.0` → `1.1.0`)
2. **Build the delta zip** (only changed files):
   ```bash
   node scripts/create-delta.js ./v1.0.0-snapshot ./agribill-pro delta-1.1.0.zip
   ```
3. **Upload** `delta-1.1.0.zip` to your server
4. **Update** `update-manifest.json` with the new version and download URL
5. Existing customers will see an **in-app update banner** and can update with one click — no reinstall needed

---

## Deploying the Admin Dashboard

The admin dashboard (`agribill-admin/`) is a separate React app deployed to Vercel.

```bash
cd agribill-admin
cp .env.example .env.local   # fill in your Supabase credentials
npm install
npm run build
# Deploy to Vercel via: vercel deploy
```

See `agribill-admin/.env.example` for required variables.

---

## Deploying the Shopkeeper Portal

Same process as admin:

```bash
cd agribill-portal
cp .env.example .env.local
npm install
npm run build
# Deploy to Vercel via: vercel deploy
```

---

## Available Scripts (agribill-pro/)

| Script | Description |
|---|---|
| `npm run dev` | Start both backend + frontend in dev mode |
| `npm run dev:backend` | Start only the backend with nodemon |
| `npm run dev:frontend` | Start only the frontend with Vite |
| `npm run build` | Build the frontend for production |
| `npm run start` | Start the production backend |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npm run install:all` | Install all dependencies (root + backend + frontend) |

---

## Money Handling

All monetary values are stored as **paise (integers)** in the database, never as decimals. They are converted to `₹` for display using `formatCurrency()`. This avoids floating-point rounding errors in billing.

---

## Design Tokens

| Token | Value |
|---|---|
| Sidebar color | `#1F6F5F` (Deep Teal) |
| Page background | `#EEEEEE` |
| Display font | Sora |
| Body font | Noto Sans |
| Price/code font | JetBrains Mono |

---

## Security Notes

- `.env` is excluded from git — never commit it
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — keep it server-side only
- JWT tokens expire in 15 minutes; refresh tokens in 7 days
- License HMAC grace tokens expire in 7 days and are verified server-side on next online check

---

## License

Private — all rights reserved. This software is not open source.
