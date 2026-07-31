// Normalizes a subject/category name for duplicate detection: case, accents,
// and punctuation shouldn't be enough to create a second entry for the same
// thing ("Javascript" / "JavaScript" / "java script" all collapse together).
// Keeps `+` and `#` since they're meaningful in names like "C++" / "C#".
const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();
}
