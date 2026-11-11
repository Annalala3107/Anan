import { z } from 'zod';

export const WordSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  word: z.string().optional().default(''),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
  correctWord: z.string().optional(),
  explanation: z.string().optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  part_of_speech: z.string().optional(),
  phonetic: z.string().optional(),
  vi: z.string().optional(),
  ru: z.string().optional(),
  simple_examples: z.array(z.string()).optional(),
  advanced_example: z.string().optional(),
});

export const QuizDatasetSchema = z.array(WordSchema);

export const BackupDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  appName: z.string(),
  data: z.object({
    wordProgress: z.record(z.string(), z.any()),
    customQuizzes: z.array(z.any()).optional().default([]),
    dailyStats: z.any().optional(),
    streak: z.number().optional().default(1),
    selectedQuiz: z.string().optional(),
    examHistory: z.array(z.any()).optional().default([]),
  }),
});

export type ValidatedWord = z.infer<typeof WordSchema>;
export type ValidatedBackup = z.infer<typeof BackupDataSchema>;
