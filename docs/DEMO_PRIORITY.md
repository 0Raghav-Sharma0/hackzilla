# LearnLoop — Demo Day build priority

Use this as a ruthless stack rank: **visible polish and realtime *feeling*** beat invisible correctness for the judging window.

## Build order (first → last)

1. **Live doubts feed + create flow** — `RequestsFeedClient`, `CreateRequestModal`, optimistic insert + `BroadcastChannel` refetch. Judges see motion, tags, and “live” immediately.
2. **Request detail + tutor matching panel** — cards, match score, interest CTA. Reads as “AI-native product” without a model fleet.
3. **Session room** — chat, timer, recap stream, whiteboard placeholder. Proves end-to-end collaboration.
4. **Notifications bell** — unread badge, deep links. Makes the app feel alive between screens.
5. **Leaderboard podium** — social proof in one glance.
6. **Profile dashboard** — XP ring, achievements, AI “strengths” strip.
7. **⌘K command menu** — keyboard-native navigation; smooth demo if you narrate while driving.
8. **AI insights page** — streaming text + shimmer + roadmap (already mock-friendly).
9. **Gamification flourishes** — confetti on milestones, streak fire on leaderboard cards (where already wired).

## Maximum wow-factor per hour

| Item | Why |
| --- | --- |
| Feed + modal + tab-sync refetch | Motion + “multiplayer” without WebSocket infra |
| Tutor cards + match score bar | Instant “this is not a generic CRUD app” |
| Session room + streaming recap | Shows depth in one screen |
| Notification dropdown | Subtle constant proof of activity |

## Mock vs real backend

| Mock / client-only (OK for hackathon) | Prefer real backend |
| --- | --- |
| AI tag text, streaming recap copy, roadmap bullets | Creating `HelpRequest`, interests, sessions, messages (already actions) |
| `BroadcastChannel` “realtime” (same browser) | Cross-user WebSocket fanout for judges on multiple devices |
| Demo tutor rows + bot interest seed | Auth-linked tutor identities in production |
| Leaderboard fallback rows when DB empty | `leaderboard_stats` populated from real events |

## What judges notice most

1. **First 10 seconds**: feed motion, “Live” badge, create modal polish.
2. **Next 30 seconds**: tutor cards + match narrative.
3. **Closer**: enter a session, send a message, end session, see recap stream.

---

## MUST BUILD (minimum credible startup demo)

- Routed **requests feed**, **detail**, **session room**, **sessions list**, **leaderboard**, **profile**, **AI page**.
- **Create request** with visible tags + success path + feed update.
- **Tutor matching UI** (even with seeded / demo data).
- **One** believable realtime pattern (polling + tab sync is enough if you narrate Socket.io as “next step”).

## NICE TO HAVE (if time remains)

- True Socket.io rooms mirroring server actions.
- Typing indicators backed by server (currently cosmetic hints are fine).
- Infinite scroll polish (cursor already in API; button is acceptable).
- Onboarding carousel / “live globe” visuals.

## SKIP FOR HACKATHON (low judge ROI)

- Full whiteboard product.
- Payment / credits settlement logic beyond a counter.
- Perfect accessibility audit of every animation.
- Admin analytics for non-demo users.

---

## Judge psychology (Demo Day mode)

- **Sophistication signal:** dense feed + visible AI *reasoning* + motion that respects reduced-motion users when possible.
- **Easy to fake (and worth it):** marketing ticker, heartbeat refetch, radar charts, streaming copy, confetti on match.
- **Judges assume is hard:** realtime *feeling* across screens — you approximate with polling + `BroadcastChannel` + seed data; say “socket fanout is next” in one breath.
- **Skip entirely:** arguing schema normalization during the pitch; long loading spinners with no skeleton.

