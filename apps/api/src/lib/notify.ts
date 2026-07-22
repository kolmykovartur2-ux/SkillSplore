import { prisma } from './prisma.js';

// Creates an in-app notification. Optionally mirrors it to email via the
// mailer adapter (callers decide, since not every notification warrants email).
export async function notify(input: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
}): Promise<void> {
  await prisma.notification.create({ data: input });
}
