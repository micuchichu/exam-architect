import { Question, Difficulty } from './types';

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  a: 'easy',
  b: 'medium',
  c: 'hard',
};

const imageModules = import.meta.glob<{ default: string }>(
  '../assets/questions/**/*.{png,jpg,jpeg,webp}',
  { eager: true }
);

function parseFilename(path: string): { difficulty: Difficulty; type: string; subtype: string; id: string } | null {
  const filename = path.split('/').pop() || '';
  const base = filename.replace(/\.\w+$/, '').toLowerCase();
  const parts = base.split('-');
  if (parts.length < 4) return null;
  const [id, diff, type, ...subtypeParts] = parts;
  const rawSubtype = subtypeParts.join('-');
  const subtype = rawSubtype.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  const difficulty = DIFFICULTY_ALIASES[diff];
  if (!difficulty) return null;
  return { difficulty, type, subtype, id };
}

export function loadStaticQuestions(): Question[] {
  const questions: Question[] = [];

  for (const [path, mod] of Object.entries(imageModules)) {
    const parsed = parseFilename(path);
    if (!parsed) continue;

    const filename = path.split('/').pop() || '';
    questions.push({
      id: parsed.id,
      text: filename,
      type: parsed.type,
      subtype: parsed.subtype,
      difficulty: parsed.difficulty,
      correctAnswer: '',
      createdAt: new Date().toISOString(),
      hasImage: true,
      imageUrl: mod.default,
    });
  }

  return questions.sort((a, b) => a.id.localeCompare(b.id));
}
