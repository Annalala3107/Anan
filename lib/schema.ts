import { z } from 'zod';

export const WordSchema = z.object({
  id: z.union([z.string().max(200), z.number().finite()]).optional(),
  word: z.string().max(2000).optional().default(''),
  question: z.string().max(5000).optional(),
  options: z.array(z.string().max(2000)).max(12).optional(),
  answer: z.string().max(1000).optional(),
  correctWord: z.string().max(2000).optional(),
  explanation: z.string().max(8000).optional(),
  subject: z.string().max(120).optional(),
  topic: z.string().max(300).optional(),
  category: z.string().max(200).optional(),
  vi: z.string().max(4000).optional(),
  ru: z.string().max(4000).optional(),
  definition: z.string().max(4000).optional(),
  simple_examples: z.array(z.string().max(1000)).max(20).optional(),
  advanced_example: z.string().max(1000).optional(),
  image: z.string().max(1000).optional(),
  imageCaption: z.string().max(500).optional(),
});

export const WordProgressSchema = z.object({
  word: z.string().max(500),
  strength: z.number().finite().min(0).max(1),
  lastSeen: z.number().finite().nonnegative(),
  nextDue: z.number().finite().nonnegative(),
  seenCount: z.number().int().min(0),
  wrongStreak: z.number().int().min(0),
  status: z.enum(['new', 'learning', 'review', 'mastered']),
  intervalDays: z.number().finite().min(0).optional(),
  easeFactor: z.number().finite().min(1).max(10).optional(),
  mistakesCount: z.number().int().min(0).optional(),
  lastMistakeTime: z.number().finite().nonnegative().optional(),
});

export const CustomQuizSchema = z.object({
  id: z.string().min(1).max(200),
  user_id: z.string().max(200).optional(),
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  words: z.array(WordSchema).max(2000),
  is_public: z.boolean().optional().default(true),
  author_name: z.string().max(200).optional().default('AnanQuiz'),
  created_at: z.string().max(100),
  updated_at: z.string().max(100).optional(),
  subject: z.string().max(120).optional(),
  topic: z.string().max(300).optional(),
});

export const CustomSubjectSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  subjectCode: z.string().min(1).max(60),
  description: z.string().max(1000).optional(),
  iconName: z.string().max(100).optional(),
  color: z.string().max(200),
  created_at: z.string().max(100),
});

export const DailyStatsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wordsLearned: z.number().int().min(0),
  wordsDrilled: z.number().int().min(0),
  wordsExamined: z.number().int().min(0),
  mistakesCount: z.number().int().min(0),
  accuracy: z.number().finite().min(0).max(100),
  accuracySum: z.number().finite().min(0).optional(),
  accuracySamples: z.number().int().min(0).optional(),
});

export const ExamRecordSchema = z.object({
  id: z.string().min(1).max(200),
  date: z.number().finite().nonnegative(),
  score: z.number().finite().min(0),
  total: z.number().int().min(0),
  percent: z.number().finite().min(0).max(100),
  wrongCount: z.number().int().min(0),
  quizTitle: z.string().max(300).optional(),
});

export const QuizDatasetSchema = z.array(WordSchema);

export const BackupDataSchema = z.object({
  version: z.string().max(40),
  exportedAt: z.string().max(100),
  appName: z.literal('AnanQuiz').or(z.string().min(1).max(80)),
  data: z.object({
    wordProgress: z.record(z.string().max(500), WordProgressSchema),
    customQuizzes: z.array(CustomQuizSchema).max(200).optional().default([]),
    customSubjects: z.array(CustomSubjectSchema).max(100).optional().default([]),
    dailyStats: DailyStatsSchema.nullable().optional(),
    dailyHistory: z.array(DailyStatsSchema).max(60).optional().default([]),
    streak: z.number().int().min(0).max(100000).optional().default(1),
    selectedQuiz: z.string().max(500).optional(),
    examHistory: z.array(ExamRecordSchema).max(200).optional().default([]),
    bookmarks: z.array(z.string().max(500)).max(2000).optional().default([]),
  }),
});

export type ValidatedWord = z.infer<typeof WordSchema>;
export type ValidatedWordProgress = z.infer<typeof WordProgressSchema>;
export type ValidatedCustomQuiz = z.infer<typeof CustomQuizSchema>;
export type ValidatedCustomSubject = z.infer<typeof CustomSubjectSchema>;
export type ValidatedDailyStats = z.infer<typeof DailyStatsSchema>;
export type ValidatedExamRecord = z.infer<typeof ExamRecordSchema>;
export type ValidatedBackup = z.infer<typeof BackupDataSchema>;

export const AiExplainRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, 'Câu hỏi quá ngắn.')
    .max(5000, 'Câu hỏi vượt quá giới hạn 5.000 ký tự.'),
  options: z.array(z.string().max(1500)).max(12).optional().default([]),
  correctAnswer: z.string().max(2000).optional().default(''),
  userAnswer: z.string().max(2000).optional().default(''),
  subject: z.string().max(120).optional().default(''),
  topic: z.string().max(200).optional().default(''),
  userApiKey: z.string().max(256).optional(),
});

export const AiSolveQuestionItemSchema = z.object({
  index: z.number().int().min(0),
  question: z.string().trim().min(1).max(5000),
  options: z.array(z.string().max(1500)).min(2).max(12),
});

export const AiSolveRequestSchema = z.object({
  mode: z.literal('solve'),
  subject: z.string().max(120).optional().default('PRF192'),
  userApiKey: z.string().max(256).optional(),
  questions: z
    .array(AiSolveQuestionItemSchema)
    .min(1, 'Không có câu hỏi hợp lệ nào cần AI giải đáp.')
    .max(30, 'Mỗi lượt chỉ giải tối đa 30 câu hỏi.'),
});

export const AiGenerateRequestSchema = z.object({
  mode: z.literal('generate').optional().default('generate'),
  prompt: z
    .string()
    .trim()
    .min(3, 'Vui lòng cung cấp chủ đề hoặc nội dung cần tạo câu hỏi.')
    .max(24000, 'Nội dung yêu cầu vượt quá giới hạn 24.000 ký tự.'),
  subject: z.string().max(120).optional().default('PRF192'),
  count: z.coerce.number().int().min(1).max(30).optional().default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  questionType: z.enum(['single', 'multi', 'mixed']).optional().default('single'),
  userApiKey: z.string().max(256).optional(),
});

export type ValidatedAiExplainRequest = z.infer<typeof AiExplainRequestSchema>;
export type ValidatedAiSolveRequest = z.infer<typeof AiSolveRequestSchema>;
export type ValidatedAiGenerateRequest = z.infer<typeof AiGenerateRequestSchema>;
