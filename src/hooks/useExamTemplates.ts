import { useState, useEffect } from 'react';
import { ExamTemplate, getAverageSubtopicDistribution, getTemplateDifficultyLevels } from '../lib/templateGenerator';
import examTemplatesJson from '../assets/examTemplates.json';

const TEMPLATES = examTemplatesJson as ExamTemplate[];

/**
 * Hook that provides exam templates loaded from the bundled JSON
 * (originally derived from the Excel data file).
 */
export function useExamTemplates() {
  const [templates] = useState<ExamTemplate[]>(TEMPLATES);

  const difficultyLevels = getTemplateDifficultyLevels(templates);

  function getDistribution(difficultyLevel?: number) {
    return getAverageSubtopicDistribution(templates, difficultyLevel);
  }

  return { templates, difficultyLevels, getDistribution };
}
