# LearnLoop — production deploy & demo hardening

## Environment validation

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Prisma / server actions | Use **pooled** URL on serverless (e.g. PgBouncer). |
| `DIRECT_URL` | `prisma migrate` | Non-pooled; CI and local migrations only if you use split URLs. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth UI | Must match Clerk instance. |
| `CLERK_SECRET_KEY` | Server | Never expose to client. |
| `NEXT_PUBLIC_LEARNLOOP_DEMO` | Softer fallbacks + pulse | `1` on **demo/staging** only; omit or `0` in prod if you want strict errors. |

## Vercel / hosting

- [ ] **Separate DB** for Preview vs Production (avoid seeding prod).
- [ ] Run migrations against the target DB before first deploy.
- [ ] For hackathon demo: run `npm run db:seed:demo` on the **preview** database once.
- [ ] Enable **Analytics** / **Speed Insights** if available (optional).
- [ ] Set **Node 20+** in project settings to match `engines`.

## Prisma & connections

- [ ] Prefer connection pooling compatible with serverless (Neon/Supabase pooler).
- [ ] Avoid long-lived transactions in server actions during demo (keep mutations short).
- [ ] `prisma generate` runs on `postinstall` — ensure CI install doesn’t skip.

## Caching & headers (optional next step)

- [ ] Static marketing routes can use default `revalidate` where applicable.
- [ ] Do **not** aggressively cache authenticated dashboard HTML at the edge without session awareness.

## Images

- [ ] External avatars (Dicebear) allowed via `next.config.ts` `images.remotePatterns`.
- [ ] Prefer `next/image` for remote avatars when you add explicit `<Image>` usage (optional polish).

## Demo-safe production config

- **Staging:** `NEXT_PUBLIC_LEARNLOOP_DEMO=1`, full demo seed.
- **Production:** demo flag off unless you want soft landing for outages; never run destructive wipe seed against prod.
