# Webbarracks Deployment & Operations Guide

Production-ready Project Management, Multi-User Time Tracking, and Screenshot Monitoring Platform.

---

## 1. Local Development Setup (Quickstart)

The repository is built as an npm monorepo with workspace configuration.

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Automated Tests
Verify all RBAC permission matrix rules, active timer concurrency, rate snapshots, and client restrictions:
```bash
npm test
```

### Step 3: Run API & Frontend Locally
Run both simultaneously:
```bash
npm run dev
```

Or run individually:
- **API Server & WebSocket**:
  ```bash
  npm run dev:api
  ```
  Runs at: `http://localhost:3001` (Health check: `http://localhost:3001/health`, WebSocket: `ws://localhost:3001/ws`)

- **Vite Vanilla JS Web App**:
  ```bash
  npm run dev:web
  ```
  Runs at: `http://localhost:5173`

---

## 2. Supabase Setup (Database, Auth, Storage)

### Step 1: Run SQL Migrations
Execute the SQL scripts in `supabase/migrations/` in sequential order via Supabase CLI or the Supabase SQL Editor:
1. `001_initial_schema.sql` (Creates profiles, workspaces, members, projects, tasks, time entries, screenshots, audit logs)
2. `002_rls_and_functions.sql` (Creates helper SQL functions, enables RLS on all tables, establishes storage bucket policies)
3. `003_views_and_indexes.sql` (Adds analytical reporting views and unique index for 1 active timer per user)
4. `seed.sql` (Populates demo users across all roles, projects, tasks, and historical time entries)

### Step 2: Configure Storage Bucket
The migration automatically configures the private `screenshots` bucket. Verify in the Supabase Dashboard:
- Bucket name: `screenshots`
- Public: `false` (Private)
- Access governed by the RLS storage policies in `002_rls_and_functions.sql`.

---

## 3. Render Deployment (Backend API & WebSockets)

Render is recommended for `@webbarracks/api` because Render natively supports long-running Node processes, persistent WebSockets, and background cron schedules.

### Step 1: Deploy Web Service
1. Connect your GitHub repository to Render.
2. Create a new **Web Service**.
3. Set the following build and start commands:
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/health`

### Step 2: Configure Environment Variables
Set the following environment variables in the Render Dashboard:
- `PORT`: `3001`
- `NODE_ENV`: `production`
- `ALLOWED_ORIGIN`: `https://your-app.vercel.app`
- `SUPABASE_URL`: `https://your-project.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: `your-supabase-service-role-key`
- `SUPABASE_JWT_SECRET`: `your-supabase-jwt-secret`
- `RESEND_API_KEY`: `your-resend-api-key`

---

## 4. Vercel Deployment (Frontend Vanilla JS SPA)

Vercel hosts the static ES module assets with high-speed edge distribution.

### Step 1: Configure Project
1. Import your GitHub repository into Vercel.
2. Select **Root Directory**: `apps/web`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.

### Step 2: Environment Variables
- `VITE_API_URL`: `https://your-api.onrender.com/api`
- `VITE_WS_URL`: `wss://your-api.onrender.com/ws`

### Step 3: SPA Rewrites
`apps/web/vercel.json` handles client-side History API routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 5. Security & Multi-Tenancy Architecture Checklist

- [x] **Double Security Layer**: Security is enforced first at the Hono API middleware level (`requirePermission`), and second at the PostgreSQL RLS policy level.
- [x] **Client Role Restriction**: The `client` role is strictly stripped of screenshot access, internal comments, bill/cost rates, and team settings at both the API and database levels.
- [x] **Rate Snapshots**: Hourly bill and cost rates snapshot onto each time entry upon creation so historical financials remain immutable.
- [x] **Concurrence & Active Timers**: Partial unique constraint (`idx_unique_active_timer_per_user`) strictly prevents more than one running timer per user globally.
- [x] **Tamper-Evident Edits**: Any manual time entry modification requires an explicit `edit_reason` recorded in `time_entry_edits` and `audit_logs`.
