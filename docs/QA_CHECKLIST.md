# LearnLoop — QA bug-hunt checklist

Run through once in **production build** (`npm run build && npm run start`) before Demo Day.

## Auth

- [ ] Sign in / sign out redirects cleanly; no flash of wrong layout.
- [ ] `UserButton` visible on narrow header; no overlap with notifications bell.
- [ ] After sign-in, `/dashboard` loads without full-page error.

## Dashboard shell

- [ ] Mobile: menu overlay opens, backdrop tap closes, sidebar scrolls if tall.
- [ ] `⌘K` / Ctrl+K opens command palette; Escape closes; list scrolls on short viewports.
- [ ] Main content scrolls independently; **no horizontal scroll** on 320px width.
- [ ] `(app)/error.tsx` “Try again” resets a thrown client error (simulate via devtools if needed).

## Help requests

- [ ] Feed: search + subject filter; clear restores results (with seed: many OPEN rows).
- [ ] `?compose=1` opens modal; submit creates row + toast; feed updates after refetch.
- [ ] Request detail: back link keyboard-focus ring visible.
- [ ] Tutor panel: reduced-motion user gets no hover lift on cards (check OS setting).

## Sessions

- [ ] List empty state CTA links work.
- [ ] Session room: send message, Enter to send, timer ticks when ACTIVE.
- [ ] Invalid `sessionId`: designed empty state, not raw error.
- [ ] End session: recap appears; no duplicate send on double-click (mutation pending state).

## Notifications

- [ ] Bell opens; loading shows skeletons; empty state copy renders when inbox zero.
- [ ] Error state: “Tap to retry” refetches.
- [ ] `sessionId` payload shows “Open session” link.

## Leaderboard & profile

- [ ] Leaderboard podium doesn’t overflow on small phones (check 320px).
- [ ] Profile: XP ring animates; achievements list scrolls if long.

## AI / marketing

- [ ] `/dashboard/ai` streaming text completes; no layout jump when shimmer hides.
- [ ] Landing: ticker rotates; no console errors from Framer.

## Realtime / demo

- [ ] With `NEXT_PUBLIC_LEARNLOOP_DEMO=1`, heartbeat doesn’t cause visible flicker (only subtle refetch).
- [ ] Two tabs: create request in one; other tab feed updates (BroadcastChannel).

## Hydration & loading

- [ ] No React hydration mismatch warnings on dashboard first paint.
- [ ] No duplicate `id` in lists (especially feed after load more).

## Deployment

- [ ] `DATABASE_URL` valid; `npm run db:seed:demo` on preview DB if demo pitch.
- [ ] Env: Clerk keys set for preview; `NEXT_PUBLIC_LEARNLOOP_DEMO` intentional per environment.

### Likely failure points

| Area | Symptom | Quick fix |
| --- | --- | --- |
| Prisma / DB | Feed empty after seed | Re-run `npm run db:seed:demo`; check `periodKey` month matches server date |
| Clerk | 401 on server actions | Session expired → re sign-in |
| Images | Broken avatars | Confirm `next.config` `images.remotePatterns` includes Dicebear host |
| Command menu | Cut off on mobile | Already `max-h-[min(88dvh,640px)]` — verify on device |
