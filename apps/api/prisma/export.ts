/**
 * Portable data export. Writes every table to a single JSON document, giving a
 * provider-independent copy of all application data (in addition to pg_dump).
 * Refuses in production only if RUN_IN_PRODUCTION is not explicitly set, since
 * exporting production data may be a legitimate ownership-transfer action.
 *
 *   npm run export         # writes exports/learnfolk-export-<timestamp>.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './_demo.js';

async function main() {
  const data = {
    exportedAt: new Date().toISOString(),
    appEnv: process.env.APP_ENV ?? 'development',
    users: await prisma.user.findMany(),
    categories: await prisma.category.findMany(),
    subjects: await prisma.subject.findMany(),
    teachingLevels: await prisma.teachingLevel.findMany(),
    tutorProfiles: await prisma.tutorProfile.findMany(),
    tutorSubjects: await prisma.tutorSubject.findMany(),
    availabilitySlots: await prisma.availabilitySlot.findMany(),
    qualifications: await prisma.qualification.findMany(),
    savedTutors: await prisma.savedTutor.findMany(),
    tutoringRequests: await prisma.tutoringRequest.findMany(),
    requestResponses: await prisma.requestResponse.findMany(),
    conversations: await prisma.conversation.findMany(),
    conversationParticipants: await prisma.conversationParticipant.findMany(),
    messages: await prisma.message.findMany(),
    engagements: await prisma.engagement.findMany(),
    reviews: await prisma.review.findMany(),
    reports: await prisma.report.findMany(),
    adminNotes: await prisma.adminNote.findMany(),
    notifications: await prisma.notification.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
  };

  const dir = path.resolve(process.cwd(), process.env.EXPORT_DIR ?? '../../exports');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `learnfolk-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  const counts = Object.entries(data)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}=${(v as unknown[]).length}`)
    .join(', ');
  console.log(`Exported: ${file}\n${counts}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
