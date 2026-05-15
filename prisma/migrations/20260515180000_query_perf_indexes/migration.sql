-- Help-request feed: OPEN + global `ORDER BY createdAt DESC` (no subject in WHERE).
CREATE INDEX "help_requests_status_createdAt_idx" ON "help_requests"("status", "createdAt" DESC);

-- My sessions list: participant filter + `ORDER BY updatedAt DESC` (any status).
CREATE INDEX "sessions_studentId_updatedAt_idx" ON "sessions"("studentId", "updatedAt" DESC);
CREATE INDEX "sessions_tutorId_updatedAt_idx" ON "sessions"("tutorId", "updatedAt" DESC);

-- Profile stats: tutor ended sessions in a rolling `endedAt` window.
CREATE INDEX "sessions_tutorId_status_endedAt_idx" ON "sessions"("tutorId", "status", "endedAt" DESC);

-- Moderation queue: filter by report status + recency.
CREATE INDEX "content_reports_status_createdAt_idx" ON "content_reports"("status", "createdAt" DESC);
