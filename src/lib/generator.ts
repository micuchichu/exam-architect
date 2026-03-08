import { Question, QuestionType, GeneratedExam } from './types';

/**
 * Generate an exam with 10 questions:
 * - Max 2 of any single question type
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

  // Determine how many hard questions (2-4)
  const hardCount = Math.min(4, Math.max(2, hardQuestions.length));
  const easyMedCount = 10 - hardCount;

  const selected: Question[] = [];
  const typeCounts: Record<string, number> = {};

  function canAdd(q: Question): boolean {
    return (typeCounts[q.type] || 0) < 2 && !selected.find(s => s.id === q.id);
  }

  function addQuestion(q: Question) {
    selected.push(q);
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
  }

  // Shuffle helper
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Pick hard questions
  const shuffledHard = shuffle(hardQuestions);
  for (const q of shuffledHard) {
    if (selected.length >= hardCount) break;
    if (canAdd(q)) addQuestion(q);
  }

  if (selected.length < 2) {
    return { error: 'Could not select enough hard questions with type constraints.' };
  }

  // Pick easy/medium questions
  const shuffledEasyMed = shuffle(easyMedQuestions);
  for (const q of shuffledEasyMed) {
    if (selected.length >= 10) break;
    if (canAdd(q)) addQuestion(q);
  }

  // If we still don't have 10, try remaining hard questions
  if (selected.length < 10) {
    for (const q of shuffledHard) {
      if (selected.length >= 10) break;
      if (canAdd(q)) addQuestion(q);
    }
  }

  if (selected.length < 10) {
    return { error: `Could only select ${selected.length} questions with type constraints (max 2 per type). Add more questions of different types.` };
  }

  return {
    id: crypto.randomUUID(),
    questions: shuffle(selected),
    createdAt: new Date().toISOString(),
  };
}
