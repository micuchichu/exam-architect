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
  imageUrl?: string;
}

export interface GeneratedExam {
  id: string;
  questions: Question[];
  createdAt: string;
}

export interface ExamSettings {
  /** Types to exclude from generation */
  excludedTypes: string[];
  /** Subtypes to exclude from generation */
  excludedSubtypes: string[];
  /** 1-5 scale: 1 = mostly easy, 3 = balanced, 5 = mostly hard */
  difficultyBias: number;
  /** Weight per type (type string -> 0-100). Missing = default 50 */
  typeWeights: Record<string, number>;
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
