# Webbarracks — Project Management, Time Tracking & Screenshot Monitoring

A production-ready, multi-tenant engineering platform engineered with clean architectural boundaries, strict RBAC permissions, live multi-user telemetry, and privacy-compliant monitoring.

---

## Architecture & Tech Stack

- **Monorepo (npm workspaces)**:
  - `/packages/shared`: Centralized RBAC permission matrix, Zod validation schemas, and domain interfaces.
  - `/supabase/migrations`: Complete PostgreSQL migrations, Row Level Security (RLS) on every table, helper functions, analytical reporting views, and seed data.
  - `/apps/api`: High-performance Hono REST API + WebSocket server running on Node with `@hono/node-server` and `ws`.
  - `/apps/web`: High-performance Vanilla JavaScript SPA (Vite, ES modules, hand-written History API router, pub/sub reactive store, monochrome CSS design system with CSS tokens, zero CSS framework).
  - `/docs`: Architecture specifications, deployment manuals, and security guidelines.

---

## Key Features

1. **Dual-Layer RBAC (Workspace + Project Roles)**:
   - Workspace Roles: `Owner`, `Admin`, `Manager`, `Member`, `Client`.
   - Project Roles: `Project Owner`, `Project Manager`, `Contributor`, `Reviewer`, `Viewer`, `Client`.
   - Security rule: `Effective = max(workspace grants, project grants)`.
   - Strict Client restrictions: Clients never have access to screenshots, internal comments, or hourly bill/cost rates.

2. **Task & Project Management**:
   - Interactive Kanban Board with HTML5 drag-and-drop between statuses (`backlog`, `todo`, `in_progress`, `in_review`, `done`).
   - Project health tracking (On track / At risk / Over budget) based on budget burn vs. logged hours.
   - Task detail drawers with collaborative comments, subtasks, and time breakdown.

3. **Time Tracking Engine**:
   - Multi-user support on the same task.
   - Enforced constraint: exactly 1 active timer per user globally.
   - Rates snapshotting upon entry creation for financial immutability.
   - Server-side calculation of elapsed duration.
   - Sticky topbar timer widget that persists across page navigation and reloads.
   - Real-time presence table over WebSockets showing active trackers.

4. **Web Screen Capture & Monitoring**:
   - Web screen capture via `navigator.mediaDevices.getDisplayMedia` and canvas rendering.
   - Periodic randomized capture with mouse and keyboard activity level percentages.
   - Screenshot gallery with lightbox previews and deletion grace windows.
   - Persistent red recording badge in topbar.

5. **Timesheets & Approvals**:
   - Weekly grid view (Monday through Sunday) with daily breakdowns.
   - Formal submission, manager approval, and rejection workflow.
   - Approved timesheet period locking.

6. **Advanced Analytics & Reporting**:
   - Summary, Project Profitability (Margin %, Revenue vs Cost), and Team Utilization reports.
   - Vanilla SVG bar charts and donut charts without external libraries.
   - Direct CSV export.

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run test suite
npm test

# 3. Start development servers
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3001](http://localhost:3001)
- **API Health Check**: [http://localhost:3001/health](http://localhost:3001/health)
- **WebSocket Server**: `ws://localhost:3001/ws`

Use the **Role Persona Switcher** dropdown in the top-right header to instantly test and verify permissions as Owner, Admin, Manager, Member, or Client.

