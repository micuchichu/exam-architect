import { Question, GeneratedExam } from './types';

/**
 * Generate an exam with 10 questions:
 * - Max 2 of any single subtype
 * - 2-4 hard questions, rest mixed (easy/medium)
 */
export function generateExam(pool: Question[]): GeneratedExam | { error: string } {
  const hardQuestions = pool.filter(q => q.difficulty === 'hard');
  const easyMedQuestions = pool.filter(q => q.difficulty !== 'hard');

  if (hardQuestions.length < 2) {
    return { error: 'Not enough hard questions. Need at least 2.' };
  }
  if (pool.length < 10) {
    return { error: `Not enough questions in the bank. Have ${pool.length}, need at least 10.` };
  }

  const hardCount = Math.min(4, Math.max(2, hardQuestions.length));

  const selected: Question[] = [];
  const subtypeCounts: Record<string, number> = {};

  function getSubtype(q: Question): string {
    return q.subtype || q.type || 'unknown';
  }

  function canAdd(q: Question): boolean {
    return (subtypeCounts[getSubtype(q)] || 0) < 2 && !selected.find(s => s.id === q.id);
  }

  function addQuestion(q: Question) {
    selected.push(q);
    const st = getSubtype(q);
    subtypeCounts[st] = (subtypeCounts[st] || 0) + 1;
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const shuffledHard = shuffle(hardQuestions);
  for (const q of shuffledHard) {
    if (selected.length >= hardCount) break;
    if (canAdd(q)) addQuestion(q);
  }

  if (selected.length < 2) {
    return { error: 'Could not select enough hard questions with subtype constraints.' };
  }

  const shuffledEasyMed = shuffle(easyMedQuestions);
  for (const q of shuffledEasyMed) {
    if (selected.length >= 10) break;
    if (canAdd(q)) addQuestion(q);
  }

  if (selected.length < 10) {
    for (const q of shuffledHard) {
      if (selected.length >= 10) break;
      if (canAdd(q)) addQuestion(q);
    }
  }

  if (selected.length < 10) {
    return { error: `Could only select ${selected.length} questions with subtype constraints (max 2 per subtype). Add more questions of different subtypes.` };
  }

  return {
    id: crypto.randomUUID(),
    questions: shuffle(selected),
    createdAt: new Date().toISOString(),
  };
}
