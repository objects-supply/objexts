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
   - Run the migration in `supabase/migrations/0000_create_tables.sql` via the Supabase SQL editor
   - Create a storage bucket called `object-images` (set to public)

4. Run the dev server:

```bash
npm run dev
```

5. Open [localhost:3000](http://localhost:3000)

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
