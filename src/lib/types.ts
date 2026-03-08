export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  text: string;
  type: string;
  subtype?: string;
  difficulty: Difficulty;
  options?: string[]; // for multiple-choice
  correctAnswer: string;
  createdAt: string;
  hasImage?: boolean;
}

export interface GeneratedExam {
  id: string;
  questions: Question[];
  createdAt: string;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True / False',
  'short-answer': 'Short Answer',
  'fill-blank': 'Fill in the Blank',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};
