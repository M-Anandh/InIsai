# InIsai (இனிசை) — Free-Tier Quotas, Constraints & Cost Control Guide

*Design Goal: ₹0 / $0 Recurring Infrastructure Cost*

---

## 1. Cloud Infrastructure Providers

### 1.1 Vercel Hobby Plan (Frontend & Serverless Edge)
- **Included Quotas:**
  - Bandwidth: 100 GB / month
  - Serverless Function Execution: 100 GB-hours / month
  - Edge Requests: 1,000,000 / month
  - Deployments: 100 / day
- **Cost Protection Rule:**
  - **NEVER** proxy large binary audio files or media streams through Next.js Route Handlers (`/api/stream?...`). Proxying audio rapidly exhausts bandwidth and function invocation limits.
  - Streaming audio is played directly from legal, authorized CDN origins or locally from the user's IndexedDB.

### 1.2 Supabase Free Tier (PostgreSQL & Authentication)
- **Included Quotas:**
  - Database Storage: 500 MB (sufficient for tens of thousands of metadata rows, playlists, and user profiles)
  - Monthly Active Users (MAU): 50,000
  - File Storage: 1 GB (reserved strictly for user avatars, never audio binaries)
  - Egress: 2 GB / month
  - Pausing Policy: Inactive projects automatically pause after 7 days without queries.
- **Cost Protection Rule:**
  - Binary audio is **never** uploaded to Supabase Storage or PostgreSQL bytea columns.
  - Local IndexedDB on the user's client handles all local music storage.
  - InIsai includes an offline/local-first mode so the player remains completely functional even if Supabase is sleeping or disconnected.

### 1.3 Local Browser Storage (IndexedDB)
- **Quota:** Browser-dependent (typically up to 50–80% of free disk space on modern Chromium and Android devices).
- **Cost:** **$0** (uses user's local device storage).

---

## 2. Upgrade Triggers & Thresholds
If the application expands beyond personal/non-commercial use:
1. **Commercial Usage:** Vercel Pro ($20/seat/month) is required for commercial products.
2. **Database Scale:** If active users exceed 50k MAU or database size approaches 500 MB, upgrade to Supabase Pro ($25/month).
3. **Custom Domain:** Optional $10–$15/year purchase from a registrar.

