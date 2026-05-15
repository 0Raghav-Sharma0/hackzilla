# Last 6 hours — priority plan

## CRITICAL (do first — max judge impact / min risk)

1. **Production build smoke** — `npm run build && npm run start`; fix any red errors.
2. **Preview DB + `npm run db:seed:demo`** — feed, leaderboard, notifications must look alive.
3. **One full scripted walk** — [`docs/DEMO_DAY_SCRIPT.md`](./DEMO_DAY_SCRIPT.md) without improvisation drift.
4. **Clerk rehearsal account** — signed in once; bookmark `/dashboard/requests`.

## HIGH IMPACT (polish per hour)

5. **Mobile pass (320–390px)** — feed, session room, command palette, podium (already tightened).
6. **Quiet console** — no hydration warnings on first dashboard load.
7. **Battery / network** — hotspot rehearsal + DND.

## OPTIONAL (only if time remains)

8. Lighthouse run on `/` and `/dashboard` (note LCP, CLS; fix only trivial wins).
9. Swap one marketing testimonial for a **real** pilot quote if you have permission.
10. Record a **45s backup video** of the golden path.

## DO NOT TOUCH

- Prisma schema / migrations unless blocking deploy.
- New backend domains (payments, moderation pipelines, real sockets).
- Large refactors of server actions or auth.
- “One more feature” — scope is closed; **polish only**.

### If you only have 1 hour

Build + seed + one dry run. Everything else is optional.
