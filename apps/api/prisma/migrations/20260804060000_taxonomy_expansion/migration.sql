-- Category: featured flag, active flag, ordering, description, timestamps
ALTER TABLE "Category" ADD COLUMN "description" TEXT;
ALTER TABLE "Category" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Category" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Category" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Category_isFeatured_displayOrder_idx" ON "Category"("isFeatured", "displayOrder");

-- Subject: description, active flag, ordering, timestamps
ALTER TABLE "Subject" ADD COLUMN "description" TEXT;
ALTER TABLE "Subject" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Subject" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subject" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Subject" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Subject_isActive_idx" ON "Subject"("isActive");

-- TutoringRequest: free-text label for "Other subject or skill"
ALTER TABLE "TutoringRequest" ADD COLUMN "customSubjectLabel" TEXT;

-- Search synonyms/aliases, pointing at exactly one of a category or subject
-- (enforced in application code, not here -- see schema.prisma).
CREATE TABLE "TaxonomyAlias" (
    "id" SERIAL NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "categoryId" INTEGER,
    "subjectId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxonomyAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaxonomyAlias_normalizedTerm_key" ON "TaxonomyAlias"("normalizedTerm");
CREATE INDEX "TaxonomyAlias_categoryId_idx" ON "TaxonomyAlias"("categoryId");
CREATE INDEX "TaxonomyAlias_subjectId_idx" ON "TaxonomyAlias"("subjectId");

ALTER TABLE "TaxonomyAlias" ADD CONSTRAINT "TaxonomyAlias_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxonomyAlias" ADD CONSTRAINT "TaxonomyAlias_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
