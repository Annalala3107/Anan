'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomQuiz, CustomSubject, Word } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { QUESTION_BANKS } from '@/lib/defaultBanks';
import { cleanOptionText, isAnswerMatch, getQuestionAnswerMeta } from '@/lib/utils';
import {
  X,
  Pencil,
  Plus,
  Trash2,
  Download,
  FileText,
  Search,
  CheckCircle2,
  Save,
  ListChecks,
} from 'lucide-react';

interface CustomQuizEditorModalProps {
  isOpen: boolean;
  quiz: CustomQuiz | null;
  customSubjects?: CustomSubject[];
  onClose: () => void;
  onSaved: (updated: CustomQuiz) => void;
}

function getMatchedOptionIndices(q: Word): number[] {
  const opts = q.options || [];
  const hasKey = Boolean((q.answer || '').trim() || (q.correctWord || '').trim());
  if (!hasKey) return [];
  const meta = getQuestionAnswerMeta(q.correctWord, q.answer, opts);
  const indices: number[] = [];
  opts.forEach((opt, i) => {
    if (isAnswerMatch(opt, q.correctWord, q.answer, meta.correctChoices)) {
      indices.push(i);
    }
  });
  return indices;
}

function isQuestionMultiMode(q: Word, override?: boolean): boolean {
  if (override !== undefined) return override;
  return getQuestionAnswerMeta(q.correctWord, q.answer, q.options).isMultiSelect;
}

function createEmptyQuestion(): Word {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    word: 'Câu hỏi mới',
    question: '',
    options: ['', '', '', ''],
    answer: 'A',
    correctWord: '',
    explanation: '',
  };
}

