// Learnfolk subject catalogue — a hierarchical taxonomy inspired by the depth of
// large services marketplaces (profi.ru lists ~1,900 tutoring subjects). This is
// a realistic starter catalogue; administrators can extend it at runtime.
//
// The 10 subjects named in the specification (Thermodynamics, Engineering
// mathematics, Programming, NCEA calculus, Saxophone, Piano, English, Russian,
// Vietnamese, SolidWorks) are all present so the demo tutors resolve correctly.

export interface CategoryDef {
  name: string;
  icon: string; // emoji used on category tiles
  subjects: string[];
}

export const TAXONOMY: CategoryDef[] = [
  {
    name: 'Languages',
    icon: '🗣️',
    subjects: [
      'English',
      'English as a second language',
      'IELTS preparation',
      'TOEFL preparation',
      'French',
      'Spanish',
      'German',
      'Mandarin Chinese',
      'Japanese',
      'Korean',
      'Russian',
      'Vietnamese',
      'Italian',
      'Arabic',
      'Te Reo Māori',
    ],
  },
  {
    name: 'Mathematics',
    icon: '➗',
    subjects: [
      'Primary maths',
      'NCEA calculus',
      'NCEA statistics',
      'Algebra',
      'Geometry',
      'Trigonometry',
      'Calculus',
      'Engineering mathematics',
      'University mathematics',
    ],
  },
  {
    name: 'Sciences',
    icon: '🔬',
    subjects: [
      'Physics',
      'Chemistry',
      'Biology',
      'Thermodynamics',
      'Earth & space science',
      'Environmental science',
      'Anatomy & physiology',
    ],
  },
  {
    name: 'English & Humanities',
    icon: '📚',
    subjects: [
      'English literature',
      'Essay & academic writing',
      'History',
      'Geography',
      'Classical studies',
      'Philosophy',
      'Media studies',
    ],
  },
  {
    name: 'Computer Science & IT',
    icon: '💻',
    subjects: [
      'Programming',
      'Python',
      'JavaScript',
      'Web development',
      'Java',
      'C++',
      'Data science',
      'Machine learning',
      'Databases & SQL',
      'Cybersecurity',
      'Game development',
    ],
  },
  {
    name: 'Engineering & CAD',
    icon: '📐',
    subjects: [
      'SolidWorks',
      'AutoCAD',
      'Fusion 360',
      'MATLAB',
      'Mechanical engineering',
      'Electrical engineering',
      'Civil engineering',
    ],
  },
  {
    name: 'Music',
    icon: '🎵',
    subjects: [
      'Piano',
      'Guitar',
      'Violin',
      'Cello',
      'Saxophone',
      'Flute',
      'Drums',
      'Ukulele',
      'Singing & vocals',
      'Music theory',
      'Music production',
    ],
  },
  {
    name: 'Exam & Test Prep',
    icon: '📝',
    subjects: [
      'NCEA exam preparation',
      'University Entrance',
      'Scholarship exams',
      'SAT preparation',
      'GRE preparation',
      'GMAT preparation',
      'Cambridge exams',
    ],
  },
  {
    name: 'Business & Economics',
    icon: '📈',
    subjects: [
      'Accounting',
      'Economics',
      'Business studies',
      'Finance',
      'Marketing',
      'Statistics for business',
    ],
  },
  {
    name: 'Arts & Design',
    icon: '🎨',
    subjects: [
      'Drawing',
      'Painting',
      'Graphic design',
      'Photography',
      'Digital art',
      'Art history',
    ],
  },
  {
    name: 'Professional Skills',
    icon: '🧑‍💼',
    subjects: [
      'Microsoft Excel',
      'Public speaking',
      'CV & resume writing',
      'Interview preparation',
      'Project management',
    ],
  },
  {
    name: 'Sports & Fitness',
    icon: '⚽',
    subjects: [
      'Personal training',
      'Yoga',
      'Swimming coaching',
      'Tennis coaching',
      'Football coaching',
      'Running & athletics',
    ],
  },
];

// Convenience: total number of subjects in the catalogue.
export const TOTAL_SUBJECTS = TAXONOMY.reduce((n, c) => n + c.subjects.length, 0);
