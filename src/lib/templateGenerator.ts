import { Question, GeneratedExam, ExamSettings } from './types';

export interface ExamTemplate {
  id: string;
  date: string;
  variant: string;
  difficultyLabel: string;
  difficultyLevel: number;
  algebraPct: number;
  analizaPct: number;
  geometriePct: number;
  totalQuestions: number;
  subtopicCounts: Record<string, number>;
}

/**
 * Difficulty level mapping (matches Excel Difficulty_Level column)
 * 1 = Usor, 2 = Mediu, 3 = Mediu-Greu, 4 = Greu, 5 = Foarte-Greu
 */
export const DIFFICULTY_LEVEL_LABELS: Record<number, string> = {
  1: 'Ușor',
  2: 'Mediu',
  3: 'Mediu-Greu',
  4: 'Greu',
  5: 'Foarte Greu',
};

/** Broad category each subtype belongs to */
export const SUBTYPE_TO_CATEGORY: Record<string, string> = {
  aplicatii_trig_alg: 'algebra',
  matrice: 'algebra',
  multimi: 'algebra',
  nr_complexe: 'algebra',
  nr_reale: 'algebra',
  structuri_algebrice: 'algebra',
  limite: 'analiza',
  continuitate: 'analiza',
  derivabilitate: 'analiza',
  studiu_functiilor: 'analiza',
  functii_exponentiale: 'analiza',
  functii_trigonometrice: 'analiza',
  aplicatii_trig_geom: 'analiza',
  grafice: 'analiza',
  primitive: 'analiza',
  integrale_definite: 'analiza',
  drepte_in_plan: 'geometrie',
  drepte_in_spatiu: 'geometrie',
  vectori: 'geometrie',
  conice: 'geometrie',
  corpuri_rotunde: 'geometrie',
  arii_si_volume: 'geometrie',
  poliedre_arii_volume: 'geometrie',
  ecuatii_in_plan: 'geometrie',
  ecuatii_trigonometrice: 'geometrie',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Normalize a subtype string for fuzzy matching.
 * Handles camelCase → snake_case and space variants.
 */
function normalizeSubtype(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Check if a question matches a required subtype slot.
 * Compares both q.subtype and q.type against the target subtype key.
 */
function questionMatchesSubtype(q: Question, subtypeKey: string): boolean {
  const target = normalizeSubtype(subtypeKey);
  const qs = normalizeSubtype(q.subtype || '');
  const qt = normalizeSubtype(q.type || '');
  return qs === target || qt === target;
}

export interface TemplateGenerationOptions {
  /** Filter templates by difficulty level (1-5). If omitted, picks any template. */
  difficultyLevel?: number;
  /** Excluded broad categories (algebra | analiza | geometrie) */
  excludedCategories?: string[];
  /** Excluded specific subtypes */
  excludedSubtypes?: string[];
}

/**
 * Generate an exam by selecting a historical template from the Excel data
 * and filling each subtopic slot with matching questions from the pool.
 *
 * Algorithm:
 * 1. Filter templates by requested difficulty level
 * 2. Pick a template randomly among matching ones
 * 3. For each subtopic slot (subtype → count), pick 'count' questions
 *    from the pool that match that subtype
 * 4. Fill any remaining slots (up to totalQuestions) with unmatched pool questions
 * 5. Shuffle the final selection
 */
export function generateExamFromTemplate(
  pool: Question[],
  templates: ExamTemplate[],
  options: TemplateGenerationOptions = {}
): GeneratedExam | { error: string } {
  const { difficultyLevel, excludedCategories = [], excludedSubtypes = [] } = options;

  // Step 1: Filter templates by difficulty
  let eligible = templates;
  if (difficultyLevel !== undefined) {
    eligible = templates.filter(t => t.difficultyLevel === difficultyLevel);
    if (eligible.length === 0) {
      // Fallback: closest difficulty
      const sorted = [...templates].sort(
        (a, b) => Math.abs(a.difficultyLevel - difficultyLevel!) - Math.abs(b.difficultyLevel - difficultyLevel!)
      );
      eligible = sorted.slice(0, 1);
    }
  }

  // Step 2: Pick random template
  const template = eligible[Math.floor(Math.random() * eligible.length)];
  const target = template.totalQuestions || 10;

  // Step 3: Build ordered list of (subtype, count) slots, filtered
  const slots = Object.entries(template.subtopicCounts)
    .filter(([subtype, count]) => {
      if (count <= 0) return false;
      if (excludedSubtypes.includes(subtype)) return false;
      const cat = SUBTYPE_TO_CATEGORY[subtype];
      if (cat && excludedCategories.includes(cat)) return false;
      return true;
    })
    .map(([subtype, count]) => ({ subtype, count }));

  const selected: Question[] = [];
  const usedIds = new Set<string>();

  // Step 4: For each slot, pick matching questions
  for (const { subtype, count } of slots) {
    const candidates = shuffle(
      pool.filter(q => questionMatchesSubtype(q, subtype) && !usedIds.has(q.id))
    );
    let filled = 0;
    for (const q of candidates) {
      if (filled >= count) break;
      selected.push(q);
      usedIds.add(q.id);
      filled++;
    }
  }

  // Step 5: Fill remaining up to target with any unused question
  if (selected.length < target) {
    const remaining = shuffle(pool.filter(q => !usedIds.has(q.id)));
    for (const q of remaining) {
      if (selected.length >= target) break;
      selected.push(q);
      usedIds.add(q.id);
    }
  }

  if (selected.length < target) {
    return {
      error: `Could only select ${selected.length}/${target} questions. ` +
        `Add more questions matching the subtopics: ${slots.map(s => s.subtype).join(', ')}.`,
    };
  }

  return {
    id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    questions: shuffle(selected).slice(0, target),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Compute the average subtopic question count per template,
 * optionally filtered by difficulty level.
 * Useful for UI stats and distribution charts.
 */
export function getAverageSubtopicDistribution(
  templates: ExamTemplate[],
  difficultyLevel?: number
): Record<string, number> {
  let pool = templates;
  if (difficultyLevel !== undefined) {
    const filtered = templates.filter(t => t.difficultyLevel === difficultyLevel);
    if (filtered.length > 0) pool = filtered;
  }
  const totals: Record<string, number> = {};
  for (const t of pool) {
    for (const [subtype, count] of Object.entries(t.subtopicCounts)) {
      totals[subtype] = (totals[subtype] || 0) + count;
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([k, v]) => [k, +(v / pool.length).toFixed(2)])
  );
}

/**
 * Get all unique difficulty levels present in the templates.
 */
export function getTemplateDifficultyLevels(templates: ExamTemplate[]): number[] {
  return [...new Set(templates.map(t => t.difficultyLevel))].sort();
}
