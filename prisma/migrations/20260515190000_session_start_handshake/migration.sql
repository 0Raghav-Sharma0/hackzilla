-- Tutor → learner explicit “start session” handshake before ACTIVE.
ALTER TABLE "sessions" ADD COLUMN "startRequestedAt" TIMESTAMP(3);
