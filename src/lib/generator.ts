import { Question, GeneratedExam, ExamSettings } from './types';

const DEFAULT_SETTINGS: ExamSettings = {
  excludedTypes: [],
  excludedSubtypes: [],
  difficultyBias: 3,
  typeWeights: {},
};

/**
 * Generate an exam with 10 questions using configurable settings.
 * - difficultyBias 1-5 controls hard question count (1→1 hard, 5→6 hard)
 * - typeWeights bias selection toward preferred types
 * - excludedTypes/excludedSubtypes filter out unwanted questions
 * - Max 2 of any single subtype
 */
export function generateExam(
  pool: Question[],
  settings: Partial<ExamSettings> = {}
): GeneratedExam | { error: string } {
  const cfg = { ...DEFAULT_SETTINGS, ...settings };

  // Filter out excluded types and subtypes
  const filtered = pool.filter(q => {
    if (cfg.excludedTypes.includes(q.type)) return false;
    if (q.subtype && cfg.excludedSubtypes.includes(q.subtype)) return false;
    return true;
  });

  if (filtered.length < 10) {
    return { error: `Not enough eligible questions. Have ${filtered.length}, need at least 10.` };
  }

  // Difficulty bias → hard question target count (out of 10)
  // bias 1 → 1 hard, bias 2 → 2, bias 3 → 3, bias 4 → 4, bias 5 → 6
  const hardTargetMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 6 };
  const hardTarget = hardTargetMap[cfg.difficultyBias] ?? 3;

  const hardPool = filtered.filter(q => q.difficulty === 'hard');
  const easyMedPool = filtered.filter(q => q.difficulty !== 'hard');

  const minHard = Math.min(hardTarget, hardPool.length);
  if (minHard < 1 && hardTarget > 0) {
    return { error: 'Not enough hard questions for the selected difficulty.' };
  }

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

  // Weighted shuffle: higher weight → more likely to appear early
  function weightedShuffle(arr: Question[]): Question[] {
    const items = arr.map(q => {
      const w = cfg.typeWeights[q.type] ?? 50;
      return { q, weight: Math.max(1, w) };
    });
    const result: Question[] = [];
    while (items.length > 0) {
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
      let rand = Math.random() * totalWeight;
      let idx = 0;
      for (let i = 0; i < items.length; i++) {
        rand -= items[i].weight;
        if (rand <= 0) { idx = i; break; }
      }
      result.push(items[idx].q);
      items.splice(idx, 1);
    }
    return result;
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Select hard questions
  const shuffledHard = weightedShuffle(hardPool);
  for (const q of shuffledHard) {
    if (selected.length >= minHard) break;
    if (canAdd(q)) addQuestion(q);
  }

  // Fill remaining with easy/medium
  const shuffledEasyMed = weightedShuffle(easyMedPool);
  for (const q of shuffledEasyMed) {
    if (selected.length >= 10) break;
    if (canAdd(q)) addQuestion(q);
  }

  // If still not enough, pull more hard questions
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
