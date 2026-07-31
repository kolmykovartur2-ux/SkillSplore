/**
 * Development & demonstration seed.
 *
 * Creates a plausible, clearly fictional SkillSplore marketplace so every primary
 * user journey can be tested. No real individuals' identities, photos,
 * qualifications or biographies are used. Refuses to run when APP_ENV=production.
 */
import { prisma, guardDemoCommand, truncateAll, hash, DEMO_PASSWORD, DEMO_ACCOUNTS } from './_demo.js';
import { TAXONOMY, TOTAL_SUBJECTS } from './taxonomy.data.js';
import { normalizeName } from '../src/lib/normalize.js';
import type { DeliveryMode } from '@prisma/client';

const dollars = (n: number) => Math.round(n * 100);

async function main() {
  guardDemoCommand('demo:seed');

  console.log('Clearing existing data...');
  await truncateAll();

  // --- Taxonomy ------------------------------------------------------------
  console.log(`Seeding taxonomy (${TAXONOMY.length} categories, ${TOTAL_SUBJECTS} subjects)...`);
  const subjects: Record<string, number> = {};
  for (const cat of TAXONOMY) {
    const category = await prisma.category.create({
      data: { name: cat.name, normalizedName: normalizeName(cat.name), slug: slug(cat.name), icon: cat.icon },
    });
    for (const subjectName of cat.subjects) {
      // Subject names are unique across the catalogue; skip accidental dupes.
      if (subjects[subjectName]) continue;
      const s = await prisma.subject.create({
        data: { name: subjectName, normalizedName: normalizeName(subjectName), slug: slug(subjectName), categoryId: category.id },
      });
      subjects[subjectName] = s.id;
    }
  }

  const levelDefs = ['Primary', 'Intermediate', 'NCEA Level 1', 'NCEA Level 2', 'NCEA Level 3', 'Undergraduate', 'Postgraduate', 'Adult / Hobby'];
  const levels: Record<string, number> = {};
  for (let i = 0; i < levelDefs.length; i++) {
    const l = await prisma.teachingLevel.create({ data: { name: levelDefs[i]!, slug: slug(levelDefs[i]!), sortOrder: i } });
    levels[levelDefs[i]!] = l.id;
  }

  // --- Users ---------------------------------------------------------------
  console.log('Seeding users...');
  const demoHash = await hash(DEMO_PASSWORD);

  const admin = await prisma.user.create({
    data: {
      email: DEMO_ACCOUNTS.admin,
      passwordHash: demoHash,
      displayName: 'Demo Administrator',
      roles: ['STUDENT', 'ADMIN'],
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
      bio: 'Platform administrator (demo).',
    },
  });

  async function student(email: string, name: string, isDemo = false) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: isDemo ? demoHash : await hash(randomPw()),
        displayName: name,
        roles: ['STUDENT'],
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
      },
    });
  }

  const demoStudent = await student(DEMO_ACCOUNTS.student, 'Ava Thompson', true);
  const liam = await student('liam.student@demo.skillsplore.local', 'Liam Wilson');
  const mia = await student('mia.student@demo.skillsplore.local', 'Mia Chen');
  const students = [demoStudent, liam, mia];

  // --- Tutors --------------------------------------------------------------
  console.log('Seeding tutors...');
  interface TutorDef {
    email: string;
    name: string;
    isDemo?: boolean;
    country: string;
    city: string;
    mode: DeliveryMode;
    rate: number;
    years: number;
    headline: string;
    experience: string;
    style: string;
    subjects: Array<[string, number?]>;
    levels: string[];
    quals: Array<{ title: string; institution: string; year: number; withDoc?: boolean; verified?: boolean }>;
  }

  const approvedDefs: TutorDef[] = [
    {
      email: DEMO_ACCOUNTS.tutor, name: 'Noah Patel', isDemo: true, country: 'New Zealand', city: 'Auckland', mode: 'BOTH', rate: 75, years: 8,
      headline: 'Mechanical engineering & thermodynamics tutor',
      experience: 'Eight years tutoring university engineering students. Former teaching assistant for thermodynamics and heat transfer.',
      style: 'I work from your course materials and build intuition with worked examples before past-paper practice.',
      subjects: [['Thermodynamics'], ['Engineering mathematics', dollars(70)]],
      levels: ['Undergraduate', 'Postgraduate'],
      quals: [{ title: 'BE (Hons) Mechanical Engineering', institution: 'University of Auckland', year: 2016, withDoc: true, verified: true }],
    },
    {
      email: 'charlotte.tutor@demo.skillsplore.local', name: 'Charlotte Nguyen', country: 'New Zealand', city: 'Wellington', mode: 'IN_PERSON', rate: 60, years: 12,
      headline: 'Piano & saxophone teacher, beginners to grade 8',
      experience: 'Professional performer and private teacher for over a decade, preparing students for ABRSM and Trinity exams.',
      style: 'Patient and encouraging, tailored to each student — from first notes to advanced repertoire.',
      subjects: [['Piano'], ['Saxophone', dollars(65)]],
      levels: ['Primary', 'Intermediate', 'Adult / Hobby'],
      quals: [{ title: 'Bachelor of Music (Performance)', institution: 'Victoria University of Wellington', year: 2011, withDoc: true, verified: true }],
    },
    {
      email: 'ethan.tutor@demo.skillsplore.local', name: 'Ethan Brown', country: 'Australia', city: 'Sydney', mode: 'ONLINE', rate: 90, years: 6,
      headline: 'Software engineer teaching programming & SolidWorks',
      experience: 'Full-stack developer and mechanical design hobbyist. I teach programming fundamentals and CAD for makers.',
      style: 'Project-based: we build something real while covering the fundamentals you need.',
      subjects: [['Programming'], ['SolidWorks', dollars(85)]],
      levels: ['Undergraduate', 'Adult / Hobby'],
      quals: [{ title: 'BSc Computer Science', institution: 'University of Sydney', year: 2018, withDoc: true }],
    },
    {
      email: 'sophie.tutor@demo.skillsplore.local', name: 'Sophie Kaur', country: 'New Zealand', city: 'Christchurch', mode: 'BOTH', rate: 55, years: 5,
      headline: 'NCEA calculus & engineering maths specialist',
      experience: 'Secondary maths teacher supporting NCEA Level 1–3 and first-year engineering maths.',
      style: 'Structured around the NCEA standards with lots of exam technique.',
      subjects: [['NCEA calculus'], ['Engineering mathematics']],
      levels: ['NCEA Level 1', 'NCEA Level 2', 'NCEA Level 3', 'Undergraduate'],
      quals: [{ title: 'BSc Mathematics, GradDip Teaching', institution: 'University of Canterbury', year: 2019, withDoc: true, verified: true }],
    },
    {
      email: 'jack.tutor@demo.skillsplore.local', name: 'Jack Williams', country: 'Australia', city: 'Melbourne', mode: 'ONLINE', rate: 50, years: 4,
      headline: 'English tutor — essays, comprehension, exam prep',
      experience: 'English tutor for senior secondary and first-year university students.',
      style: 'We focus on clear structure and confident, well-evidenced writing.',
      subjects: [['English']],
      levels: ['NCEA Level 2', 'NCEA Level 3', 'Undergraduate'],
      quals: [{ title: 'BA English Literature', institution: 'University of Melbourne', year: 2020 }],
    },
    {
      email: 'isabella.tutor@demo.skillsplore.local', name: 'Isabella Rossi', country: 'New Zealand', city: 'Hamilton', mode: 'BOTH', rate: 58, years: 9,
      headline: 'Russian & English language tutor',
      experience: 'Native Russian speaker and qualified language teacher.',
      style: 'Conversation-first with grammar woven in as you need it.',
      subjects: [['Russian'], ['English', dollars(52)]],
      levels: ['Adult / Hobby', 'Undergraduate'],
      quals: [{ title: 'MA Applied Linguistics', institution: 'University of Waikato', year: 2015, withDoc: true }],
    },
    {
      email: 'oliver.tutor@demo.skillsplore.local', name: 'Oliver Tran', country: 'Australia', city: 'Brisbane', mode: 'ONLINE', rate: 48, years: 7,
      headline: 'Vietnamese & English for all ages',
      experience: 'Bilingual tutor helping learners with practical, everyday language.',
      style: 'Relaxed, practical lessons built around real conversations.',
      subjects: [['Vietnamese'], ['English', dollars(45)]],
      levels: ['Primary', 'Adult / Hobby'],
      quals: [{ title: 'Cert IV in TESOL', institution: 'TAFE Queensland', year: 2017 }],
    },
    {
      email: 'amelia.tutor@demo.skillsplore.local', name: 'Amelia Clark', country: 'New Zealand', city: 'Dunedin', mode: 'IN_PERSON', rate: 62, years: 15,
      headline: 'Classical & contemporary piano teacher',
      experience: 'Fifteen years teaching piano to children and adults, all levels.',
      style: 'Warm and methodical; theory and playing together.',
      subjects: [['Piano']],
      levels: ['Primary', 'Intermediate', 'Adult / Hobby'],
      quals: [{ title: 'LTCL Piano Performance', institution: 'Trinity College London', year: 2009, withDoc: true, verified: true }],
    },
    {
      email: 'lucas.tutor@demo.skillsplore.local', name: 'Lucas Smith', country: 'Australia', city: 'Perth', mode: 'ONLINE', rate: 80, years: 5,
      headline: 'Learn to code — Python, web, and more',
      experience: 'Software engineer who loves teaching absolute beginners to write their first programs.',
      style: 'Hands-on from lesson one; you write code, I coach.',
      subjects: [['Programming']],
      levels: ['Undergraduate', 'Adult / Hobby'],
      quals: [{ title: 'BEng Software Engineering', institution: 'Curtin University', year: 2019 }],
    },
    {
      email: 'grace.tutor@demo.skillsplore.local', name: 'Grace Lee', country: 'New Zealand', city: 'Auckland', mode: 'BOTH', rate: 82, years: 10,
      headline: 'Thermodynamics & SolidWorks for engineering students',
      experience: 'Mechanical engineer combining thermofluids theory with practical CAD skills.',
      style: 'I connect the theory to real design decisions and CAD workflows.',
      subjects: [['Thermodynamics'], ['SolidWorks', dollars(88)]],
      levels: ['Undergraduate', 'Postgraduate'],
      quals: [{ title: 'ME Mechanical Engineering', institution: 'University of Auckland', year: 2014, withDoc: true, verified: true }],
    },
  ];

  const pendingDefs: TutorDef[] = [
    {
      email: DEMO_ACCOUNTS.pending_tutor, name: 'Henry Adams', isDemo: true, country: 'New Zealand', city: 'Tauranga', mode: 'ONLINE', rate: 55, years: 3,
      headline: 'Programming tutor (application under review)',
      experience: 'Self-taught developer keen to help others get started.',
      style: 'Friendly and patient, focused on building confidence.',
      subjects: [['Programming']],
      levels: ['Adult / Hobby'],
      quals: [{ title: 'Certificate in Software Development', institution: 'Toi Ohomai', year: 2022, withDoc: true }],
    },
    {
      email: 'zoe.pending@demo.skillsplore.local', name: 'Zoe Martin', country: 'Australia', city: 'Adelaide', mode: 'IN_PERSON', rate: 60, years: 6,
      headline: 'Saxophone teacher (application under review)',
      experience: 'Gigging saxophonist offering lessons for beginners and improvers.',
      style: 'Play real music from day one.',
      subjects: [['Saxophone']],
      levels: ['Intermediate', 'Adult / Hobby'],
      quals: [{ title: 'Diploma of Music', institution: 'Adelaide College of the Arts', year: 2016, withDoc: true }],
    },
  ];

  async function createTutor(def: TutorDef, status: 'APPROVED' | 'PENDING') {
    const user = await prisma.user.create({
      data: {
        email: def.email,
        passwordHash: def.isDemo ? demoHash : await hash(randomPw()),
        displayName: def.name,
        roles: ['STUDENT', 'TUTOR'],
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
        bio: def.headline,
      },
    });
    const profile = await prisma.tutorProfile.create({
      data: {
        userId: user.id,
        status,
        headline: def.headline,
        experience: def.experience,
        teachingStyle: def.style,
        deliveryMode: def.mode,
        country: def.country,
        city: def.city,
        hourlyRateCents: dollars(def.rate),
        currency: def.country === 'Australia' ? 'AUD' : 'NZD',
        yearsExperience: def.years,
        availabilityNote: 'Weekday evenings and weekend mornings.',
        submittedAt: new Date(),
        approvedAt: status === 'APPROVED' ? new Date() : null,
        reviewedById: status === 'APPROVED' ? admin.id : null,
        levels: { connect: def.levels.map((l) => ({ id: levels[l]! })) },
        subjects: { create: def.subjects.map(([name, price]) => ({ subjectId: subjects[name]!, priceCents: price ?? null })) },
        availability: {
          create: [
            { dayOfWeek: 2, startMinute: 17 * 60, endMinute: 20 * 60 },
            { dayOfWeek: 4, startMinute: 17 * 60, endMinute: 20 * 60 },
            { dayOfWeek: 6, startMinute: 9 * 60, endMinute: 12 * 60 },
          ],
        },
      },
    });
    for (const q of def.quals) {
      let documentKey: string | undefined;
      let documentName: string | undefined;
      if (q.withDoc) {
        const stored = await putDemoDoc(def.name, q.title);
        documentKey = stored.key;
        documentName = stored.name;
      }
      await prisma.qualification.create({
        data: {
          tutorProfileId: profile.id,
          title: q.title,
          institution: q.institution,
          year: q.year,
          documentKey,
          documentName,
          verifiedAt: q.verified ? new Date() : null,
          verifiedById: q.verified ? admin.id : null,
        },
      });
    }
    return { user, profile };
  }

  const approved: Array<{ user: { id: number; displayName: string }; profile: { id: number } }> = [];
  for (const def of approvedDefs) approved.push(await createTutor(def, 'APPROVED'));
  for (const def of pendingDefs) await createTutor(def, 'PENDING');

  await writeAudit(admin.id, 'seed.tutors_approved', approved.length);

  // --- Student requests ----------------------------------------------------
  console.log('Seeding student requests...');
  interface ReqDef { student: number; subject: string; level?: string; title: string; description: string; mode: DeliveryMode; country?: string; city?: string; min?: number; max?: number; status?: 'OPEN' | 'PAUSED' | 'CLOSED'; }
  const reqDefs: ReqDef[] = [
    { student: demoStudent.id, subject: 'Thermodynamics', level: 'Undergraduate', title: 'Help with second-year thermodynamics', description: 'Struggling with entropy and the second law ahead of my mid-semester test. Need weekly sessions.', mode: 'BOTH', country: 'New Zealand', city: 'Auckland', min: 50, max: 90 },
    { student: demoStudent.id, subject: 'Piano', level: 'Adult / Hobby', title: 'Adult beginner piano lessons', description: 'Complete beginner, would love relaxed in-person lessons to learn some pop songs.', mode: 'IN_PERSON', country: 'New Zealand', city: 'Auckland', max: 70 },
    { student: liam.id, subject: 'NCEA calculus', level: 'NCEA Level 3', title: 'NCEA Level 3 calculus exam prep', description: 'Need help preparing for externals — differentiation and integration especially.', mode: 'ONLINE', min: 40, max: 60 },
    { student: liam.id, subject: 'Programming', level: 'Adult / Hobby', title: 'Learn Python from scratch', description: 'Career-changer wanting to learn Python basics and build a small project.', mode: 'ONLINE', max: 90 },
    { student: mia.id, subject: 'Vietnamese', level: 'Adult / Hobby', title: 'Conversational Vietnamese', description: 'Want to practise conversational Vietnamese before visiting family.', mode: 'ONLINE' },
    { student: mia.id, subject: 'Engineering mathematics', level: 'Undergraduate', title: 'First-year engineering maths support', description: 'Linear algebra and calculus for first-year engineering. Weekly online sessions preferred.', mode: 'ONLINE', min: 45, max: 80 },
    { student: demoStudent.id, subject: 'SolidWorks', level: 'Undergraduate', title: 'SolidWorks for a design project', description: 'Need to learn SolidWorks quickly for a university design paper.', mode: 'BOTH', country: 'New Zealand', city: 'Auckland', min: 60, max: 100 },
    { student: liam.id, subject: 'Saxophone', level: 'Intermediate', title: 'Intermediate saxophone lessons', description: 'Grade 3-ish, want to work on tone and improvisation.', mode: 'IN_PERSON', country: 'New Zealand', city: 'Wellington', status: 'PAUSED' },
    { student: mia.id, subject: 'English', level: 'NCEA Level 3', title: 'Essay writing help for NCEA English', description: 'Want to lift my essay marks — structure and analysis.', mode: 'ONLINE', min: 40, max: 60 },
    { student: demoStudent.id, subject: 'Russian', level: 'Adult / Hobby', title: 'Beginner Russian', description: 'Starting from zero, keen to learn the alphabet and basics.', mode: 'ONLINE', status: 'CLOSED' },
    { student: liam.id, subject: 'Programming', level: 'Undergraduate', title: 'Data structures & algorithms coaching', description: 'Preparing for technical interviews, need DSA practice.', mode: 'ONLINE', min: 60, max: 120 },
  ];
  const requests: Array<{ id: number; subjectName: string }> = [];
  for (const r of reqDefs) {
    const created = await prisma.tutoringRequest.create({
      data: {
        studentId: r.student,
        subjectId: subjects[r.subject]!,
        levelId: r.level ? levels[r.level]! : null,
        title: r.title,
        description: r.description,
        deliveryMode: r.mode,
        country: r.country,
        city: r.city,
        budgetMinCents: r.min ? dollars(r.min) : null,
        budgetMaxCents: r.max ? dollars(r.max) : null,
        currency: r.country === 'Australia' ? 'AUD' : 'NZD',
        timing: 'Flexible, weekday evenings preferred.',
        status: r.status ?? 'OPEN',
        publishedAt: r.status === 'CLOSED' ? new Date(Date.now() - 6 * 864e5) : new Date(),
        closedAt: r.status === 'CLOSED' ? new Date() : null,
      },
    });
    requests.push({ id: created.id, subjectName: r.subject });
  }

  // --- Responses to requests ----------------------------------------------
  console.log('Seeding responses...');
  const findApprovedForSubject = (name: string) =>
    approvedDefs
      .map((d, i) => ({ d, p: approved[i]! }))
      .filter(({ d }) => d.subjects.some(([s]) => s === name));

  // Thermodynamics request (index 0) gets several responses to compare.
  const thermoReq = requests[0]!;
  for (const { p } of findApprovedForSubject('Thermodynamics')) {
    await prisma.requestResponse.create({
      data: {
        requestId: thermoReq.id,
        tutorProfileId: p.profile.id,
        introduction: 'Hi! I specialise in exactly this — happy to help you master entropy and the second law with weekly sessions and past-paper practice.',
        proposedRateCents: dollars(70 + Math.floor(Math.random() * 20)),
        availabilityNote: 'Tuesday and Thursday evenings.',
        status: 'PENDING',
      },
    });
  }
  // Python request (index 3) gets responses.
  for (const { p } of findApprovedForSubject('Programming')) {
    await prisma.requestResponse.create({
      data: {
        requestId: requests[3]!.id,
        tutorProfileId: p.profile.id,
        introduction: 'I love teaching beginners Python — we can build a small project together while covering the fundamentals.',
        proposedRateCents: dollars(60 + Math.floor(Math.random() * 25)),
        availabilityNote: 'Weekday evenings online.',
        status: 'PENDING',
      },
    });
  }

  // --- Direct enquiry conversation + messages ------------------------------
  console.log('Seeding conversations and engagements...');
  const noah = approved[0]!; // demo tutor
  const charlotte = approved[1]!;

  const convo1 = await prisma.conversation.create({
    data: {
      context: 'DIRECT_ENQUIRY',
      tutorProfileId: noah.profile.id,
      participants: { create: [{ userId: demoStudent.id, lastReadAt: new Date() }, { userId: (await tutorUserId(noah.profile.id)) }] },
    },
  });
  await addMessage(convo1.id, demoStudent.id, 'Hi Noah, I saw your thermodynamics profile — are you available for weekly sessions this semester?');
  await addMessage(convo1.id, await tutorUserId(noah.profile.id), 'Hi Ava! Yes, I have Tuesday and Thursday evenings free. Happy to start whenever suits you.');

  // A completed engagement + review (demo student ↔ Charlotte, piano).
  const convo2 = await prisma.conversation.create({
    data: {
      context: 'DIRECT_ENQUIRY',
      tutorProfileId: charlotte.profile.id,
      participants: { create: [{ userId: demoStudent.id, lastReadAt: new Date() }, { userId: await tutorUserId(charlotte.profile.id) }] },
    },
  });
  await addMessage(convo2.id, demoStudent.id, 'Hi Charlotte, could we book a few beginner piano lessons?');
  await addMessage(convo2.id, await tutorUserId(charlotte.profile.id), 'Absolutely — let’s start this week!');

  const completedEngagement = await prisma.engagement.create({
    data: {
      studentId: demoStudent.id,
      tutorProfileId: charlotte.profile.id,
      subjectId: subjects['Piano']!,
      conversationId: convo2.id,
      title: 'Beginner piano — first block of lessons',
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // An arranged (not yet completed) engagement for the demo student ↔ Noah.
  await prisma.engagement.create({
    data: {
      studentId: demoStudent.id,
      tutorProfileId: noah.profile.id,
      subjectId: subjects['Thermodynamics']!,
      conversationId: convo1.id,
      title: 'Thermodynamics weekly sessions',
      status: 'ARRANGED',
    },
  });

  // --- Reviews -------------------------------------------------------------
  console.log('Seeding reviews...');
  await prisma.review.create({
    data: {
      engagementId: completedEngagement.id,
      tutorProfileId: charlotte.profile.id,
      studentId: demoStudent.id,
      rating: 5,
      title: 'Wonderful first lessons',
      body: 'Charlotte is patient and encouraging. I went from zero to playing a simple song in a few weeks!',
      categoryRatings: { communication: 5, knowledge: 5, punctuality: 5, helpfulness: 5 },
      tutorResponse: 'Thank you Ava — it has been a joy teaching you!',
      tutorRespondedAt: new Date(),
    },
  });

  // Extra completed engagements + reviews for a couple of other tutors so the
  // marketplace shows ratings.
  await seedReviewFor(liam.id, approved[8]!, subjects['Programming']!, 5, 'Great coding coach', 'Lucas explains things clearly and set me real challenges.');
  await seedReviewFor(mia.id, approved[3]!, subjects['NCEA calculus']!, 4, 'Really helped my grades', 'Sophie knows the NCEA standards inside out.');
  await seedReviewFor(mia.id, approved[4]!, subjects['English']!, 5, 'My essays improved a lot', 'Clear, structured feedback every session.');

  // --- Recompute aggregate ratings ----------------------------------------
  for (const a of approved) await recompute(a.profile.id);

  // --- A report awaiting moderation ---------------------------------------
  console.log('Seeding an unresolved report...');
  const someMessage = await prisma.message.findFirst({ where: { conversationId: convo1.id }, orderBy: { id: 'desc' } });
  await prisma.report.create({
    data: {
      reporterId: liam.id,
      entityType: 'MESSAGE',
      entityId: someMessage!.id,
      reason: 'Suspicious contact',
      details: 'This message asked me to take the conversation off-platform. Please review.',
      status: 'OPEN',
    },
  });

  await writeAudit(admin.id, 'seed.completed', requests.length);

  console.log('\n✅ Seed complete.\n');
  console.log('Demo accounts (development/demo only):');
  for (const [role, email] of Object.entries(DEMO_ACCOUNTS)) {
    console.log(`  ${role.padEnd(14)} ${email}   password: ${DEMO_PASSWORD}`);
  }
  console.log('');
}

// --- helpers ---------------------------------------------------------------

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function randomPw(): string {
  return 'x' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A9!';
}
async function tutorUserId(profileId: number): Promise<number> {
  const p = await prisma.tutorProfile.findUniqueOrThrow({ where: { id: profileId }, select: { userId: true } });
  return p.userId;
}
async function addMessage(conversationId: number, senderId: number, body: string) {
  await prisma.message.create({ data: { conversationId, senderId, body } });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
}
async function recompute(tutorProfileId: number) {
  const agg = await prisma.review.aggregate({ where: { tutorProfileId, status: 'PUBLISHED' }, _avg: { rating: true }, _count: { _all: true } });
  await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: { averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : 0, ratingCount: agg._count._all },
  });
}
async function writeAudit(actorId: number, action: string, count: number) {
  await prisma.auditLog.create({ data: { actorId, action, metadata: { count } } });
}
async function seedReviewFor(
  studentId: number,
  tutor: { user: { id: number }; profile: { id: number } },
  subjectId: number,
  rating: number,
  title: string,
  body: string,
) {
  const convo = await prisma.conversation.create({
    data: {
      context: 'DIRECT_ENQUIRY',
      tutorProfileId: tutor.profile.id,
      participants: { create: [{ userId: studentId, lastReadAt: new Date() }, { userId: tutor.user.id }] },
    },
  });
  const engagement = await prisma.engagement.create({
    data: { studentId, tutorProfileId: tutor.profile.id, subjectId, conversationId: convo.id, title: 'Tutoring sessions', status: 'COMPLETED', completedAt: new Date() },
  });
  await prisma.review.create({
    data: { engagementId: engagement.id, tutorProfileId: tutor.profile.id, studentId, rating, title, body },
  });
}

// Writes a small placeholder "qualification document" into object storage so the
// secure private-document flow is demonstrable. Clearly fictional content.
async function putDemoDoc(tutorName: string, title: string) {
  const { storage } = await import('../src/lib/storage.js');
  const content = Buffer.from(
    `FICTIONAL DEMONSTRATION DOCUMENT\n\nThis is placeholder evidence for: ${title}\nHeld by (fictional): ${tutorName}\n\nNo real qualification is represented.\n`,
    'utf8',
  );
  const stored = await storage.put('qualifications', 'certificate.txt', content, 'text/plain');
  return { key: stored.key, name: 'certificate.txt' };
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
