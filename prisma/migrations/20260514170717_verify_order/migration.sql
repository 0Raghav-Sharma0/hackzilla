-- DropIndex
DROP INDEX "content_reports_reporterId_createdAt_idx";

-- CreateIndex
CREATE INDEX "content_reports_reporterId_createdAt_idx" ON "content_reports"("reporterId", "createdAt" DESC);
