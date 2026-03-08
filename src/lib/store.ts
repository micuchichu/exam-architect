import { Question, GeneratedExam } from './types';

const QUESTIONS_KEY = 'exam-generator-questions';
const EXAMS_KEY = 'exam-generator-exams';

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
