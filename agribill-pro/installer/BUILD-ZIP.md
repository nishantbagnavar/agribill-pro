# AgriBill Pro — ZIP Package Build Guide

This document is the single source of truth for building, verifying, and testing
the distributable ZIP. Follow every step in order. Do not skip the pre-flight
verification — it catches problems before the ZIP reaches a customer.

---

## Prerequisites Checklist

Before running anything, confirm every item below:

| # | Check | How to verify |
|---|---|---|
| 1 | Node.js v20 or v24 installed | `node --version` in terminal |
| 2 | npm available | `npm --version` |
| 3 | nssm.exe present | File exists at `installer\assets\nssm\nssm.exe` |
| 4 | icon.ico present | File exists at `installer\assets\icon.ico` |
| 5 | env.production present | File exists at `installer\assets\env.production` |
| 6 | No placeholder in env.production | Open file — `UPDATE_MANIFEST_URL` must not contain `YOUR_GITHUB_USERNAME` |
| 7 | Root .env present | File exists at `agribill-pro\.env` |
| 8 | No AgriBillPro Windows service running | `sc query AgriBillPro` must say "service does not exist" or be stopped |

---

## Step-by-Step Manual Verification (Run These Before BUILD-ZIP.ps1)

These steps confirm the app works correctly BEFORE packaging. If any step fails,
fix it first — do not package a broken app.

### V1 — Verify frontend builds cleanly

```powershell
# From agribill-pro\ root:
npm run build
```

Expected: Vite completes with "✓ built in X.Xs", no errors.
After: `backend\public\index.html` must exist.

### V2 — Verify backend starts in development mode

```powershell
# From agribill-pro\ root:
node backend/src/index.js
```

Expected output (within 3 seconds):
```
✅ Cron jobs started
✅ Backup cron started
🚀 AgriBill Pro server running on port 5000
```

Open http://localhost:5000 in browser — login page should load.
Press Ctrl+C to stop.

### V3 — Verify DB lands in the right place

After V2 above, confirm the SQLite file is at:
```
agribill-pro\data\agribill.db    ← CORRECT location
```

If you see it at `agribill-pro\backend\data\agribill.db` instead, the db.js
fix has not been applied. Stop and apply Fix A from this guide before continuing.

### V4 — Verify backend prod env starts correctly

```powershell
# From agribill-pro\ root:
$env:NODE_ENV="production"; node backend/src/index.js
```

Expected: same startup messages as V2. The license gate will be active but
the server still binds to port 5000. Press Ctrl+C to stop.

### V5 — Verify nssm.exe is functional

```powershell
agribill-pro\installer\assets\nssm\nssm.exe --version
# OR
agribill-pro\installer\assets\nssm\nssm.exe help
```

Expected: prints version info (e.g. NSSM 2.24). If it errors, re-download
nssm.exe from https://nssm.cc/download.

---

## Running the Build Script

Once all V1–V5 checks pass:

```powershell
# From agribill-pro\ root OR from the installer\ folder:
powershell -NoProfile -ExecutionPolicy Bypass -File installer\BUILD-ZIP.ps1
```

Or double-click `installer\BUILD-ZIP.bat` (wrapper that calls the ps1).

The script runs 12 steps and takes 3–5 minutes. It will stop and show the
error log if anything fails. Do not dismiss the window mid-build.

**Expected final output:**
```
  ============================================================
    SUCCESS!
  ============================================================
    File  :  installer\output\AgriBillPro-v1.0.0-Windows.zip
    Size  :  ~180 MB
```

The output folder will open automatically.

---

## Manual Test Protocol (Run After ZIP Is Built)

Test on the SAME machine in a clean folder. Do NOT test inside the agribill-pro
source tree.

### Test Environment Setup

```
Extract ZIP to:  C:\Temp\AgriBillPro\
```

Make sure the AgriBillPro Windows service does NOT exist before starting:
```powershell
sc query AgriBillPro
# Must say "The specified service does not exist"
```

### Test Steps

| # | Action | Expected Result |
|---|---|---|
| T1 | Double-click `AgriBill Pro - Install.bat` | **Windows UAC prompt appears immediately** |
| T2 | Click YES on the UAC prompt | Console window opens, shows 4 numbered steps |
| T3 | Wait for "AgriBill Pro is ready!" message | Browser opens at http://localhost:5000 automatically |
| T4 | Run `sc query AgriBillPro` in cmd | `STATE: 4 RUNNING`, `START_TYPE: 2 AUTO_START` |
| T5 | Check `C:\Temp\AgriBillPro\data\agribill.db` | File exists (DB at package root, NOT inside backend\data\) |
| T6 | Register a shop and create a test bill | App is fully functional |
| T7 | Double-click `Open AgriBill Pro.bat` | Browser opens without UAC prompt |
| T8 | Double-click `Stop AgriBill Pro.bat` | UAC prompt → service stops → browser page becomes unreachable |
| T9 | Double-click `AgriBill Pro - Install.bat` again | Service starts again, browser opens |
| T10 | Double-click `Uninstall AgriBill Pro.bat` | UAC → "Service removed successfully" message |
| T11 | Run `sc query AgriBillPro` | "The specified service does not exist" |
| T12 | Check `C:\Temp\AgriBillPro\data\agribill.db` | DB file still there (data preserved after uninstall) |

**T1 is the most critical test.** The old ZIP failed here because UAC never appeared.
If T1 passes (UAC prompt shows up), the elevation fix is working.

---

## Upgrade Procedure (For Existing Customers)

When releasing a new version:

1. Build new ZIP with updated version number in BUILD-ZIP.ps1 (`$VERSION`)
2. Customer extracts new ZIP to a **new** folder (e.g. `C:\AgriBillPro-v1.1.0\`)
3. Customer runs `Uninstall AgriBill Pro.bat` in the OLD folder (removes old service)
4. Customer copies their `data\` folder from old location to new location
5. Customer runs `AgriBill Pro - Install.bat` in the NEW folder

Data is always in `<package-root>\data\agribill.db` — easily portable.

---

## Troubleshooting

### UAC prompt does not appear when running Install.bat
- Windows Group Policy may block `Start-Process -Verb RunAs`
- Workaround: right-click `AgriBill Pro - Install.bat` → Run as administrator

### "Server did not start within 30 seconds" during build
- Another process is using port 5000 — run `netstat -an | findstr :5000`
- Stop it, then re-run the build script

### Service starts but browser shows blank page or error
- Check `%LOCALAPPDATA%\AgriBillPro\logs\error.log`
- Most common cause: .env not found or DB_PATH wrong

### nssm.exe fails with access denied
- NSSM operations require admin rights — confirm T1 UAC prompt was accepted

### Pre-flight test fails: "Cannot find module"
- A required npm package is missing from production deps
- Run `cd backend && npm install --omit=dev` manually and check for errors

---

## Key File Locations (After Install)

| Resource | Location |
|---|---|
| App files | `<package-root>\backend\` |
| Database | `<package-root>\data\agribill.db` |
| Logs | `%LOCALAPPDATA%\AgriBillPro\logs\` |
| Service name | `AgriBillPro` (Windows Services) |
| URL | http://localhost:5000 |
