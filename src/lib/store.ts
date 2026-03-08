import { Question, Difficulty, GeneratedExam } from './types';

const QUESTIONS_KEY = 'exam-generator-questions';
const EXAMS_KEY = 'exam-generator-exams';

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  a: 'easy',
  b: 'medium',
  c: 'hard',
};

function reParseFromFilename(q: Question): Question {
  if (!q.hasImage || !q.text) return q;
  const base = q.text.replace(/\.\w+$/, '').toLowerCase();
  const parts = base.split('-');
  if (parts.length < 5) return q;
  const [, , diff, type, ...subtypeParts] = parts;
  const difficulty = DIFFICULTY_ALIASES[diff];
  return {
    ...q,
    difficulty: difficulty || q.difficulty,
    type: type || q.type,
    subtype: subtypeParts.join('-') || q.subtype,
  };
}

export function migrateQuestions(): void {
  const questions = getQuestions();
  let changed = false;
  const updated = questions.map(q => {
    const migrated = reParseFromFilename(q);
    if (migrated.type !== q.type || migrated.subtype !== q.subtype || migrated.difficulty !== q.difficulty) {
      changed = true;
    }
    return migrated;
  });
  if (changed) {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(updated));
  }
}

export function getQuestions(): Question[] {
  const raw = localStorage.getItem(QUESTIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveQuestion(question: Question): void {
  const questions = getQuestions();
  questions.push(question);
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

export function deleteQuestion(id: string): void {
  const questions = getQuestions().filter(q => q.id !== id);
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

export function getExams(): GeneratedExam[] {
  const raw = localStorage.getItem(EXAMS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveExam(exam: GeneratedExam): void {
  const exams = getExams();
  exams.push(exam);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

export function deleteExam(id: string): void {
  const exams = getExams().filter(e => e.id !== id);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}
