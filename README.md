# BBMS Ghana — Cloud-Based Blood Bank Management System

A cloud-based, multi-facility Blood Bank Management System for Ghana healthcare facilities.

## Live Preview

The application runs on Next.js 16 with a SQLite database (production-ready for MySQL/PostgreSQL via Prisma).

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| System Administrator | `admin@bbms.gh` | `Admin@2026` |
| Blood Bank Officer | `bbo@kob.bbms.gh` | `Bbo@2026` |
| Laboratory Technician | `lab@kob.bbms.gh` | `Lab@2026` |
| Hospital Administrator | `hospadmin@kob.bbms.gh` | `Hosp@2026` |
| Nurse / Doctor | `nurse@kob.bbms.gh` | `Nurse@2026` |

## Features

### 5 Role-Based Dashboards
- **System Administrator** — Network-wide oversight, facility management, user accounts
- **Blood Bank Officer** — Inventory, storage, alerts, internal requests, network broadcast workflow, donors, reports
- **Laboratory Technician** — Blood unit registration, storage, donors, alerts
- **Hospital Administrator** — Staff management, reports, network requests, donors
- **Nurse / Doctor** — Submit and track internal blood requests

### Core Modules
- **Blood Inventory** — Register, filter, assign storage, discard units with auto-expiry tracking
- **Storage Units** — Refrigerated, Frozen, and Room Temperature storage management
- **Expiry Alerts** — Auto-flag units expiring within 5 days, low-stock alerts per blood group
- **Internal Blood Requests** — Nurses submit, BBOs process (approve/reject/issue)
- **Network Broadcast Workflow** — The flagship feature: broadcast blood requests to all facilities, receive responses, select & reserve units, confirm receipt
- **Donor Registry** — Consent-compliant donor management (Ghana Data Protection Act 2012)
- **Audit Logs** — Tamper-resistant, write-once audit trail (12-month retention)
- **Reports & Analytics** — 7 chart visualizations, export to PDF/DOCX/CSV, print

### Security
- bcrypt password hashing
- Role-based access control (RBAC) enforced at API level
- HTTPS encryption
- Facility-scoped data access
- Comprehensive audit logging
- Ghana Data Protection Act 2012 (Act 843) compliant

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York) with dark mode support
- **Database**: Prisma ORM with SQLite (schema ready for MySQL/PostgreSQL)
- **Authentication**: bcrypt + HTTP-only session cookies
- **Charts**: Recharts (on-screen) + ReportLab (PDF export)
- **Document Export**: ReportLab (PDF) + python-docx (DOCX)

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Python 3.10+ (for PDF/DOCX export — optional, CSV export works without Python)
- `reportlab` and `python-docx` Python packages (for PDF/DOCX export)

### Installation

```bash
# Install dependencies
npm install

# Set up the database
cp .env.example .env  # Configure DATABASE_URL
npx prisma db push

# Seed with demo data
npm run seed

# Start the dev server
npm run dev
```

Open `http://localhost:3000` and log in with any demo account above.

### Python Dependencies (for report exports)

```bash
pip install reportlab python-docx
```

## Deployment

### Vercel (Recommended for Next.js)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your `bbms-ghana` repository
5. Vercel auto-detects Next.js — no config needed
6. Add Environment Variables:
   - `DATABASE_URL` = `file:./db/custom.db` (for SQLite) or your PostgreSQL/MySQL URL
7. Click "Deploy"
8. Your app goes live at `https://bbms-ghana.vercel.app` (or your custom name)

**Note on PDF/DOCX export**: Vercel's serverless functions don't include Python, so PDF/DOCX exports won't work on Vercel. CSV export works fine. For full PDF/DOCX support, deploy on Railway, Render, or a VPS.

### Railway (Supports Python for PDF/DOCX export)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `bbms-ghana`
4. Add Environment Variables:
   - `DATABASE_URL` = `file:./db/custom.db`
5. Railway auto-detects and builds. Add a Python runtime or use a Dockerfile for PDF/DOCX support.

### Self-Hosted (VPS / Docker)

```bash
git clone https://github.com/moseskumador146-coder/bbms-ghana.git
cd bbms-ghana
cp .env.example .env
npm install
npx prisma db push
npm run seed
pip install reportlab python-docx
npm run dev   # or npm run build && npm start for production
```

## Project Structure

```
prisma/
  schema.prisma              # 9-entity database schema
scripts/
  seed.ts                    # Database seeder with Ghana healthcare data
  generate_report_pdf.py     # Professional PDF report generator
  generate_report_docx.py    # DOCX report generator
src/
  app/
    api/                     # RESTful API routes (auth, dashboard, blood-units, etc.)
    layout.tsx               # Root layout with ThemeProvider
    page.tsx                 # Single-page app with hash-based routing
  components/
    login-page.tsx           # Split-screen login with demo accounts
    app-shell.tsx            # Sidebar + header + footer layout
    theme-toggle.tsx         # Dark/Light/System theme switcher
    pages/                   # 11 page components (dashboard, blood-units, etc.)
  lib/
    auth.ts                  # Server-side auth (bcrypt, sessions)
    auth-constants.ts        # Shared constants (client-safe)
    audit.ts                 # Audit logging
    ui.ts                    # UI utilities (date format, colors)
```

## Database Schema

9 primary entities:
1. **Facility** — Hospitals/clinics with type, location, status
2. **User** — Staff accounts with 5 roles
3. **Donor** — Donor records with consent tracking
4. **StorageUnit** — Refrigeration equipment
5. **BloodUnit** — Central inventory with lifecycle (Available→Reserved→Issued/Expired/Discarded)
6. **InternalRequest** — Ward-level blood requests
7. **NetworkRequest** — Cross-facility broadcast requests
8. **NetworkResponse** — Responses from facilities with matching stock
9. **AuditLog** — Tamper-resistant audit trail

## License

This project is licensed under the MIT License.

## Team

- Nkrumah Paa Kwadwo Boadi (4211230195)
- Tettey Kingsley (4211231275)
- Amoakwa Bamfo Caleb (4211231179)

**Date**: June 2026