export default function CustomQuizEditorModal({
  isOpen,
  quiz,
  customSubjects = [],
  onClose,
  onSaved,
}: CustomQuizEditorModalProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Khác');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Word[]>([]);
  const [multiSelectMap, setMultiSelectMap] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !quiz) return;
    setName(quiz.name || '');
    setSubject(quiz.subject || 'Khác');
    setTopic(quiz.topic || '');
    setDescription(quiz.description || '');
    setQuestions(
      (quiz.words || []).map((w, idx) => ({
        ...w,
        id: w.id ?? `item_${idx}_${Date.now()}`,
        options: Array.isArray(w.options) && w.options.length >= 2 ? [...w.options] : ['', '', '', ''],
      }))
    );
    setMultiSelectMap({});
    setSearchTerm('');
    setErrorMsg(null);
  }, [isOpen, quiz]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredQuestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return questions
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!q) return true;
        const haystack = [
          item.question || item.word || '',
          ...(item.options || []),
          item.explanation || '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [questions, searchTerm]);

  if (!isOpen || !quiz || !mounted) return null;

  const handleUpdateStem = (idx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, question: value, word: value || q.word } : q))
    );
  };

  const handleUpdateExplanation = (idx: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, explanation: value } : q)));
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const matchedIndices = getMatchedOptionIndices(q);
        const nextOpts = [...(q.options || [])];
        nextOpts[optIdx] = value;

        if (!matchedIndices.includes(optIdx)) {
          return { ...q, options: nextOpts };
        }

        const nextAnswer = matchedIndices.map((idx) => String.fromCharCode(65 + idx)).join(', ');
        const nextCorrectWord = matchedIndices
          .map((idx) => cleanOptionText(nextOpts[idx]) || nextOpts[idx])
          .filter(Boolean)
          .join(' | ');

        return {
          ...q,
          options: nextOpts,
          answer: nextAnswer,
          correctWord: nextCorrectWord,
        };
      })
    );
  };

  const handleToggleMultiMode = (qIdx: number) => {
    const targetQ = questions[qIdx];
    if (!targetQ) return;
    const key = String(targetQ.id ?? qIdx);
    setMultiSelectMap((prev) => ({
      ...prev,
      [key]: !isQuestionMultiMode(targetQ, prev[key]),
    }));
  };

  const handleSelectCorrectOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const key = String(q.id ?? qIdx);
        const multi = isQuestionMultiMode(q, multiSelectMap[key]);
        const opts = q.options || [];

        if (!multi) {
          const letter = String.fromCharCode(65 + optIdx);
          const targetOpt = opts[optIdx] || '';
          return {
            ...q,
            answer: letter,
            correctWord: cleanOptionText(targetOpt),
          };
        }

        const current = new Set(getMatchedOptionIndices(q));
        if (current.has(optIdx)) {
          current.delete(optIdx);
        } else {
          current.add(optIdx);
        }
        const sorted = Array.from(current).sort((a, b) => a - b);
        const nextAnswer = sorted.map((idx) => String.fromCharCode(65 + idx)).join(', ');
        const nextCorrectWord = sorted
          .map((idx) => cleanOptionText(opts[idx] || '') || (opts[idx] || ''))
          .filter(Boolean)
          .join(' | ');

        return {
          ...q,
          answer: nextAnswer,
          correctWord: nextCorrectWord,
        };
      })
    );
  };

  const handleRemoveQuestion = (qIdx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== qIdx));
  };

  const handleAddQuestion = () => {
    setSearchTerm('');
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };

  const buildCleanedQuestions = (): Word[] | null => {
    if (!name.trim()) {
      setErrorMsg('Tên bộ đề không được để trống.');
      return null;
    }
    if (questions.length === 0) {
      setErrorMsg('Bộ đề cần có ít nhất 1 câu hỏi.');
      return null;
    }

    const cleaned: Word[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const stem = (q.question || q.word || '').trim();
      const validOpts = (q.options || []).map((o) => o.trim()).filter(Boolean);

      if (!stem) {
        setErrorMsg(`Câu ${i + 1} đang bị trống nội dung câu hỏi.`);
        return null;
      }
      if (validOpts.length < 2) {
        setErrorMsg(`Câu ${i + 1} cần ít nhất 2 lựa chọn đáp án.`);
        return null;
      }

      let resolvedAnswer = (q.answer || '').trim().toUpperCase();
      let resolvedCorrectWord = (q.correctWord || '').trim();
      const hasRawKey = Boolean(resolvedAnswer || resolvedCorrectWord);

      if (!hasRawKey) {
        resolvedAnswer = '';
        resolvedCorrectWord = '';
      } else {
        const meta = getQuestionAnswerMeta(resolvedCorrectWord, resolvedAnswer, validOpts);
        const matchedIndices: number[] = [];
        validOpts.forEach((o, idx) => {
          if (isAnswerMatch(o, resolvedCorrectWord, resolvedAnswer, meta.correctChoices)) {
            matchedIndices.push(idx);
          }
        });

        if (matchedIndices.length > 0) {
          resolvedAnswer = matchedIndices.map((idx) => String.fromCharCode(65 + idx)).join(', ');
          resolvedCorrectWord = matchedIndices
            .map((idx) => cleanOptionText(validOpts[idx]) || validOpts[idx])
            .join(' | ');
        } else {
          resolvedAnswer = 'A';
          resolvedCorrectWord = cleanOptionText(validOpts[0]);
        }
      }

      cleaned.push({
        ...q,
        word: stem,
        question: stem,
        options: validOpts,
        answer: resolvedAnswer,
        correctWord: resolvedCorrectWord,
        explanation: (q.explanation || '').trim() || undefined,
        subject: subject.trim() || q.subject,
        topic: topic.trim() || q.topic,
      });
    }

    setErrorMsg(null);
    return cleaned;
  };

  const handleSave = () => {
    const cleanedWords = buildCleanedQuestions();
    if (!cleanedWords) return;

    const updated = StorageEngine.updateCustomQuiz(quiz.id, {
      name: name.trim(),
      subject: subject.trim() || 'Khác',
      topic: topic.trim() || undefined,
      description: description.trim() || undefined,
      words: cleanedWords,
    });

    if (updated) {
      onSaved(updated);
      onClose();
    } else {
      setErrorMsg('Không tìm thấy bộ đề để cập nhật.');
    }
  };

  const triggerDownload = (content: string, mime: string, ext: 'json' | 'txt') => {
    const safeName = (name.trim() || 'ananquiz_custom')
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u1EF9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName || 'AnanQuiz_Deck'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const cleanedWords = buildCleanedQuestions() || questions;
    const payload: CustomQuiz = {
      ...quiz,
      name: name.trim() || quiz.name,
      subject: subject.trim() || quiz.subject,
      topic: topic.trim() || quiz.topic,
      description: description.trim() || quiz.description,
      words: cleanedWords,
    };
    triggerDownload(JSON.stringify(payload, null, 2), 'application/json', 'json');
  };

  const handleExportTxt = () => {
    const cleanedWords = buildCleanedQuestions() || questions;
    const blocks = cleanedWords.map((w, idx) => {
      const stem = (w.question || w.word || '').trim();
      const opts = (w.options || []).map(
        (opt, oIdx) => `${String.fromCharCode(65 + oIdx)}. ${cleanOptionText(opt)}`
      );
      const ans = w.answer ? `Đáp án: ${w.answer}` : '';
      const exp = w.explanation ? `Giải thích: ${w.explanation}` : '';
      return [`Câu ${idx + 1}: ${stem}`, ...opts, ans, exp].filter(Boolean).join('\n');
    });
    triggerDownload(blocks.join('\n\n'), 'text/plain;charset=utf-8', 'txt');
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                Trình Chỉnh Sửa &amp; Xuất Bộ Đề
              </span>
              <h2
                id={titleId}
                className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate mt-0.5"
              >
                {name || quiz.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportTxt}
              title="Xuất file văn bản .txt chuẩn"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Xuất .TXT</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              title="Xuất file sao lưu .json"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Xuất .JSON</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trình chỉnh sửa"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                Tên bộ đề
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                Môn học
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {QUESTION_BANKS.map((sec) => (
                  <option key={sec.id} value={sec.subjectCode}>
                    {sec.subjectCode}
                  </option>
                ))}
                {customSubjects.map((cs) => (
                  <option key={cs.id} value={cs.subjectCode}>
                    {cs.subjectCode} — {cs.title}
                  </option>
                ))}
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                Chuyên đề
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Ôn tập tổng hợp"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                Mô tả ngắn
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú về bộ đề này..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Search & Add Question Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Tìm trong ${questions.length} câu hỏi...`}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>➕ Thêm câu hỏi mới</span>
            </button>
          </div>

          {/* Question Cards */}
          <div className="space-y-4">
            {filteredQuestions.map(({ item: q, idx }) => {
              const qKey = String(q.id ?? idx);
              const isMulti = isQuestionMultiMode(q, multiSelectMap[qKey]);
              const matchedIndices = getMatchedOptionIndices(q);
              const hasRawKey = Boolean((q.answer || '').trim() || (q.correctWord || '').trim());

              return (
              <div
                key={q.id ?? idx}
                className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                      Câu {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleMultiMode(idx)}
                      title="Chuyển giữa 1 đáp án đúng và nhiều đáp án đúng"
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        isMulti
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-300'
                      }`}
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      <span>{isMulti ? 'Nhiều đáp án' : '1 đáp án'}</span>
                    </button>
                    {!hasRawKey && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Chưa có đáp án
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(idx)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa câu</span>
                  </button>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={q.question ?? q.word ?? ''}
                    onChange={(e) => handleUpdateStem(idx, e.target.value)}
                    placeholder="Nội dung câu hỏi..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(q.options || []).map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isTrue = matchedIndices.includes(optIdx);
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-1.5 rounded-xl border transition-colors ${
                          isTrue
                            ? 'bg-emerald-500/10 border-emerald-500/50'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCorrectOption(idx, optIdx)}
                          title={isMulti ? `Bật/tắt ${letter} là đáp án đúng` : `Đặt ${letter} là đáp án đúng`}
                          className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isTrue
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-500/20'
                          }`}
                        >
                          {isTrue ? <CheckCircle2 className="w-4 h-4" /> : letter}
                        </button>
                        <input
                          type="text"
                          value={cleanOptionText(opt) || opt}
                          onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                          placeholder={`Lựa chọn ${letter}...`}
                          className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none pr-1"
                        />
                      </div>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) => handleUpdateExplanation(idx, e.target.value)}
                  placeholder="Giải thích đáp án (tùy chọn)..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                Không tìm thấy câu hỏi nào khớp từ khóa.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-[#0B1120] border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
          {errorMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={handleExportTxt}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Xuất .TXT
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Xuất .JSON
              </button>
            </div>

            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
              Tổng cộng: <strong className="text-indigo-500 font-mono">{questions.length}</strong> câu hỏi (bấm chữ cái A/B/C/D để chọn đáp án đúng)
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-glow cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
