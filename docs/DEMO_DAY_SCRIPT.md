# LearnLoop — Demo Day script (≈3 minutes)

Use this as choreography, not a teleprompter. Speak in complete sentences; let the product breathe between beats.

## 0:00 — Cold open (landing, 20s)

**Screen:** Marketing home (`/`).

**Say:** “Peer learning dies in the gap between ‘I’m stuck’ and ‘someone who can actually help.’ LearnLoop is the live loop: doubts, matching, sessions, credits — with AI as amplification, not a replacement for humans.”

**Do:** Scroll slightly so the **live activity ticker** and **platform pulse** card enter view. Pause on the animated stats row.

**Do not:** Apologize for mock data; frame it as “deterministic demo layer we can swap for production models.”

---

## 0:25 — Enter the product (15s)

**Screen:** Sign in → `/dashboard/requests`.

**Say:** “This is the live doubt feed — what students feel first.”

**Do:** Point at **interest counters** animating, **AI tags** on cards, **Live** pill.

**Wow moment:** If you seeded the ecosystem, say “Every card here is real Postgres — we’re not faking the feed.”

---

## 0:45 — Depth on one doubt (45s)

**Screen:** Open any rich card → request detail.

**Say:** “Under the hood we track interest, notifications, and session handoff. On stage I’m showing the AI *presentation* layer: reasoning trace + compatibility radar — the model can be simple if the UX is honest.”

**Do:** Scroll to **AI reasoning chain** + **radar**, then demo tutor cards.

**Do:** If you’re the author, tap **Loop Bot interested** → **Match** → session room.

**Wow moment:** **Confetti** on match (subtle) → immediate route to session.

---

## 1:30 — Session room (40s)

**Screen:** `/dashboard/sessions/[id]`.

**Say:** “This is where collaboration earns out — chat, timer, recap. Whiteboard is intentionally a placeholder; the story is orchestration + trust + credits.”

**Do:** Send one chat line; start/end if your flow supports it quickly; show recap streaming if you have time.

---

## 2:10 — Scale + social proof (35s)

**Screens:** `/dashboard/leaderboard` → `/dashboard/notifications` (bell) → `/dashboard/ai`.

**Say:** “Leaderboard is the campus energy layer. Notifications make the app feel alive between sessions. AI page is where we sell the *longitudinal* story — momentum, roadmap, match narrative.”

---

## 2:45 — Close (15s)

**Say:** “We’re not pitching sci-fi tutoring. We’re pitching **infrastructure for a learning marketplace** that already behaves like a serious consumer product — and a team that can ship it.”

**End frame:** Land on feed or AI page with motion visible.

---

## If something breaks (recovery)

| Failure | Recovery line |
| --- | --- |
| Clerk / auth | “Auth is externalized on purpose — here’s the same UI in a logged-in rehearsal account.” |
| DB / API | “Demo mode degrades gracefully — watch the retry strip; nothing bricks the keynote path.” |
| Empty feed | “This build expects `npm run db:seed:demo` — thirty seconds to a populated campus.” |

Stay calm; never more than one sentence of technical excuse.

---

## Timing cheat sheet

| Block | Time |
| --- | --- |
| Landing | 0:00–0:25 |
| Feed | 0:25–0:45 |
| Detail + match | 0:45–1:30 |
| Session | 1:30–2:10 |
| Leaderboard + AI | 2:10–2:45 |
| Close | 2:45–3:00 |
