// Shared between prisma/taxonomy.data.ts (which seeds this as a real,
// unfeatured category+subject) and requests.routes.ts (which resolves the
// required subjectId column to this row when a poster picks "Other subject
// or skill"). Lives under src/ rather than prisma/ so both sides can import
// it -- prisma/ is allowed to import from src/, but tsconfig's rootDir means
// src/ cannot import from prisma/.
export const OTHER_SUBJECT_NAME = 'Other / not yet listed';
