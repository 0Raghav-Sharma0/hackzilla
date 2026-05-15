# Demo Day checklist (LearnLoop)

## One day before

- [ ] `DATABASE_URL` points at a **disposable** Postgres (preview DB is fine).
- [ ] Run migrations: `npm run db:migrate` or `npm run db:push` (match your workflow).
- [ ] **Full demo seed:** `npm run db:seed:demo` (loads `DEMO_ECOSYSTEM_SEED` via npm script).
- [ ] Create a **rehearsal Clerk user** that maps to a real `User` row (sign in once locally so the account exists).
- [ ] Production build smoke: `npm run build` && `npm run start`.
- [ ] Set `NEXT_PUBLIC_LEARNLOOP_DEMO=1` in the demo deploy for pulse + softer fallbacks.

## One hour before

- [ ] Open an **incognito** window + normal window (second tab for “tutor interest” if you narrate that).
- [ ] Preload routes: `/`, `/dashboard/requests`, one deep request URL bookmarked.
- [ ] Disable laptop sleep / aggressive battery saver (animations + timers).
- [ ] Close bandwidth-heavy apps; plug in power + ethernet if available.

## Five minutes before

- [ ] Restart dev server or redeploy preview (fresh connections).
- [ ] Confirm **bell** notifications render.
- [ ] Scroll landing once to warm Framer layouts (minor, but avoids first-hit jank).

## If judges ask “is this real?”

- Feed + interests + sessions after seed: **yes, relational data**.
- AI tags / reasoning copy / ticker on marketing: **presentation + heuristics** — say so confidently in one clause, then pivot to what you’d swap in (OpenAI + SSE + jobs).

## Emergency backup

- Video screen recording of the golden path stored offline (30–45s) — only if live demo is impossible.
