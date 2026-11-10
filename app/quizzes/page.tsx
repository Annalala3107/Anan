'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  BookOpen,
  Plus,
  Play,
  Check,
  Share2,
  Trash2,
  Upload,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { CustomQuiz, QuizSet } from '@/lib/types';
import AIPromptModal from '@/components/ai/AIPromptModal';

const PRESET_QUIZZES: QuizSet[] = [
  {
    id: 'preset_vi_en',
    name: 'IELTS / SAT Tiếng Việt Chọn Lọc',
    description: 'Từ vựng SAT & IELTS nâng cao kèm dịch nghĩa tiếng Việt, phiên âm IPA và câu ví dụ học thuật.',
    file_path: '/sat/vi-en-ielts.json',
    is_public: true,
    tags: ['Tiếng Việt', 'IELTS 7.5+', 'SAT'],
    author_name: 'AnanQuiz Biên Soạn',
  },
  {
    id: 'preset_sat_1',
    name: 'SAT Vocabulary - Set 1 Core',
    description: 'Core SAT vocabulary words with definitions, synonyms, simple and advanced examples.',
    file_path: '/sat/1.json',
    is_public: true,
    tags: ['SAT Core', 'English'],
    author_name: 'OpenQuiz Original',
  },
  {
    id: 'preset_sat_2',
    name: 'SAT Vocabulary - Set 2 Advanced',
    description: 'Extensive advanced vocabulary set designed for competitive SAT test takers.',
    file_path: '/sat/2.json',
    is_public: true,
    tags: ['SAT Advanced', 'English'],
    author_name: 'OpenQuiz Original',
  },
  {
    id: 'preset_sat_archaic',
    name: 'Archaic & Classical Literature',
    description: 'Specialized collection of historical, formal, and classical literary words frequently tested in SAT reading passages.',
    file_path: '/sat/archaic.json',
    is_public: true,
    tags: ['Literature', 'Archaic'],
    author_name: 'OpenQuiz Original',
  },
];

export default function QuizzesPage() {
  const router = useRouter();
  const { selectedQuizPath, setSelectedQuizPath, activeCustomQuiz, setActiveCustomQuiz } = useQuizStore();
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setCustomQuizzes(StorageEngine.getCustomQuizzes());
  }, []);

  const handleSelectPreset = (path: string) => {
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
  };

  const handleSelectCustom = (quiz: CustomQuiz) => {
    setActiveCustomQuiz(quiz);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xoá bộ đề này?')) {
      StorageEngine.deleteCustomQuiz(id);
      setCustomQuizzes(StorageEngine.getCustomQuizzes());
      if (activeCustomQuiz?.id === id) {
        setActiveCustomQuiz(null);
      }
    }
  };

  const handleShare = (quizName: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin;
    navigator.clipboard.writeText(`${url} - Học bộ từ: ${quizName}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-fade-in">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-500" />
            Thư Viện Bộ Đề & Tạo Bằng AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Chọn bộ đề để học hoặc nhập prompt từ ChatGPT / Claude / Gemini để tạo bộ trắc nghiệm tức thì.
          </p>
        </div>

        <button
          onClick={() => setIsAIModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold shadow-glow hover:opacity-95 active:scale-95 transition-all"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>Tạo Bộ Đề Bằng AI</span>
        </button>
      </div>

      {/* Preset Sets Section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" /> Bộ Đề Tiêu Chuẩn (Official Sets)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_QUIZZES.map((preset) => {
            const isSelected =
              !activeCustomQuiz && selectedQuizPath === preset.file_path;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset.file_path)}
                className={`p-6 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500/80 shadow-glow'
                    : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {preset.tags?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5" /> Đang Học
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {preset.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {preset.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400">
                    Tác giả: {preset.author_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleShare(preset.name, preset.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                      title="Chia sẻ bộ đề"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPreset(preset.file_path);
                        router.push('/session/learn');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Học ngay
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Custom Quizzes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" /> Bộ Đề Tự Tạo & AI ({customQuizzes.length})
          </h2>
        </div>

        {customQuizzes.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white dark:bg-[#0F172A] border border-dashed border-slate-300 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 mx-auto flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-slate-900 dark:text-white font-bold mb-1">
              Chưa có bộ đề tự tạo nào
            </p>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
              Hãy dùng nút &quot;Tạo Bộ Đề Bằng AI&quot; để tạo một bài trắc nghiệm từ vựng mới theo chủ đề bất kỳ!
            </p>
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
            >
              Tạo bộ đề đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customQuizzes.map((quiz) => {
              const isSelected = activeCustomQuiz?.id === quiz.id;
              return (
                <div
                  key={quiz.id}
                  onClick={() => handleSelectCustom(quiz)}
                  className={`p-6 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500/80 shadow-glow-purple'
                      : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        {quiz.words.length} Từ Vựng
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2.5 py-1 rounded-full">
                          <Check className="w-3.5 h-3.5" /> Đang Học
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {quiz.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {quiz.description || 'Bộ đề do người dùng tự tạo qua JSON AI.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                    <span className="text-[11px] text-slate-400">
                      Tác giả: {quiz.author_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteCustom(quiz.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                        title="Xoá bộ đề này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCustom(quiz);
                          router.push('/session/learn');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Học ngay
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Prompt Modal */}
      <AIPromptModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onQuizCreated={(quiz) => {
          setCustomQuizzes(StorageEngine.getCustomQuizzes());
          setActiveCustomQuiz(quiz);
        }}
      />
    </div>
  );
}
