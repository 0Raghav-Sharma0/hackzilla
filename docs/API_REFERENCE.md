# LearnLoop — API reference (v1)

All authenticated JSON routes live under `/api/v1` and return the envelope:

```json
{ "ok": true, "data": {}, "meta": { "requestId": "…" } }
```

or

```json
{ "ok": false, "error": { "code": "…", "message": "…", "details": {}, "requestId": "…" } }
```

**Auth:** Clerk session cookie (browser) or Bearer token where Clerk supports it for API-only clients.  
**Idempotency:** Mutations that move credits **must** send `Idempotency-Key: <uuid>` header (preferred) or `idempotencyKey` in body where noted — dedupe in `transactions.idempotency_key`.

---

## AUTH / onboarding

| Method | Path | Body (Zod) | Response `data` | Auth |
|--------|------|------------|-------------------|------|
| `POST` | `/api/v1/onboarding` | `{ displayName, languages: string[], learningSubjectSlugs: string[], campusSlug?: string }` | `{ userId, profileId }` | Yes |
| `PATCH` | `/api/v1/onboarding/complete` | `{}` | `{ onboardingCompletedAt }` | Yes |

**Logic:** Creates/updates `Profile`, sets `onboardingCompletedAt`. Does **not** grant tutor role — separate flow.

---

## USERS / profiles

| Method | Path | Body / Query | Response `data` | Auth |
|--------|------|----------------|-----------------|------|
| `GET` | `/api/v1/profile` | — | User + `profile` + `tutorProfile` + wallet balance string | Yes |
| `PATCH` | `/api/v1/profile` | Partial profile fields | Updated profile | Yes |
| `GET` | `/api/v1/tutors/search` | `?subjectSlug=&cursor=&limit=&campusSlug=` | Paginated tutor cards | Yes |
| `GET` | `/api/v1/leaderboard` | `?scope=GLOBAL|CAMPUS&window=WEEKLY|MONTHLY|ALL_TIME&periodKey=&campusSlug=` | Ranked rows | Yes (public read optional later) |

**Tutor search logic:** Filter `TutorProfile.isAcceptingRequests`, join `User` + `Profile`, order by denormalized `averageRating` + recency of sessions (service layer).

---

## HELP REQUESTS

| Method | Path | Body | Response | Auth |
|--------|------|------|------------|------|
| `POST` | `/api/v1/requests` | `createHelpRequestBodySchema` + optional `idempotencyKey` | `{ requestId, status }` | Student |
| `PATCH` | `/api/v1/requests/:id` | `updateHelpRequestBodySchema` | Request DTO | Author only, `DRAFT|OPEN` |
| `POST` | `/api/v1/requests/:id/accept` | `{ tutorUserId, idempotencyKey }` | `{ sessionId, requestId }` | Author; creates `Session`, moves status `MATCHED`, escrow rules in service |
| `POST` | `/api/v1/requests/:id/cancel` | `{ reason?, idempotencyKey }` | `{ status }` | Author or admin |
| `GET` | `/api/v1/requests` | `?status=&subjectSlug=&cursor=` | Cursor page | Yes |
| `GET` | `/api/v1/requests/:id` | — | Request + interests count | Yes if participant or author |

**Validation:** `domain.schemas.ts` — title/body length, kebab-case slugs, urgency enum.

---

## SESSIONS

| Method | Path | Body | Response | Auth |
|--------|------|------|------------|------|
| `POST` | `/api/v1/sessions` | Usually internal after accept; if exposed: `{ helpRequestId, idempotencyKey }` | `{ sessionId }` | Service-guarded |
| `POST` | `/api/v1/sessions/:id/join` | `{}` | `{ status, startedAt? }` | Participant only |
| `POST` | `/api/v1/sessions/:id/end` | `{ idempotencyKey, outcome? }` | `{ status, endedAt }` | Tutor or student; triggers credit settlement job |
| `POST` | `/api/v1/sessions/:id/summary` | `{ async: true }` | `{ jobId }` or summary when sync | Participant; enqueue OpenAI |
| `POST` | `/api/v1/sessions/:id/feedback` | `{ stars: 1-5, comment?, idempotencyKey }` | `{ ratingId }` | Student→tutor per `ratings` unique rule |

**Business logic:** State machine `SCHEDULED → ACTIVE → ENDED`; minimum duration + mutual presence checks anti-farming (service).

---

## CHAT

| Method | Path | Notes | Auth |
|--------|------|-------|------|
| `POST` | `/api/v1/messages` | `sendMessageBodySchema` — persists + returns DTO; socket fanout from service | Participant |
| `GET` | `/api/v1/sessions/:id/messages` | `?cursor=&limit=` keyset pagination | Participant |
| — | Realtime | `message:typing`, `message:send` (optional duplicate path) | Socket JWT |

**Typing:** Prefer socket-only to avoid DB churn; optional `POST /api/v1/sessions/:id/typing` debounced if HTTP-only clients exist.

---

## CREDITS

| Method | Path | Body | Auth |
|--------|------|------|------|
| `POST` | `/api/v1/credits/transfer` | `transferCreditsBodySchema` | Yes; RBAC may restrict to system jobs |
| `GET` | `/api/v1/credits/history` | `?cursor=` | Yes — own wallet only |

**Transfer logic:** Debit sender ledger + credit receiver in **one DB transaction**; mirror amounts; `referenceKind`=`USER_TRANSFER`.

---

## AI

| Method | Path | Body | Response | Auth |
|--------|------|------|------------|------|
| `POST` | `/api/v1/ai/recommend-tutors` | `{ requestId }` | `{ rankedTutorUserIds: string[], explanations: { userId, text }[] }` | Yes |
| `POST` | `/api/v1/ai/categorize` | `{ requestId }` | `{ tags: { tag, confidence }[] }` — persists `AITag` | Author or service |
| `POST` | `/api/v1/ai/roadmap` | `roadmapGenerateBodySchema` | `{ roadmapId }` async | Yes |

**Rate limits:** Per-user AI quota via Redis; cache by `aiInputHash`.

---

## NOTIFICATIONS

| Method | Path | Body | Auth |
|--------|------|------|------|
| `GET` | `/api/v1/notifications` | `?cursor=&unreadOnly=` | Yes |
| `PATCH` | `/api/v1/notifications/:id/read` | `{}` | Yes |
| `POST` | `/api/v1/notifications/read-all` | `{}` | Yes |

Realtime: `notification:new` on user channel after row insert.

---

## Realtime token

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `POST` | `/api/v1/realtime/token` | Yes | `{ token, expiresAt, socketUrl }` |

JWT claims: `sub` = internal `userId`, `rooms` allow-list, `iat`, `exp` ≤ 5m.

---

## Webhooks (non-versioned)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/webhooks/clerk` | Svix signature (`CLERK_WEBHOOK_SECRET`) |

**Logic:** Upsert `User` by `clerkUserId`; create `Profile`/`CreditWallet` defaults on `user.created`.
