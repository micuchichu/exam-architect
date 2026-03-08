import { Question, Difficulty, GeneratedExam } from './types';
import { saveImage, getImage, deleteImage, getData, setData, removeData } from './idb';

const QUESTIONS_KEY = 'exam-generator-questions';
const EXAMS_KEY = 'exam-generator-exams';

// ── Questions ──

export async function getQuestions(): Promise<Question[]> {
  const questions = await getData<Question[]>(QUESTIONS_KEY);
  if (!questions) return [];
  return questions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveQuestion(question: Question): Promise<void> {
  const questions = await getQuestions();
  questions.push(question);
  await setData(QUESTIONS_KEY, questions);
}

export async function deleteQuestion(id: string): Promise<void> {
  const questions = await getQuestions();
  await setData(QUESTIONS_KEY, questions.filter(q => q.id !== id));
  await deleteImage(id);
}

export async function deleteAllQuestions(): Promise<void> {
  const questions = await getQuestions();
  for (const q of questions) {
    if (q.hasImage) await deleteImage(q.id);
  }
  await removeData(QUESTIONS_KEY);
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
  const exams = await getData<GeneratedExam[]>(EXAMS_KEY);
  if (!exams) return [];
  return exams.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveExam(exam: GeneratedExam): Promise<void> {
  const exams = await getExams();
  exams.push(exam);
  await setData(EXAMS_KEY, exams);
}

export async function deleteExam(id: string): Promise<void> {
  const exams = await getExams();
  await setData(EXAMS_KEY, exams.filter(e => e.id !== id));
}
