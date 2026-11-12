'use client';

import { useState, useEffect } from 'react';
import { Word, CustomQuiz, CustomSubject } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import {
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Zap,
  Layers,
  Key,
  Copy,
  Check,
  ChevronRight,
  Loader2,
  FileCode,
} from 'lucide-react';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: CustomQuiz) => void;
  defaultSubject?: string;
}

const QUICK_TOPICS = [
  { label: 'Cache Mapping, Hamming ECC & RAID 0-5', subject: 'CEA201', count: 10, difficulty: 'medium' },
  { label: 'Con trỏ & Mảng 2 chiều', subject: 'PRF192', count: 10, difficulty: 'hard' },
  { label: 'Hệ thống số & Biểu diễn Bù 2', subject: 'CSI106', count: 10, difficulty: 'medium' },
  { label: 'Kiến trúc Von Neumann & CPU Cache', subject: 'CSI106', count: 10, difficulty: 'medium' },
  { label: 'Cú pháp C & Toán tử Bitwise', subject: 'PRF192', count: 10, difficulty: 'hard' },
  { label: 'Kỹ năng mục tiêu SMART & Quản lý thời gian', subject: 'SSA101', count: 10, difficulty: 'medium' },
];

export default function AIPromptModal({
  isOpen,
  onClose,
  onQuizCreated,
  defaultSubject,
}: AIPromptModalProps) {
  const [activeTab, setActiveTab] = useState<'direct_ai' | 'manual_json'>('direct_ai');
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('PRF192');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [userApiKey, setUserApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual JSON Tab States
  const [manualTitle, setManualTitle] = useState('');
  const [manualJson, setManualJson] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_custom_api_key');
    if (savedKey) setUserApiKey(savedKey);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const subs = StorageEngine.getCustomSubjects();
      setCustomSubjects(subs);
      if (defaultSubject) {
        setSubject(defaultSubject);
      }
    }
  }, [isOpen, defaultSubject]);

  // Support pressing Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveUserKey = (val: string) => {
    setUserApiKey(val);
    localStorage.setItem('gemini_custom_api_key', val.trim());
  };

  const handleGenerateAI = async () => {
    if (!prompt.trim()) {
      setError('Vui lòng nhập chủ đề hoặc nội dung cần AI ra đề.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          subject: subject.trim(),
          count,
          difficulty,
          userApiKey: userApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi yêu cầu Gemini AI tạo câu hỏi.');
      }

      // Save directly to StorageEngine
      const newQuiz = StorageEngine.saveCustomQuiz({
        name: data.title || `${subject} — ${prompt} (${data.words.length} câu)`,
        description: `Tự động sinh bởi Gemini Flash AI (${new Date().toLocaleDateString('vi-VN')})`,
        words: data.words,
        is_public: true,
        author_name: 'Gemini AI',
        subject: data.subject,
        topic: data.topic,
      });

      onQuizCreated(newQuiz);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi tạo đề bằng AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSave = () => {
    if (!manualTitle.trim()) {
      setError('Vui lòng nhập tên bộ đề.');
      return;
    }

    try {
      let cleaned = manualJson.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '');
      if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError('Dữ liệu JSON phải là một mảng (Array) chứa các câu hỏi.');
        return;
      }

      const validatedWords: Word[] = parsed.map((item: any, idx: number) => ({
        id: `manual_ai_${Date.now()}_${idx + 1}`,
        word: item.question || item.word || `Câu ${idx + 1}`,
        question: item.question || item.word,
        options: Array.isArray(item.options) ? item.options : [],
        answer: item.answer ? String(item.answer).toUpperCase() : 'A',
        correctWord: item.correctWord || (item.options ? item.options[0] : undefined),
        explanation: item.explanation || undefined,
        subject: item.subject || subject,
        topic: item.topic || 'Tổng hợp',
      }));

      const newQuiz = StorageEngine.saveCustomQuiz({
        name: manualTitle.trim(),
        description: `Nhập từ JSON thủ công (${validatedWords.length} câu)`,
        words: validatedWords,
        is_public: true,
        author_name: 'Học viên (Bạn)',
        subject,
      });

      onQuizCreated(newQuiz);
      onClose();
    } catch (e: any) {
      setError(`Lỗi định dạng JSON: ${e.message}`);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-glow">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  ⚡ Gemini Flash AI
                </span>
                <span className="text-xs text-slate-400">Sinh đề thi tự động</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                Tạo Bộ Đề Bằng Trí Tuệ Nhân Tạo
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Đóng cửa sổ"
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('direct_ai');
              setError(null);
            }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'direct_ai'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Gemini AI (Tự động)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('manual_json');
              setError(null);
            }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'manual_json'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Dán JSON Thủ Công</span>
          </button>
        </div>

        {/* TAB 1: 1-CLICK GEMINI AI */}
        {activeTab === 'direct_ai' && (
          <div className="space-y-4 pt-4">
            {/* Quick Topic Chips */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Chủ đề gợi ý phổ biến:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(t.label);
                      setSubject(t.subject);
                      setCount(t.count);
                      setDifficulty(t.difficulty as any);
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium border border-slate-200 dark:border-slate-700"
                  >
                    {t.label} ({t.subject})
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Chủ đề hoặc nội dung cần ra đề:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Ví dụ: 10 câu trắc nghiệm khó về cấp phát bộ nhớ động malloc(), free() và con trỏ cấp 2 trong ngôn ngữ C..."
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Config selectors: Subject, Count, Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Môn học:
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <optgroup label="Môn cơ bản mặc định">
                    <option value="CEA201">CEA201 (Tổ chức & Kiến trúc MT)</option>
                    <option value="PRF192">PRF192 (Lập trình C)</option>
                    <option value="CSI106">CSI106 (Kiến trúc MT)</option>
                    <option value="SSA101">SSA101 (Kỹ năng ĐH)</option>
                  </optgroup>
                  {customSubjects.length > 0 && (
                    <optgroup label="Môn học của bạn">
                      {customSubjects.map((cs) => (
                        <option key={cs.id} value={cs.subjectCode}>
                          {cs.subjectCode} — {cs.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Khác">
                    <option value="Khác">Môn khác</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Số lượng câu:
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5}>5 câu (Nhanh ⚡)</option>
                  <option value={10}>10 câu (Chuẩn ⭐)</option>
                  <option value={15}>15 câu (Mở rộng)</option>
                  <option value={20}>20 câu (Toàn diện)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Mức độ khó:
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="easy">Cơ bản / Nhận biết</option>
                  <option value="medium">Vừa phải / Thông hiểu</option>
                  <option value="hard">Khó / Bẫy logic</option>
                </select>
              </div>
            </div>

            {/* Optional Custom API Key accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[11px] font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                <span>{showKeyInput ? 'Ẩn cài đặt API Key' : 'Tùy chỉnh API Key cá nhân (nếu muốn)'}</span>
              </button>
              {showKeyInput && (
                <div className="mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <p className="text-[11px] text-slate-400">
                    Nếu bạn đã thêm <code>GEMINI_API_KEY</code> trên Vercel, bạn <strong>không cần</strong> nhập vào đây.
                  </p>
                  <input
                    type="password"
                    placeholder="AQ.Ab8RN... hoặc AIzaSy..."
                    value={userApiKey}
                    onChange={(e) => handleSaveUserKey(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGenerateAI}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-sm shadow-glow flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gemini AI đang biên soạn {count} câu hỏi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span>Tạo & Lưu Bộ Đề Ngay Lập Tức</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL JSON */}
        {activeTab === 'manual_json' && (
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Tên bộ đề:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Ôn thi PRF192 - Con trỏ nâng cao"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Dán mã JSON mảng câu hỏi:
              </label>
              <textarea
                rows={6}
                placeholder='[ { "question": "...", "options": ["A. ...", "B. ..."], "answer": "A" } ]'
                value={manualJson}
                onChange={(e) => setManualJson(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleManualSave}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-glow transition-all"
            >
              Lưu Bộ Đề Vào Máy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
