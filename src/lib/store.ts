import { supabase } from '@/integrations/supabase/client';
import { Question, Difficulty, GeneratedExam } from './types';

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  a: 'easy',
  b: 'medium',
  c: 'hard',
};

// ── Questions ──

export async function getQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    text: row.text,
    type: row.type,
    subtype: row.subtype || undefined,
    difficulty: row.difficulty as Difficulty,
    options: row.options ? (row.options as string[]) : undefined,
    correctAnswer: row.correct_answer,
    createdAt: row.created_at,
    hasImage: row.has_image,
    imageUrl: row.image_url || undefined,
  }));
}

export async function saveQuestion(question: Question): Promise<void> {
  const { error } = await supabase.from('questions').insert({
    id: question.id,
    text: question.text,
    type: question.type,
    subtype: question.subtype || null,
    difficulty: question.difficulty,
    options: question.options ? (question.options as unknown as any) : null,
    correct_answer: question.correctAnswer,
    has_image: question.hasImage || false,
    image_url: question.imageUrl || null,
    created_at: question.createdAt,
  });
  if (error) {
    console.error('Error saving question:', error);
    throw error;
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  // Delete image from storage if exists
  await supabase.storage.from('question-images').remove([`${id}`]);
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
}

export async function deleteAllQuestions(): Promise<void> {
  // Get all questions to delete their images
  const { data } = await supabase.from('questions').select('id, has_image');
  if (data) {
    const imageIds = data.filter(q => q.has_image).map(q => q.id);
    if (imageIds.length > 0) {
      await supabase.storage.from('question-images').remove(imageIds);
    }
  }
  const { error } = await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Error deleting all questions:', error);
    throw error;
  }
}

// ── Image Upload ──

export async function uploadQuestionImage(questionId: string, file: File): Promise<string> {
  const { error } = await supabase.storage
    .from('question-images')
    .upload(questionId, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('question-images').getPublicUrl(questionId);
  return data.publicUrl;
}

export async function uploadQuestionImageFromDataUrl(questionId: string, dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], questionId, { type: blob.type });
  return uploadQuestionImage(questionId, file);
}

// ── Exams ──

export async function getExams(): Promise<GeneratedExam[]> {
  const { data: examRows, error } = await supabase
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !examRows) return [];

  // Fetch all questions referenced by exams
  const allIds = examRows.flatMap(e => e.question_ids);
  const uniqueIds = [...new Set(allIds)];
  
  let questionsMap = new Map<string, Question>();
  if (uniqueIds.length > 0) {
    const { data: qRows } = await supabase
      .from('questions')
      .select('*')
      .in('id', uniqueIds);
    if (qRows) {
      for (const row of qRows) {
        questionsMap.set(row.id, {
          id: row.id,
          text: row.text,
          type: row.type,
          subtype: row.subtype || undefined,
          difficulty: row.difficulty as Difficulty,
          options: row.options ? (row.options as string[]) : undefined,
          correctAnswer: row.correct_answer,
          createdAt: row.created_at,
          hasImage: row.has_image,
          imageUrl: row.image_url || undefined,
        });
      }
    }
  }

  return examRows.map(e => ({
    id: e.id,
    questions: e.question_ids
      .map(id => questionsMap.get(id))
      .filter((q): q is Question => !!q),
    createdAt: e.created_at,
  }));
}

export async function saveExam(exam: GeneratedExam): Promise<void> {
  const { error } = await supabase.from('exams').insert({
    id: exam.id,
    question_ids: exam.questions.map(q => q.id),
    created_at: exam.createdAt,
  });
  if (error) throw error;
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw error;
}
