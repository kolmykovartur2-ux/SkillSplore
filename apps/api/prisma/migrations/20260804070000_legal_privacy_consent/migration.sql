-- CreateEnum
CREATE TYPE "LegalDocumentSlug" AS ENUM ('TERMS', 'PRIVACY', 'COMMUNITY_GUIDELINES', 'SAFETY', 'ACADEMIC_INTEGRITY', 'PROHIBITED_SERVICES', 'COOKIES', 'SUBPROCESSORS');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('MARKETING_EMAIL', 'DATA_INSIGHTS', 'ANALYTICS_COOKIES');

-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'EXPORT', 'DEACTIVATION', 'DELETION', 'MARKETING_OPT_OUT', 'CONSENT_WITHDRAWAL', 'COMPLAINT', 'AUTOMATED_DECISION_ENQUIRY');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('RECEIVED', 'IDENTITY_CHECK', 'IN_PROGRESS', 'AWAITING_USER', 'COMPLETED', 'REFUSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PrivacyIncidentStatus" AS ENUM ('DETECTED', 'CONTAINED', 'ASSESSING', 'NOTIFIED', 'CLOSED');

-- NOTE: prisma migrate diff wanted to drop Category_name_trgm_idx and
-- Subject_name_trgm_idx here. Those are pg_trgm GIN indexes created by
-- 20260801000000_subject_suggestions and they power fuzzy subject matching.
-- Prisma cannot represent a GIN/trgm index in schema.prisma, so every future
-- diff will keep proposing the same drop. Leave them alone.

-- NOTE: prisma migrate diff also proposed DROP TABLE "user_sessions" here.
-- That table is the express-session store, created at runtime by
-- connect-pg-simple (see src/app.ts, createTableIfMissing: true). It is not
-- in schema.prisma, so every diff will keep proposing to drop it -- exactly
-- like the pg_trgm indexes above.
--
-- Dropping it would sign out every logged-in user, and any request in flight
-- before connect-pg-simple recreated the table would fail. Left in place.

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" SERIAL NOT NULL,
    "slug" "LegalDocumentSlug" NOT NULL,
    "title" TEXT NOT NULL,
    "currentVersionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "legalReviewedAt" TIMESTAMP(3),
    "legalReviewedBy" TEXT,
    "unresolvedPlaceholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLegalAcceptance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "versionId" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentVersion" (
    "id" SERIAL NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "version" TEXT NOT NULL,
    "wording" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "dataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recipientCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retentionSummary" TEXT,
    "withdrawalSummary" TEXT,
    "recipientsMustDeleteOnWithdrawal" BOOLEAN NOT NULL DEFAULT false,
    "priorDisclosuresReversible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "versionId" INTEGER NOT NULL,
    "grantedWording" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "auditReference" TEXT,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentWithdrawal" (
    "id" SERIAL NOT NULL,
    "consentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" TEXT,
    "method" TEXT NOT NULL,
    "downstreamDeletionStatus" TEXT,
    "downstreamDeletionAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "contactEmail" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "details" TEXT NOT NULL,
    "identityCheckNote" TEXT,
    "outcomeNote" TEXT,
    "refusalReason" TEXT,
    "handledBy" INTEGER,
    "dueAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequestEvent" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subprocessor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "country" TEXT,
    "purpose" TEXT NOT NULL,
    "dataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contractStatus" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    "securityReviewedAt" TIMESTAMP(3),
    "retentionTerms" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subprocessor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataCategory" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "insightsEligible" BOOLEAN NOT NULL DEFAULT false,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionRule" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "retainDays" INTEGER,
    "basis" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDisclosureRecord" (
    "id" SERIAL NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "dataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedUserCount" INTEGER,
    "requestReference" TEXT,
    "disclosedBy" INTEGER,
    "disclosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "DataDisclosureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeratorAccessLog" (
    "id" SERIAL NOT NULL,
    "moderatorId" INTEGER NOT NULL,
    "conversationId" INTEGER,
    "messageId" INTEGER,
    "targetUserId" INTEGER,
    "reason" TEXT NOT NULL,
    "ground" TEXT NOT NULL,
    "reportId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeratorAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyIncident" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "PrivacyIncidentStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "containedAt" TIMESTAMP(3),
    "dataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedUserCount" INTEGER,
    "regulatorNotifiedAt" TIMESTAMP(3),
    "usersNotifiedAt" TIMESTAMP(3),
    "remediation" TEXT,
    "postIncidentReview" TEXT,
    "createdBy" INTEGER,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreachAssessment" (
    "id" SERIAL NOT NULL,
    "incidentId" INTEGER NOT NULL,
    "assessorId" INTEGER,
    "seriousHarmLikely" BOOLEAN,
    "reasoning" TEXT NOT NULL,
    "recommendRegulatorNotification" BOOLEAN,
    "recommendUserNotification" BOOLEAN,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreachAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRestriction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "imposedBy" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "liftedAt" TIMESTAMP(3),
    "liftedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_slug_key" ON "LegalDocument"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_currentVersionId_key" ON "LegalDocument"("currentVersionId");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_documentId_publishedAt_idx" ON "LegalDocumentVersion"("documentId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_documentId_version_key" ON "LegalDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_userId_idx" ON "UserLegalAcceptance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLegalAcceptance_userId_versionId_key" ON "UserLegalAcceptance"("userId", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentVersion_kind_version_key" ON "ConsentVersion"("kind", "version");

-- CreateIndex
CREATE INDEX "UserConsent_userId_kind_idx" ON "UserConsent"("userId", "kind");

-- CreateIndex
CREATE INDEX "UserConsent_kind_withdrawnAt_idx" ON "UserConsent"("kind", "withdrawnAt");

-- CreateIndex
CREATE INDEX "ConsentWithdrawal_userId_idx" ON "ConsentWithdrawal"("userId");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_userId_idx" ON "PrivacyRequest"("userId");

-- CreateIndex
CREATE INDEX "PrivacyRequestEvent_requestId_idx" ON "PrivacyRequestEvent"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Subprocessor_name_service_key" ON "Subprocessor"("name", "service");

-- CreateIndex
CREATE UNIQUE INDEX "DataCategory_key_key" ON "DataCategory"("key");

-- CreateIndex
CREATE INDEX "RetentionRule_categoryId_idx" ON "RetentionRule"("categoryId");

-- CreateIndex
CREATE INDEX "DataDisclosureRecord_disclosedAt_idx" ON "DataDisclosureRecord"("disclosedAt");

-- CreateIndex
CREATE INDEX "ModeratorAccessLog_moderatorId_createdAt_idx" ON "ModeratorAccessLog"("moderatorId", "createdAt");

-- CreateIndex
CREATE INDEX "ModeratorAccessLog_conversationId_idx" ON "ModeratorAccessLog"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyIncident_reference_key" ON "PrivacyIncident"("reference");

-- CreateIndex
CREATE INDEX "PrivacyIncident_status_detectedAt_idx" ON "PrivacyIncident"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "BreachAssessment_incidentId_idx" ON "BreachAssessment"("incidentId");

-- CreateIndex
CREATE INDEX "AccountRestriction_userId_liftedAt_idx" ON "AccountRestriction"("userId", "liftedAt");

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegalAcceptance" ADD CONSTRAINT "UserLegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegalAcceptance" ADD CONSTRAINT "UserLegalAcceptance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ConsentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentWithdrawal" ADD CONSTRAINT "ConsentWithdrawal_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "UserConsent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequestEvent" ADD CONSTRAINT "PrivacyRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrivacyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionRule" ADD CONSTRAINT "RetentionRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DataCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreachAssessment" ADD CONSTRAINT "BreachAssessment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "PrivacyIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRestriction" ADD CONSTRAINT "AccountRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

