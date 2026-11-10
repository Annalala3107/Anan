/**
 * AnanQuiz Core Type Definitions
 * Inspired by OpenQuiz, SuperMemo SM-2 & modern quiz platforms
 */

export interface Word {
  word: string;
  ipa?: string;
  vi?: string; // Vietnamese definition
  ru?: string; // Russian (for backwards-compatibility with original OpenQuiz sets)
  definition?: string; // General English definition
  synonyms: string[];
  simple_examples: string[];
  advanced_example: string;
  confusions: string[];
  category?: string;
}

export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface WordProgress {
  word: string;
  strength: number; // 0.0 to 1.0 (or percentage 0-100)
  lastSeen: number; // Unix timestamp ms
  nextDue: number; // Unix timestamp ms for Spaced Repetition (SRS)
  seenCount: number;
  wrongStreak: number;
  status: WordStatus;
  intervalDays?: number; // Current SRS interval in days
  easeFactor?: number; // SM-2 ease factor (default 2.5)
  mistakesCount?: number;
  lastMistakeTime?: number;
}

export type SessionMode = 'learn' | 'drill' | 'exam' | 'mistakes';

export interface QuizSet {
  id: string;
  name: string;
  description: string;
  file_path: string;
  is_public: boolean;
  author_name?: string;
  wordCount?: number;
  tags?: string[];
}

export interface CustomQuiz {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  words: Word[];
  is_public: boolean;
  author_name: string;
  created_at: string;
  updated_at?: string;
}

export type LearnRound = 'recall' | 'simple_usage' | 'contrast';

export interface LearnSession {
  mode: 'learn';
  words: Word[];
  currentRound: LearnRound;
  currentWordIndex: number;
  wordFeedback: Record<string, 'easy' | 'hard'>;
  completedRounds: LearnRound[];
}

export interface DrillQuestion {
  sentence: string;
  correctWord: string;
  options: string[];
  explanation: string;
}

export interface DrillSession {
  mode: 'drill';
  questions: DrillQuestion[];
  currentIndex: number;
  score: number;
}

export interface ExamQuestion {
  id: string;
  sentence: string;
  correctWord: string;
  options: string[];
  explanation?: string;
}

export interface ExamSession {
  mode: 'exam';
  questions: ExamQuestion[];
  currentIndex: number;
  answers: Record<number, string>;
  timeRemaining: number;
  totalTime: number;
  isComplete: boolean;
  score: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  wordsLearned: number;
  wordsDrilled: number;
  wordsExamined: number;
  mistakesCount: number;
  accuracy: number;
}

export interface UserStats {
  totalWords: number;
  masteredCount: number;
  learningCount: number;
  streak: number;
  todayProgress: DailyStats;
  mistakesCount: number;
  recentActivity: {
    date: string;
    mode: SessionMode;
    score: number;
  }[];
}
