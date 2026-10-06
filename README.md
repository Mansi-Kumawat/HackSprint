# HackSprint

A shared **hackathon command center** for a 3-person AI startup team. It tracks the full journey
**idea → planning → development → testing → pitch → submission** for a hackathon ending
**30 October 2026** (sprint starts 3 Oct 2026).

From idea to submission — one task at a time.

## Features

- **No login, shared workspaces** — the app opens straight into a dashboard. A workspace lives at a
  hard-to-guess URL (`/w/<16-char slug>`). Share the link or ID; anyone with it can edit. The last
  workspace is remembered in `localStorage`.
- **Dashboard** — 5-second status: countdown to the deadline, animated overall progress, today's
  focus (overdue / due today / High+Critical), current phase, up-next, alert banners, and a
  Phase 0 → 15 roadmap strip.
- **Tasks** — full CRUD with optimistic updates, animated completion checkbox, complete/reopen,
  edit, delete (confirmed), duplicate, move-to-phase. Stackable filters (All / Active / Completed,
  Overdue, Critical, High, Due Today, phase, member) and keyword search across title, description,
  tags, phase, and member. Smart sorting: overdue → due today → upcoming → completed last.
- **Phases** — 16 collapsible phase cards (Phase 0–15, Oct 3 → Oct 30) with auto-calculated status
  (Not Started / In Progress / Completed / At Risk). Phase 8 earns **MVP READY**, Phase 15
  **SUBMITTED**.
- **Calendar** — month view with color-coded task deadlines, phase end dates, overdue markers, and
  the Oct 30 submission flag. Click any task to edit.
- **Analytics** — completion donut, completion by phase (bar), completion by member (stacked bar),
  daily activity (area), team workload cards, streak + GitHub-style heatmap (0 / 1–2 / 3–5 / 6+).
- **Streak** — consecutive days with ≥ 1 completion, derived from the `activity` log.
- **Theme** — light/dark with a smooth transition, persisted in `localStorage`.
- **Keyboard shortcuts** — `N` new task · `/` global search · `T` today's tasks · `D` dashboard ·
  `P` phases · `Esc` close modal.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**, shadcn-style UI primitives, Recharts,
  next-themes, sonner.
- **PostgreSQL** via Drizzle ORM. All database access happens in **server-side route handlers /
  server components** — the connection string (service credential) never reaches the browser.
  Works with Supabase's Postgres directly.

## Architecture

```
src/
  db/                 Drizzle client + schema (workspaces, team_members, phases, tasks, activity)
  lib/                seed data, seeding, validation (zod), compute (stats/streak/countdown)
  app/
    page.tsx          boot screen: resumes last workspace or creates + seeds a new one
    w/[workspaceId]/  dashboard, tasks, phases, calendar, analytics (shared client provider)
    api/              POST /api/workspaces · GET /api/w/:id · tasks CRUD · member rename
  components/         app shell (sidebar/topbar/bottom-nav), task modal, search palette, ui/
supabase/
  migrations/0001_init.sql   schema for Supabase / plain Postgres
  seed.sql                   generated demo workspace seed
scripts/generate-seed-sql.ts regenerates supabase/seed.sql from the seed data
```

Data model: `workspaces(id, name, hackathon_name, deadline, theme_default, created_at)`,
`team_members(id, workspace_id, name, avatar)`, `phases(id, workspace_id, phase_number, name,
description, start_date, end_date)`, `tasks(id, workspace_id, phase_id, title, description,
assigned_to, priority, due_date, completed, completed_at, tags, created_at, updated_at)`,
`activity(id, workspace_id, task_id, action, created_at)` — with indexes on `workspace_id` and
workspace scoping enforced in every query.

## Running locally

```bash
cp .env.example .env        # set DATABASE_URL
npm install
npx drizzle-kit push        # create tables
npm run dev
```

Open http://localhost:3000 — a workspace is created and seeded (16 phases, ~220 tasks) on first
visit.

## Environment variables

| Variable       | Where      | Description                                                        |
| -------------- | ---------- | ------------------------------------------------------------------ |
| `DATABASE_URL` | server-only| Postgres connection string. On Supabase use the **service** (session pooler) connection string from Project Settings → Database. Never prefix it with `NEXT_PUBLIC_`. |

## Deploy: Supabase + Vercel

1. **Supabase** — create a project, open the **SQL Editor**, run
   `supabase/migrations/0001_init.sql`, then optionally `supabase/seed.sql` (it creates a demo
   workspace and prints its URL in the file header).
2. Copy the connection string from **Project Settings → Database → Connection string (Session
   pooler)** — it looks like
   `postgresql://postgres.<ref>:<password>@aws-0-…pooler.supabase.com:5432/postgres`.
3. **Vercel** — import the repo, add env var `DATABASE_URL` with that string, deploy.
4. Open the app → a fresh seeded workspace is created automatically; share the link with your team.

To regenerate the SQL seed after changing seed data:

```bash
npx tsx scripts/generate-seed-sql.ts
```

## Notes

- Progress = completed ÷ total tasks × 100. Completing a task instantly updates task, phase,
  analytics, streak, and countdown stats (optimistic UI + activity log sync).
- Countdown switches to hours under 48h, shows "Submission Day" on Oct 30, and "Hackathon
  Completed" after — never negative.
- Default task due dates are the phase end dates; default priorities follow the sprint rules
  (Critical = submission/MVP/deployment, High = core build/demo/pitch, Low = polish).
