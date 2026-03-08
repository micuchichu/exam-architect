import { Question, Difficulty, GeneratedExam } from './types';
import { saveImage, getImage, deleteImage } from './idb';

const QUESTIONS_KEY = 'exam-generator-questions';
const EXAMS_KEY = 'exam-generator-exams';

// ── Questions ──

export async function getQuestions(): Promise<Question[]> {
  const raw = localStorage.getItem(QUESTIONS_KEY);
  if (!raw) return [];
  try {
    const questions: Question[] = JSON.parse(raw);
    return questions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function saveQuestion(question: Question): Promise<void> {
  const questions = await getQuestions();
  questions.push(question);
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

export async function deleteQuestion(id: string): Promise<void> {
  const questions = await getQuestions();
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions.filter(q => q.id !== id)));
  await deleteImage(id);
}

export async function deleteAllQuestions(): Promise<void> {
  const questions = await getQuestions();
  for (const q of questions) {
    if (q.hasImage) await deleteImage(q.id);
  }
  localStorage.removeItem(QUESTIONS_KEY);
}

// ── Image Upload ──

export async function uploadQuestionImage(questionId: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await saveImage(questionId, dataUrl);
      resolve(dataUrl);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadQuestionImageFromDataUrl(questionId: string, dataUrl: string): Promise<string> {
  await saveImage(questionId, dataUrl);
  return dataUrl;
}

// ── Exams ──

export async function getExams(): Promise<GeneratedExam[]> {
  const raw = localStorage.getItem(EXAMS_KEY);
  if (!raw) return [];
  try {
    const exams: GeneratedExam[] = JSON.parse(raw);
    return exams.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function saveExam(exam: GeneratedExam): Promise<void> {
  const exams = await getExams();
  exams.push(exam);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

export async function deleteExam(id: string): Promise<void> {
  const exams = await getExams();
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams.filter(e => e.id !== id)));
}
