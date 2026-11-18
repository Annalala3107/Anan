'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Word, CustomQuiz, CustomSubject } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { useQuizStore } from '@/lib/quizStore';
import { QUESTION_BANKS } from '@/lib/defaultBanks';
import { isAnswerMatch, cleanOptionText, resolveCorrectOptionFromAnswer } from '@/lib/utils';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import OptionContent from '@/components/OptionContent';
import {
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Zap,
  Key,
  ChevronLeft,
  Trash2,
  Loader2,
  FileCode,
  Eye,
  Upload,
  Pencil,
  Check,
  Play,
} from 'lucide-react';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: CustomQuiz) => void;
  defaultSubject?: string;
}

interface PreviewDraft {
  title: string;
  subject: string;
  topic: string;
  words: Word[];
}

const QUICK_TOPICS = [
  { label: 'Cache Mapping, Hamming ECC & RAID 0-5', subject: 'CEA201', count: 10, difficulty: 'medium' },
  { label: 'Con trỏ & Mảng 2 chiều', subject: 'PRF192', count: 10, difficulty: 'hard' },
  { label: 'List, Dictionary & File I/O trong Python', subject: 'PFP191', count: 10, difficulty: 'medium' },
  { label: 'Hệ thống số & Biểu diễn Bù 2', subject: 'CSI106', count: 10, difficulty: 'medium' },
  { label: 'Cú pháp C & Toán tử Bitwise', subject: 'PRF192', count: 10, difficulty: 'hard' },
  { label: 'Kỹ năng mục tiêu SMART & Quản lý thời gian', subject: 'SSA101', count: 10, difficulty: 'medium' },
];

