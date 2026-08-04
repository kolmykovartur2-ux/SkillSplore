-- Provenance for AI-generated media assets.
-- Additive and backwards-compatible: every existing row is a human-supplied
-- asset, which is exactly what isAiGenerated = false records.
ALTER TABLE "MediaAsset" ADD COLUMN "isAiGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MediaAsset" ADD COLUMN "generationProvider" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "generationModel" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "generationPrompt" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "personaKey" TEXT;

-- Listing the media library filtered to generated assets is the common query
-- behind the "AI-generated" filter in the dashboard.
CREATE INDEX "MediaAsset_isAiGenerated_idx" ON "MediaAsset"("isAiGenerated");
