import { Question, GeneratedExam, ExamSettings } from './types';
import { ExamTemplate, generateExamFromTemplate, TemplateGenerationOptions } from './templateGenerator';

const DEFAULT_SETTINGS: ExamSettings = {
  excludedTypes: [],
  excludedSubtypes: [],
  difficultyBias: 3,
  typeWeights: {},
};

/**
 * Generate an exam using the TEMPLATE-BASED algorithm.
 * Uses historical exam patterns from the Excel data.
 *
 * @param pool - All available questions
 * @param templates - Parsed exam templates from examTemplates.json
 * @param settings - User-configured generation settings
 */
export function generateExamWithTemplate(
  pool: Question[],
  templates: ExamTemplate[],
  settings: Partial<ExamSettings> & { difficultyLevel?: number } = {}
): GeneratedExam | { error: string } {
  const cfg = { ...DEFAULT_SETTINGS, ...settings };

  // Map difficultyBias (1-5) → difficultyLevel (1-5) if no explicit level set
  const diffLevel = settings.difficultyLevel ?? cfg.difficultyBias;

  // Apply excluded types/subtypes from base settings
  const options: TemplateGenerationOptions = {
    difficultyLevel: diffLevel,
    excludedCategories: cfg.excludedTypes,
    excludedSubtypes: cfg.excludedSubtypes,
  };

  return generateExamFromTemplate(pool, templates, options);
}

/**
 * Original fallback generator (no templates required).
 * Keep for backward compatibility when no templates are loaded.
 */
export function generateExam(
  pool: Question[],
  settings: Partial<ExamSettings> = {}
): GeneratedExam | { error: string } {
  const cfg = { ...DEFAULT_SETTINGS, ...settings };

  const filtered = pool.filter(q => {
    if (cfg.excludedTypes.includes(q.type)) return false;
    if (q.subtype && cfg.excludedSubtypes.includes(q.subtype)) return false;
    return true;
  });

  if (filtered.length < 10) {
    return { error: `Not enough eligible questions. Have ${filtered.length}, need at least 10.` };
  }

  const hardTargetMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 6 };
  const hardTarget = hardTargetMap[cfg.difficultyBias] ?? 3;
  const hardPool = filtered.filter(q => q.difficulty === 'hard');
  const easyMedPool = filtered.filter(q => q.difficulty !== 'hard');
  const minHard = Math.min(hardTarget, hardPool.length);

  const selected: Question[] = [];
  const subtypeCounts: Record<string, number> = {};

  function getSubtype(q: Question): string { return q.subtype || q.type || 'unknown'; }
  function canAdd(q: Question): boolean {
    return (subtypeCounts[getSubtype(q)] || 0) < 2 && !selected.find(s => s.id === q.id);
  }
  function addQuestion(q: Question) {
    selected.push(q);
    const st = getSubtype(q);
    subtypeCounts[st] = (subtypeCounts[st] || 0) + 1;
  }

  function weightedShuffle(arr: Question[]): Question[] {
    const items = arr.map(q => ({ q, weight: Math.max(1, cfg.typeWeights[q.type] ?? 50) }));
    const result: Question[] = [];
    while (items.length > 0) {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let rand = Math.random() * total;
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

  for (const q of weightedShuffle(hardPool)) {
    if (selected.length >= minHard) break;
    if (canAdd(q)) addQuestion(q);
  }
  for (const q of weightedShuffle(easyMedPool)) {
    if (selected.length >= 10) break;
    if (canAdd(q)) addQuestion(q);
  }
  for (const q of weightedShuffle(hardPool)) {
    if (selected.length >= 10) break;
    if (canAdd(q)) addQuestion(q);
  }

  if (selected.length < 10) {
    return { error: `Could only select ${selected.length} questions with subtype constraints.` };
  }

  return {
    id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    questions: shuffle(selected),
    createdAt: new Date().toISOString(),
  };
}
