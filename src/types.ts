export type QuestionnaireKey =
  | 'attention'
  | 'behavior'
  | 'communication'
  | 'sensory'
  | 'emotions'
  | 'learning';

export type QuestionnaireAnswers = Record<QuestionnaireKey, number>;

export interface QuestionnaireActivityResult {
  id: string;
  label: string;
  skills: string[];
  correct: boolean;
  attempts: number;
}

export interface QuestionnaireInsights {
  areaScores: QuestionnaireAnswers;
  strengths: string[];
  supportAreas: string[];
  activityResults: QuestionnaireActivityResult[];
  completedAt: string;
}

export interface UserMetadata {
  parentName?: string;
  parentEmail?: string;
  childName?: string;
  childAge?: number | null;
  questionnaireCompleted?: boolean;
  questionnaireAnswers?: QuestionnaireAnswers;
  childProfile?: string;
  questionnaireInsights?: QuestionnaireInsights;
}
