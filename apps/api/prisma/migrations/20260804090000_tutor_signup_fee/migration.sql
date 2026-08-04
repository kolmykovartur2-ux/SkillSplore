-- Tutor signup fee.
--
-- No column in this migration holds card data, and none ever should. Payment is
-- taken through the processor's hosted checkout, so card numbers go from the
-- payer's browser straight to the processor and never reach this database.
-- See schema.prisma and src/lib/payments/.

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('TUTOR_SIGNUP');

-- NOTE: the diff again proposed dropping Category_name_trgm_idx and
-- Subject_name_trgm_idx. They are pg_trgm GIN indexes Prisma cannot represent,
-- and they power fuzzy subject matching. Leave them alone.

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tutorProfileId" INTEGER,
    "kind" "PaymentKind" NOT NULL DEFAULT 'TUTOR_SIGNUP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NZD',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeTierGrant" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tutorProfileId" INTEGER NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "limitAtGrant" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeTierGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformCounter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FreeTierGrant_tutorProfileId_key" ON "FreeTierGrant"("tutorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FreeTierGrant_slotNumber_key" ON "FreeTierGrant"("slotNumber");

-- CreateIndex
CREATE INDEX "FreeTierGrant_userId_idx" ON "FreeTierGrant"("userId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTierGrant" ADD CONSTRAINT "FreeTierGrant_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the free-tier counter. Created here rather than lazily in application
-- code so the atomic "UPDATE ... WHERE value < limit RETURNING value" claim
-- always has a row to lock. A lazy upsert would reintroduce exactly the
-- check-then-act race the counter exists to eliminate.
INSERT INTO "PlatformCounter" ("key", "value") VALUES ('free_tutor_signups', 0)
ON CONFLICT ("key") DO NOTHING;
