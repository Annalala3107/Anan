import { Word } from '@/lib/types';

export interface PartQuestionItem {
  id: string;
  rawWord: Word;
  originalNumber: number; // 1-based index in the full deck
  sentence: string;
  correctWord: string;
  correctOptions: string[];
  originalCorrectWord: string;
  originalCorrectOptions: string[];
  originalAnswerKey?: string;
  isMultiSelect: boolean;
  requiredCount: number;
  options: string[];
  originalOptions: string[];
  explanation: string;
  answerKey?: string;
  hasAnswerKey: boolean;
  image?: string;
  imageCaption?: string;
}

export interface CheckpointPart {
  id: string;
  index: number; // 0-based part index, or -1 / -2 for special smart parts
  title: string;
  subtitle: string;
  items: PartQuestionItem[];
  masteredCount: number;
  learningCount: number;
  mistakeCount: number;
  isSpecial?: 'unmastered' | 'mistakes';
}