export default function AIPromptModal({
  isOpen,
  onClose,
  onQuizCreated,
  defaultSubject,
}: AIPromptModalProps) {
  const router = useRouter();
  const { setActiveCustomQuiz } = useQuizStore();
  const lectureFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'direct_ai' | 'manual_json'>('direct_ai');
  const [promptMode, setPromptMode] = useState<'topic' | 'document'>('topic');
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('PRF192');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [userApiKey, setUserApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);
  const [previewDraft, setPreviewDraft] = useState<PreviewDraft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [lectureNotice, setLectureNotice] = useState<string | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual JSON Tab States
  const [manualTitle, setManualTitle] = useState('');
  const [manualJson, setManualJson] = useState('');

  useEffect(() => {
    try {
      // Remove any legacy persistent key left in localStorage from older versions
      if (localStorage.getItem('gemini_custom_api_key') !== null) {
        localStorage.removeItem('gemini_custom_api_key');
      }
      const savedSessionKey = sessionStorage.getItem('gemini_custom_api_key');
      if (savedSessionKey) setUserApiKey(savedSessionKey);
    } catch {
      // Ignore storage access errors in private mode
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const subs = StorageEngine.getCustomSubjects();
      setCustomSubjects(subs);
      setPreviewDraft(null);
      setEditingIndex(null);
      setLectureNotice(null);
      setError(null);
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
    const cleaned = val.trim();
    try {
      localStorage.removeItem('gemini_custom_api_key');
      if (cleaned) {
        sessionStorage.setItem('gemini_custom_api_key', cleaned);
      } else {
        sessionStorage.removeItem('gemini_custom_api_key');
      }
    } catch {
      // Ignore storage access errors
    }
  };

  const handleClearUserKey = () => {
    setUserApiKey('');
    try {
      sessionStorage.removeItem('gemini_custom_api_key');
      localStorage.removeItem('gemini_custom_api_key');
    } catch {
      // Ignore storage access errors
    }
  };

  const handleGenerateAI = async () => {
    if (!prompt.trim()) {
      setError('Vui lòng nhập chủ đề hoặc nội dung cần AI ra đề.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userApiKey.trim()) {
        headers['x-goog-api-key'] = userApiKey.trim();
      }

      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: prompt.trim(),
          subject: subject.trim(),
          count,
          difficulty,
        }),
      });

      const rawText = await res.text();
      let data: {
        success?: boolean;
        error?: string;
        title?: string;
        subject?: string;
        topic?: string;
        words?: Word[];
      } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi yêu cầu Gemini AI tạo câu hỏi.');
      }

      // Open interactive Preview step before saving
      const compactTopic =
        prompt.trim().length > 70 ? `${prompt.trim().slice(0, 70)}...` : prompt.trim();
      setEditingIndex(null);
      setPreviewDraft({
        title:
          data.title ||
          `${subject} — ${
            promptMode === 'document' ? 'Trắc nghiệm từ bài giảng' : compactTopic
          } (${(data.words || []).length} câu)`,
        subject: data.subject || subject.trim(),
        topic: data.topic || compactTopic,
        words: data.words || [],
      });
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi tạo đề bằng AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadLectureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setLectureNotice(null);

    try {
      const raw = (await file.text()).replace(/^\uFEFF/, '');
      const trimmed = raw.slice(0, 24000);
      setPromptMode('document');
      setPrompt(trimmed);
      if (raw.length > 24000) {
        setLectureNotice(
          `📂 Đã nạp "${file.name}" (cắt gọn từ ${raw.length.toLocaleString()} xuống 24.000 ký tự tối đa).`
        );
      } else {
        setLectureNotice(
          `📂 Đã nạp "${file.name}" (${trimmed.length.toLocaleString()} ký tự).`
        );
      }
    } catch {
      setError('Không thể đọc file bài giảng. Vui lòng chọn file .txt hoặc .md.');
    }
  };

  const handleConfirmSavePreview = (launchExam = false) => {
    if (!previewDraft || previewDraft.words.length === 0) {
      setError('Không có câu hỏi nào để lưu.');
      return;
    }

    const newQuiz = StorageEngine.saveCustomQuiz({
      name: previewDraft.title.trim() || `${previewDraft.subject} (${previewDraft.words.length} câu)`,
      description: `Tự động sinh bởi Gemini Flash AI (${new Date().toLocaleDateString('vi-VN')})`,
      words: previewDraft.words,
      is_public: true,
      author_name: 'Gemini AI',
      subject: previewDraft.subject,
      topic: previewDraft.topic,
    });

    setPreviewDraft(null);
    setEditingIndex(null);
    onQuizCreated(newQuiz);
    onClose();

    if (launchExam) {
      setActiveCustomQuiz(newQuiz);
      router.push('/session/exam');
    }
  };

  const handleRemovePreviewQuestion = (index: number) => {
    setPreviewDraft((prev) => {
      if (!prev) return null;
      const nextWords = prev.words.filter((_, i) => i !== index);
      return { ...prev, words: nextWords };
    });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleSelectPreviewOption = (qIndex: number, optIndex: number, optText: string) => {
    const letter = String.fromCharCode(65 + optIndex);
    const cleaned = cleanOptionText(optText);
    setPreviewDraft((prev) => {
      if (!prev) return null;
      const nextWords = prev.words.map((w, idx) =>
        idx === qIndex
          ? {
              ...w,
              answer: letter,
              correctWord: cleaned,
            }
          : w
      );
      return { ...prev, words: nextWords };
    });
  };

  const handleUpdatePreviewField = (
    qIndex: number,
    field: 'question' | 'explanation',
    value: string
  ) => {
    setPreviewDraft((prev) => {
      if (!prev) return null;
      const nextWords = prev.words.map((w, idx) =>
        idx === qIndex
          ? {
              ...w,
              [field]: value,
            }
          : w
      );
      return { ...prev, words: nextWords };
    });
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

      const validatedWords: Word[] = parsed.map((item: any, idx: number) => {
        const itemOptions = Array.isArray(item.options) ? item.options : [];
        const itemAnswer = item.answer ? String(item.answer).toUpperCase() : 'A';
        const itemCorrect = resolveCorrectOptionFromAnswer(itemAnswer, itemOptions, item.correctWord);
        return {
          id: `manual_ai_${Date.now()}_${idx + 1}`,
          word: item.question || item.word || `Câu ${idx + 1}`,
          question: item.question || item.word,
          options: itemOptions,
          answer: itemAnswer,
          correctWord: itemCorrect,
          explanation: item.explanation || undefined,
          subject: item.subject || subject,
          topic: item.topic || 'Tổng hợp',
        };
      });

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

  const renderSubjectSelectOptions = () => (
    <>
      <optgroup label="Môn mặc định trong hệ thống">
        {QUESTION_BANKS.map((sec) => (
          <option key={sec.id} value={sec.subjectCode}>
            {sec.subjectCode}
            {sec.title !== sec.subjectCode
              ? ` (${sec.title.replace(/\s*\([^)]+\)$/, '')})`
              : ' (Python Fundamentals)'}
          </option>
        ))}
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
    </>
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer"
    >
      <div
        role="dialog"
        aria-modal="true"
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
                <span className="text-xs text-slate-400">
                  {previewDraft ? 'Xem trước câu hỏi trước khi lưu' : 'Sinh đề thi tự động'}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {previewDraft
                  ? `Kiểm Tra Đề AI (${previewDraft.words.length} Câu)`
                  : 'Tạo Bộ Đề Bằng Trí Tuệ Nhân Tạo'}
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

        {/* Tab switchers (hidden during preview step) */}
        {!previewDraft && (
          <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('direct_ai');
                setError(null);
              }}
              className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'direct_ai'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>1-Click Gemini AI (Tự động)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('manual_json');
                setError(null);
              }}
              className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'manual_json'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Dán JSON Thủ Công</span>
            </button>
          </div>
        )}

        {/* TAB 1 STEP B: PREVIEW GENERATED QUESTIONS */}
        {activeTab === 'direct_ai' && previewDraft && (
          <div className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Eye className="w-4 h-4 shrink-0" />
                <span>
                  Gemini AI đã tạo {previewDraft.words.length} câu hỏi môn {previewDraft.subject}. Hãy rà soát trước khi lưu!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDraft(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sửa prompt & tạo lại</span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Tên bộ đề lưu vào kho:
              </label>
              <input
                type="text"
                value={previewDraft.title}
                onChange={(e) =>
                  setPreviewDraft((prev) => (prev ? { ...prev, title: e.target.value } : null))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1">
              {previewDraft.words.map((q, idx) => {
                const isEditing = editingIndex === idx;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                          Câu {idx + 1}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (Bấm vào đáp án để đổi đáp án đúng)
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(isEditing ? null : idx)}
                          title="Chỉnh sửa câu hỏi hoặc giải thích"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        >
                          {isEditing ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Xong</span>
                            </>
                          ) : (
                            <>
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePreviewQuestion(idx)}
                          title="Loại bỏ câu này"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={q.question || q.word}
                          onChange={(e) => handleUpdatePreviewField(idx, 'question', e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-400/60 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <textarea
                          rows={2}
                          placeholder="Giải thích đáp án..."
                          value={q.explanation || ''}
                          onChange={(e) =>
                            handleUpdatePreviewField(idx, 'explanation', e.target.value)
                          }
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      <CodeQuestionRenderer
                        content={q.question || q.word}
                        image={q.image}
                        imageCaption={q.imageCaption}
                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed"
                      />
                    )}

                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {q.options.map((opt, oIdx) => {
                          const isTrue = isAnswerMatch(opt, q.correctWord || q.word, q.answer);
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSelectPreviewOption(idx, oIdx, opt)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs border flex items-start gap-1.5 transition-colors cursor-pointer ${
                                isTrue
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                                  : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400/60'
                              }`}
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                  isTrue ? 'text-emerald-500' : 'opacity-20'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <OptionContent content={opt} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!isEditing && q.explanation && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-200/70 dark:border-slate-800">
                        <strong className="text-indigo-600 dark:text-indigo-400">Giải thích:</strong>{' '}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewDraft(null);
                  setEditingIndex(null);
                }}
                className="sm:w-1/4 py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Quay lại sửa Prompt
              </button>
              <button
                type="button"
                disabled={previewDraft.words.length === 0}
                onClick={() => handleConfirmSavePreview(false)}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-900 dark:bg-slate-700 hover:opacity-90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận Lưu Bộ Đề ({previewDraft.words.length} câu)</span>
              </button>
              <button
                type="button"
                disabled={previewDraft.words.length === 0}
                onClick={() => handleConfirmSavePreview(true)}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>⚡ Lưu &amp; Thi Thử Ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1 STEP A: 1-CLICK GEMINI AI PROMPT */}
        {activeTab === 'direct_ai' && !previewDraft && (
          <div className="space-y-4 pt-4">
            {/* Prompt Mode Switcher + File Lecture Upload */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPromptMode('topic')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    promptMode === 'topic'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Chủ đề ngắn gọn
                </button>
                <button
                  type="button"
                  onClick={() => setPromptMode('document')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    promptMode === 'document'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Dán bài giảng / tài liệu (tới 24.000 ký tự)
                </button>
              </div>

              <input
                ref={lectureFileInputRef}
                type="file"
                accept=".txt,.md"
                onChange={handleUploadLectureFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => lectureFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>📂 Tải file .txt/.md bài giảng</span>
              </button>
            </div>

            {lectureNotice && (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                <span>{lectureNotice}</span>
                <button
                  type="button"
                  onClick={() => setLectureNotice(null)}
                  className="hover:opacity-70 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Topic Chips */}
            {promptMode === 'topic' && (
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
                      className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {t.label} ({t.subject})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {promptMode === 'document'
                    ? 'Nội dung bài giảng / ghi chú / giáo trình (tới 24.000 ký tự):'
                    : 'Chủ đề hoặc nội dung cần ra đề:'}
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {prompt.length.toLocaleString()} / 24.000 ký tự
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 24000))}
                maxLength={24000}
                rows={promptMode === 'document' ? 8 : 3}
                placeholder={
                  promptMode === 'document'
                    ? 'Dán trực tiếp slide bài giảng, chương sách, note Markdown hoặc bấm nút Tải file .txt/.md ở trên...'
                    : 'Ví dụ: 10 câu trắc nghiệm khó về cấp phát bộ nhớ động malloc(), free() và con trỏ cấp 2 trong ngôn ngữ C...'
                }
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
                  {renderSubjectSelectOptions()}
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
                  <option value={25}>25 câu (Chuyên sâu)</option>
                  <option value={30}>30 câu (Đề thi thử)</option>
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
                className="text-[11px] font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3 h-3" />
                <span>{showKeyInput ? 'Ẩn cài đặt API Key' : 'Tùy chỉnh API Key cá nhân (nếu muốn)'}</span>
              </button>
              {showKeyInput && (
                <div className="mt-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300/60 dark:border-amber-700/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Bảo mật API Key:</strong> Key cá nhân tuyệt đối <strong>không</strong> lưu lâu dài ở <code>localStorage</code> (tránh lộ qua XSS/máy công cộng) mà chỉ giữ tạm trong <code>sessionStorage</code> (tự xóa khi đóng tab). Nếu đã đặt <code>GEMINI_API_KEY</code> trên Vercel, hãy để trống ô này.
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="AIzaSy... (tùy chọn, tự xóa khi đóng tab)"
                      value={userApiKey}
                      onChange={(e) => handleSaveUserKey(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                    {userApiKey.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearUserKey}
                        className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                        title="Xóa ngay API Key khỏi sessionStorage"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa Key ngay</span>
                      </button>
                    )}
                  </div>
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
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-sm shadow-glow flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gemini AI đang biên soạn {count} câu hỏi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span>Tạo Đề &amp; Xem Trước Câu Hỏi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL JSON */}
        {activeTab === 'manual_json' && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Tên bộ đề:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ôn thi PRF192 - Con trỏ nâng cao"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Môn học:
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  {renderSubjectSelectOptions()}
                </select>
              </div>
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
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-glow transition-all cursor-pointer"
            >
              Lưu Bộ Đề Vào Máy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
