-- Add a request "kind" so a request can be either "teach me this" (LEARNING) or
-- "do this for me" (SERVICE). Same request/response/messaging pipeline either way;
-- existing rows default to LEARNING, which preserves current behaviour exactly.

CREATE TYPE "RequestKind" AS ENUM ('LEARNING', 'SERVICE');

ALTER TABLE "TutoringRequest" ADD COLUMN "kind" "RequestKind" NOT NULL DEFAULT 'LEARNING';

CREATE INDEX "TutoringRequest_kind_idx" ON "TutoringRequest"("kind");
