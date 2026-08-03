-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('IDEA', 'RESEARCHING', 'DRAFT', 'AWAITING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EditorType" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REAPPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED_TRANSIENT', 'FAILED_PERMANENT');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('LOGO', 'SCREENSHOT', 'PHOTO', 'DIAGRAM', 'POST_IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('TEXT_ONLY', 'SINGLE_IMAGE', 'MULTI_IMAGE', 'LINK_POST', 'NATIVE_VIDEO_BRIEF', 'DOCUMENT_POST_BRIEF', 'POLL_BRIEF');

-- CreateEnum
CREATE TYPE "GenerationProviderType" AS ENUM ('ANTHROPIC', 'OPENAI_COMPATIBLE', 'OLLAMA', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedinConnection" (
    "id" SERIAL NOT NULL,
    "ownerAdminUserId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'linkedin',
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "grantedScopes" TEXT[],
    "connectionStatus" "ConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedinConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedinOrganization" (
    "id" SERIAL NOT NULL,
    "connectionId" INTEGER NOT NULL,
    "linkedinOrganizationUrn" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "pageUrl" TEXT,
    "authenticatedMemberUrn" TEXT,
    "authorizationStatus" TEXT NOT NULL DEFAULT 'unknown',
    "publishingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "analyticsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkedinOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedinPermission" (
    "id" SERIAL NOT NULL,
    "connectionId" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LinkedinPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPillar" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetPercentage" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCampaign" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" SERIAL NOT NULL,
    "pillarId" INTEGER,
    "campaignId" INTEGER,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idea',
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" SERIAL NOT NULL,
    "ideaId" INTEGER,
    "pillarId" INTEGER,
    "objective" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "mainIdea" TEXT NOT NULL,
    "evidenceSource" TEXT,
    "productStage" TEXT NOT NULL,
    "desiredReaderAction" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "format" "ContentFormat" NOT NULL DEFAULT 'TEXT_ONLY',
    "maxLength" INTEGER NOT NULL DEFAULT 3000,
    "claimsRequiringVerification" JSONB,
    "relevantLink" TEXT,
    "creativeAssetId" INTEGER,
    "discussesPricing" BOOLEAN NOT NULL DEFAULT false,
    "discussesUsersOrOutcomes" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER,
    "briefId" INTEGER,
    "contentType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "title" TEXT,
    "destinationUrl" TEXT,
    "mediaAssetId" INTEGER,
    "generationProvider" TEXT NOT NULL,
    "generationModel" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'IDEA',
    "createdBy" INTEGER,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "currentVersionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "editorType" "EditorType" NOT NULL,
    "editorUserId" INTEGER,
    "generationRunId" INTEGER,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentApproval" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "actorId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSchedule" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "scheduledForUtc" TIMESTAMP(3) NOT NULL,
    "timezoneAtScheduling" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedPost" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'linkedin',
    "organizationUrn" TEXT,
    "linkedinPostUrn" TEXT NOT NULL,
    "publishedUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyticsSyncAt" TIMESTAMP(3),

    CONSTRAINT "PublishedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" SERIAL NOT NULL,
    "publishedPostId" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER,
    "uniqueImpressions" INTEGER,
    "reactions" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "clicks" INTEGER,
    "followerGrowth" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "postFormat" TEXT,
    "contentPillarKey" TEXT,
    "targetAudience" TEXT,
    "callToAction" TEXT,
    "campaignKey" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingFact" (
    "id" SERIAL NOT NULL,
    "factKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvalDate" TIMESTAMP(3) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "containsPersonalInfo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingFactSource" (
    "id" SERIAL NOT NULL,
    "factId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingFactSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "consentId" INTEGER,
    "attribution" TEXT,
    "usageRights" TEXT NOT NULL,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentConsent" (
    "id" SERIAL NOT NULL,
    "subjectDescription" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "approvedWording" TEXT,
    "approvedImageAssetId" INTEGER,
    "platformsAllowed" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "evidenceReference" TEXT NOT NULL,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptSummary" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationProviderConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GenerationProviderType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthCheckOk" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationAttempt" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "requestId" TEXT,
    "status" "AttemptStatus" NOT NULL,
    "providerResponseCode" INTEGER,
    "safeErrorMessage" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PublicationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedinOrganization_connectionId_linkedinOrganizationUrn_key" ON "LinkedinOrganization"("connectionId", "linkedinOrganizationUrn");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPillar_key_key" ON "ContentPillar"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ContentCampaign_key_key" ON "ContentCampaign"("key");

-- CreateIndex
CREATE INDEX "ContentDraft_status_idx" ON "ContentDraft"("status");

-- CreateIndex
CREATE INDEX "ContentDraft_scheduledFor_idx" ON "ContentDraft"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_draftId_versionNumber_key" ON "ContentVersion"("draftId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSchedule_draftId_key" ON "ContentSchedule"("draftId");

-- CreateIndex
CREATE INDEX "ContentSchedule_scheduledForUtc_idx" ON "ContentSchedule"("scheduledForUtc");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPost_draftId_key" ON "PublishedPost"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingFact_factKey_key" ON "MarketingFact"("factKey");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationProviderConfig_name_key" ON "GenerationProviderConfig"("name");

-- CreateIndex
CREATE INDEX "PublicationAttempt_draftId_idx" ON "PublicationAttempt"("draftId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "LinkedinOrganization" ADD CONSTRAINT "LinkedinOrganization_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "LinkedinConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedinPermission" ADD CONSTRAINT "LinkedinPermission_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "LinkedinConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "ContentPillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ContentCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "ContentPillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ContentCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ContentBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentApproval" ADD CONSTRAINT "ContentApproval_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSchedule" ADD CONSTRAINT "ContentSchedule_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedPost" ADD CONSTRAINT "PublishedPost_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_publishedPostId_fkey" FOREIGN KEY ("publishedPostId") REFERENCES "PublishedPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingFactSource" ADD CONSTRAINT "MarketingFactSource_factId_fkey" FOREIGN KEY ("factId") REFERENCES "MarketingFact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "ContentConsent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationAttempt" ADD CONSTRAINT "PublicationAttempt_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
