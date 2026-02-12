## Objects

A beaut page for anyone who wants to showcase their side of the inventory.

A minimal, typographic timeline of owned objects.

### Tech Stack

- **Next.js 15** — App Router, Server Components, Server Actions
- **Tailwind CSS v4** + **shadcn/ui** — Styling & dashboard components
- **Supabase** — Auth, PostgreSQL database, file storage
- **Drizzle ORM** — Type-safe database queries & migrations
- **date-fns** — Relative time formatting

### Getting Started

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

3. Create a Supabase project at [supabase.com](https://supabase.com) and:
   - Copy your project URL and anon key into `.env.local`
   - Copy the Postgres connection string into `DATABASE_URL`
  - Run all SQL migrations in `supabase/migrations/` via the Supabase SQL editor (or `supabase db reset` locally)
   - Create a storage bucket called `object-images` (set to public)

4. Run the dev server:

```bash
npm run dev
```

5. Open [localhost:3000](http://localhost:3000)

### Local Development (recommended)

Uses a local Supabase stack (Postgres, Auth, Storage) via Docker so you never touch the production database.

**One-time setup:**

1. Install prerequisites:

```bash
brew install supabase/tap/supabase docker colima
```

2. Add to your `~/.zshrc` (or shell of choice):

```bash
export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
```

3. Create `.env.development.local` with local Supabase keys (run `supabase start` once to get them):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<publishable key from supabase start>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Next.js loads `.env.development.local` during `next dev`, so your production `.env.local` stays untouched.

**Day-to-day:**

Start everything (Colima, Supabase, Next.js) with a single command:

```bash
npm run dev:full
```

Press `Ctrl+C` to stop all services.

Or manage them individually:

| Command | What it does |
|---|---|
| `npm run dev:full` | Start Colima + Supabase + Next.js, stop all on Ctrl+C |
| `npm run dev` | Start only Next.js (assumes Supabase is already running) |
| `supabase start` | Start local Supabase |
| `supabase stop` | Stop local Supabase |
| `supabase db reset` | Re-apply all migrations from scratch |

**Local URLs:**

- **App**: [http://localhost:3000](http://localhost:3000)
- **Supabase Studio**: [http://127.0.0.1:54323](http://127.0.0.1:54323)
- **Mailpit** (email testing): [http://127.0.0.1:54324](http://127.0.0.1:54324)

### Project Structure

```
src/
  app/
    (auth)/          — Login & signup pages
    (dashboard)/     — Protected dashboard (object CRUD, settings)
    u/[username]/    — Public inventory timeline
  actions/           — Server actions (auth, objects, images, profile)
  components/        — UI components
  lib/
    db/              — Drizzle schema & database client
    supabase/        — Supabase client helpers (browser, server, middleware)
    utils/           — Relative time, slugify helpers
```

### Deployment

Deploy to [Vercel](https://vercel.com):

1. Connect your GitHub repo
2. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `DATABASE_URL`)
3. Deploy

### Verifying DB changes before production

DB changes are validated in two layers:

1. **Clean replay of migrations**: `supabase db reset` re-applies every migration on a fresh local database.
2. **Schema safety checks**: `npm run db:verify` validates required tables, indexes, and RLS/policies.

These checks also run automatically in GitHub Actions (`Verify DB Migrations`) on pull requests that touch DB files.

**Run locally before merging a DB change:**

```bash
supabase start -x logflare,vector,imgproxy
supabase db reset
npm run db:verify
```

**Production fallback mechanism:**

- Use Supabase managed backups / PITR for point-in-time restore.
- Apply migrations to a staging environment first, then production.
- Keep migrations forward-only and additive where possible.
