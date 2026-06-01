export type QuestionnaireKey =
  | 'attention'
  | 'behavior'
  | 'communication'
  | 'sensory'
  | 'emotions'
  | 'learning';

export type QuestionnaireAnswers = Record<QuestionnaireKey, number>;

export interface UserMetadata {
  parentName?: string;
  parentEmail?: string;
  childName?: string;
  childAge?: number | null;
  questionnaireCompleted?: boolean;
  questionnaireAnswers?: QuestionnaireAnswers;
  childProfile?: string;
}
