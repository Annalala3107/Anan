'use client';

import { useState, useMemo, useEffect, useDeferredValue, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  parseRawExamText,
  convertClipboardHtmlToMarkedText,
  ParserFilterOptions,
} from '@/lib/textQuizParser';
import {
  isAnswerMatch,
  cleanOptionText,
  resolveCorrectOptionFromAnswer,
} from '@/lib/utils';
import { StorageEngine } from '@/lib/storage';
import { useQuizStore } from '@/lib/quizStore';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import { CustomQuiz, CustomSubject, Word } from '@/lib/types';
import { QUESTION_BANKS } from '@/lib/defaultBanks';
import {
  X,
  Zap,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sparkles,
  HelpCircle,
  Upload,
  Filter,
  Pencil,
  Trash2,
  Bot,
  Loader2,
  Key,
  Check,
} from 'lucide-react';

interface QuickTextParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: CustomQuiz) => void;
  defaultSubject?: string;
}

interface QuestionOverride {
  deleted?: boolean;
  question?: string;
  explanation?: string;
  answer?: string;
  correctWord?: string;
}

function formatWordsArrayToQuizText(items: any[]): string {
  return items
    .map((item, idx) => {
      const stem = String(item?.question || item?.word || '').trim();
      const opts: string[] = Array.isArray(item?.options)
        ? item.options.map((o: any) => String(o))
        : [];
      if (!stem || opts.length < 2) return null;

      let answerLetter = String(item?.answer || '').trim();
      if (!answerLetter && item?.correctWord) {
        const matchedIdx = opts.findIndex(
          (o) => cleanOptionText(o).toLowerCase() === cleanOptionText(String(item.correctWord)).toLowerCase()
        );
        if (matchedIdx >= 0) {
          answerLetter = String.fromCharCode(65 + matchedIdx);
        }
      }

      const lines = [
        `Câu ${idx + 1}: ${stem}`,
        ...opts.map((o, oIdx) => `${String.fromCharCode(65 + oIdx)}. ${cleanOptionText(o)}`),
      ];
      if (answerLetter) lines.push(`Đáp án: ${answerLetter}`);
      if (item?.explanation) lines.push(`Giải thích: ${String(item.explanation).trim()}`);
      return lines.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function splitCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function tryConvertCsvToQuizText(rawCsv: string): string | null {
  const lines = rawCsv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const first = lines[0];
  const delimiter = first.includes('\t') ? '\t' : first.includes(';') && !first.includes(',') ? ';' : ',';
  const headers = splitCsvRow(first, delimiter).map((h) => h.toLowerCase().trim());

  const qIdx = headers.findIndex((h) => /^(question|câu hỏi|cau hoi|đề bài|prompt|stem)$/.test(h));
  if (qIdx === -1) return null;

  const optIndices = ['a', 'b', 'c', 'd', 'e', 'f']
    .map((letter) =>
      headers.findIndex(
        (h) =>
          h === letter ||
          h === `option_${letter}` ||
          h === `option ${letter}` ||
          h === `đáp án ${letter}` ||
          h === `opt_${letter}`
      )
    )
    .filter((i) => i !== -1);

  if (optIndices.length < 2) return null;
  const ansIdx = headers.findIndex((h) => /^(answer|đáp án|dap an|correct|key|đáp án đúng)$/.test(h));
  const expIdx = headers.findIndex((h) => /^(explanation|giải thích|giai thich|note|ghi chú)$/.test(h));

  const blocks: string[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvRow(lines[r], delimiter);
    const stem = (cols[qIdx] || '').trim();
    const opts = optIndices.map((idx) => (cols[idx] || '').trim()).filter(Boolean);
    if (!stem || opts.length < 2) continue;

    const itemLines = [
      `Câu ${blocks.length + 1}: ${stem}`,
      ...opts.map((o, oIdx) => `${String.fromCharCode(65 + oIdx)}. ${cleanOptionText(o)}`),
    ];
    if (ansIdx !== -1 && cols[ansIdx]?.trim()) {
      itemLines.push(`Đáp án: ${cols[ansIdx].trim()}`);
    }
    if (expIdx !== -1 && cols[expIdx]?.trim()) {
      itemLines.push(`Giải thích: ${cols[expIdx].trim()}`);
    }
    blocks.push(itemLines.join('\n'));
  }

  return blocks.length > 0 ? blocks.join('\n\n') : null;
}

const SAMPLE_TEXT = `Câu 1: ALU trong CPU là viết tắt của cụm từ nào sau đây?
A. Arithmetic Logic Unit
B. Access Level Unit
C. Apple Logic Unit
D. Auto Load Unit
Đáp án: A
Giải thích: ALU là đơn vị số học và logic thực hiện các phép tính nhị phân trong CPU.

Câu 2: Đoạn code C sau đây sẽ in ra màn hình giá trị gì?
#include <stdio.h>
int main() {
    int x = 10;
    printf("%d", x++);
    return 0;
}
*A. 10
B. 11
C. 0
D. Lỗi biên dịch
Giải thích: Toán tử x++ là hậu tố (postfix), giá trị x được in ra trước rồi mới tăng lên 1.

Câu 3: Đâu là dải giá trị của số nguyên có dấu 8-bit biểu diễn bằng số bù 2?
A. 0 đến 255
B. -127 đến +127
C. -128 đến +127
D. -256 đến +255
Đáp án: C
Giải thích: Công thức dải giá trị số bù 2 n-bit là: -2^(n-1) đến 2^(n-1) - 1. Với n=8 thì từ -128 đến 127.`;

export default function QuickTextParserModal({
  isOpen,
  onClose,
  onQuizCreated,
  defaultSubject,
}: QuickTextParserModalProps) {
  const router = useRouter();
  const { setActiveCustomQuiz } = useQuizStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('PRF192');
  const [topic, setTopic] = useState('Tổng hợp');
  const [rawText, setRawText] = useState('');
  const deferredRawText = useDeferredValue(rawText);
  const [activeTab, setActiveTab] = useState<'input' | 'preview'>('input');
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);

  const [filterOptions, setFilterOptions] = useState<ParserFilterOptions>({
    stripLmsNoise: true,
    mergeTrailingAnswerKey: true,
    deduplicate: true,
    unwrapPdfLines: true,
  });

  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [questionOverrides, setQuestionOverrides] = useState<Record<string, QuestionOverride>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // AI Solve unanswered state
  const [isAiSolving, setIsAiSolving] = useState(false);
  const [aiSolveError, setAiSolveError] = useState<string | null>(null);
  const [needsSolveApiKey, setNeedsSolveApiKey] = useState(false);
  const [solveApiKey, setSolveApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const subs = StorageEngine.getCustomSubjects();
      setCustomSubjects(subs);
      if (defaultSubject) {
        setSubject(defaultSubject);
      }
      try {
        const sessionKey = sessionStorage.getItem('gemini_custom_api_key');
        if (sessionKey) setSolveApiKey(sessionKey);
      } catch {
        // Ignore storage errors
      }
    }
  }, [isOpen, defaultSubject]);

  // Reset per-question overrides when source input changes
  useEffect(() => {
    setQuestionOverrides({});
    setEditingKey(null);
    setAiSolveError(null);
  }, [deferredRawText]);

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

  // Real-time parsing engine (deferred for smooth typing on huge dumps)
  const parsedResult = useMemo(() => {
    return parseRawExamText(deferredRawText, subject, topic, filterOptions);
  }, [deferredRawText, subject, topic, filterOptions]);

  // Combine valid + unanswered questions with interactive overrides
  const previewItems = useMemo(() => {
    const combined = [
      ...parsedResult.questions.map((w, idx) => ({
        raw: w,
        key: `${w.id ?? 'v'}_v_${idx}`,
        orderHint: typeof w.id === 'number' ? w.id : idx + 1,
      })),
      ...parsedResult.unansweredQuestions.map((w, idx) => ({
        raw: w,
        key: `${w.id ?? 'u'}_u_${idx}`,
        orderHint: typeof w.id === 'number' ? w.id : 100000 + idx,
      })),
    ].sort((a, b) => a.orderHint - b.orderHint);

    return combined
      .map((entry) => {
        const ov = questionOverrides[entry.key];
        if (ov?.deleted) return null;

        const effectiveQuestion = ov?.question ?? entry.raw.question ?? entry.raw.word;
        const effectiveExplanation = ov?.explanation ?? entry.raw.explanation ?? '';
        const effectiveAnswer = ov?.answer ?? entry.raw.answer ?? '';
        const effectiveCorrectWord = ov?.correctWord ?? entry.raw.correctWord ?? '';
        const hasValidAnswer = Boolean(effectiveAnswer.trim() || effectiveCorrectWord.trim());

        const resolvedWord: Word = {
          ...entry.raw,
          word: effectiveCorrectWord || entry.raw.word || effectiveQuestion,
          question: effectiveQuestion,
          answer: effectiveAnswer,
          correctWord: effectiveCorrectWord || undefined,
          explanation: effectiveExplanation,
        };

        return {
          key: entry.key,
          raw: entry.raw,
          resolvedWord,
          hasValidAnswer,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [parsedResult, questionOverrides]);

  const savableQuestions = useMemo(
    () =>
      previewItems
        .filter((item) => item.hasValidAnswer && item.resolvedWord.options && item.resolvedWord.options.length >= 2)
        .map((item) => item.resolvedWord),
    [previewItems]
  );

  const pendingUnansweredItems = useMemo(
    () => previewItems.filter((item) => !item.hasValidAnswer),
    [previewItems]
  );

  const handleLoadSample = () => {
    setTitle('Đề Thi Thử Mẫu (Parse Tự Động)');
    setSubject('PRF192 & CSI106');
    setTopic('Ôn tập tổng hợp');
    setPasteNotice(null);
    setUploadError(null);
    setRawText(SAMPLE_TEXT);
  };

  const handleToggleFilter = (key: keyof ParserFilterOptions) => {
    setFilterOptions((prev) => ({
      ...prev,
      [key]: prev[key] === false,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setPasteNotice(null);

    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const baseName = file.name.replace(/\.[^.]+$/, '');
      if (!title.trim() && baseName) {
        setTitle(baseName);
      }

      if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
        try {
          const parsedJson = JSON.parse(text);
          const list = Array.isArray(parsedJson)
            ? parsedJson
            : Array.isArray(parsedJson?.words)
            ? parsedJson.words
            : null;
          if (list && list.length > 0) {
            if (parsedJson?.name && !title.trim()) setTitle(String(parsedJson.name));
            if (parsedJson?.subject) setSubject(String(parsedJson.subject));
            if (parsedJson?.topic) setTopic(String(parsedJson.topic));
            const formatted = formatWordsArrayToQuizText(list);
            if (formatted) {
              setRawText(formatted);
              setPasteNotice(`📂 Đã trích xuất ${list.length} câu hỏi từ file JSON.`);
              return;
            }
          }
        } catch {
          // Fall back to raw text parsing
        }
      }

      if (file.name.toLowerCase().endsWith('.csv')) {
        const convertedCsv = tryConvertCsvToQuizText(text);
        if (convertedCsv) {
          setRawText(convertedCsv);
          setPasteNotice('📂 Đã chuyển đổi bảng CSV sang định dạng trắc nghiệm.');
          return;
        }
      }

      setRawText(text);
      setPasteNotice(`📂 Đã tải nội dung từ "${file.name}".`);
    } catch {
      setUploadError('Không thể đọc file này. Vui lòng kiểm tra định dạng (.txt, .md, .csv, .json).');
    }
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData?.getData('text/html');
    if (!html) return;
    const converted = convertClipboardHtmlToMarkedText(html);
    if (!converted || converted.autoMarkedCount === 0) return;

    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart ?? rawText.length;
    const end = target.selectionEnd ?? rawText.length;
    const nextValue = rawText.slice(0, start) + converted.text + rawText.slice(end);
    setRawText(nextValue);
    setPasteNotice(
      `✨ Đã tự động nhận diện ${converted.autoMarkedCount} đáp án in đậm/gạch chân từ tài liệu gốc!`
    );
  };

  const handleSelectOptionAnswer = (itemKey: string, opt: string, optIdx: number) => {
    const letter = String.fromCharCode(65 + optIdx);
    const cleaned = cleanOptionText(opt);
    setQuestionOverrides((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        answer: letter,
        correctWord: cleaned,
      },
    }));
  };

  const handleDeletePreviewItem = (itemKey: string) => {
    setQuestionOverrides((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        deleted: true,
      },
    }));
  };

  const handleAiSolveUnanswered = async () => {
    if (pendingUnansweredItems.length === 0 || isAiSolving) return;

    setIsAiSolving(true);
    setAiSolveError(null);
    setNeedsSolveApiKey(false);

    try {
      let keyToSend = solveApiKey.trim();
      if (!keyToSend) {
        try {
          keyToSend = (sessionStorage.getItem('gemini_custom_api_key') || '').trim();
        } catch {
          // Ignore
        }
      } else {
        try {
          sessionStorage.setItem('gemini_custom_api_key', keyToSend);
        } catch {
          // Ignore
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (keyToSend) {
        headers['x-goog-api-key'] = keyToSend;
      }

      const BATCH_SIZE = 15;
      let solvedTotal = 0;

      for (let offset = 0; offset < pendingUnansweredItems.length; offset += BATCH_SIZE) {
        const batch = pendingUnansweredItems.slice(offset, offset + BATCH_SIZE);
        const res = await fetch('/api/ai/generate-quiz', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode: 'solve',
            subject,
            questions: batch.map((item, idx) => ({
              index: idx,
              question: item.resolvedWord.question || item.resolvedWord.word,
              options: item.resolvedWord.options || [],
            })),
          }),
        });

        const bodyText = await res.text();
        let data: {
          success?: boolean;
          error?: string;
          solutions?: Array<{ index: number; answer: string; explanation: string }>;
        } = {};
        try {
          data = bodyText ? JSON.parse(bodyText) : {};
        } catch {
          data = {};
        }

        if (!res.ok || !data.success || !Array.isArray(data.solutions)) {
          if (res.status === 400 || res.status === 401 || res.status === 403) {
            setNeedsSolveApiKey(true);
          }
          throw new Error(data.error || 'Không thể nhờ AI giải đáp án lúc này.');
        }

        const updates: Record<string, QuestionOverride> = {};
        for (const sol of data.solutions) {
          if (typeof sol.index !== 'number' || sol.index < 0 || sol.index >= batch.length) continue;
          const targetItem = batch[sol.index];
          const ansLetter = String(sol.answer || '').trim().toUpperCase();
          if (!ansLetter) continue;
          const options = targetItem.resolvedWord.options || [];
          const resolvedCorrect =
            resolveCorrectOptionFromAnswer(ansLetter, options, '') || ansLetter;

          updates[targetItem.key] = {
            answer: ansLetter,
            correctWord: resolvedCorrect,
            explanation: sol.explanation?.trim() || targetItem.resolvedWord.explanation || '',
          };
          solvedTotal++;
        }

        setQuestionOverrides((prev) => ({ ...prev, ...updates }));
      }

      if (solvedTotal > 0) {
        setPasteNotice(`🤖 Gemini AI đã giải & điền đáp án cho ${solvedTotal} câu hỏi!`);
      }
    } catch (err: any) {
      setAiSolveError(err.message || 'Lỗi khi nhờ AI giải đáp án.');
    } finally {
      setIsAiSolving(false);
    }
  };

  const handleSaveAndLaunch = (mode: 'exam' | 'drill' | 'just_save') => {
    if (savableQuestions.length === 0) return;

    const quizTitle = title.trim() || `Bộ Đề Tạo Nhanh (${new Date().toLocaleDateString('vi-VN')})`;

    const newQuiz = StorageEngine.saveCustomQuiz({
      name: quizTitle,
      description: `Bộ đề gồm ${savableQuestions.length} câu hỏi được nhập tự động từ văn bản thô. Môn: ${subject}.`,
      words: savableQuestions,
      is_public: true,
      author_name: 'Bạn',
      subject,
      topic,
    });

    onQuizCreated(newQuiz);
    setActiveCustomQuiz(newQuiz);

    onClose();

    if (mode === 'exam') {
      router.push('/session/exam');
    } else if (mode === 'drill') {
      router.push('/session/drill');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  ⚡ Client-Side Parser
                </span>
                <span className="text-xs text-slate-400 font-mono">0.5s xử lý</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Nhập Đề Thần Tốc Từ Văn Bản / Word
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

        {/* Tab Switcher (Mobile & Small screens) */}
        <div className="flex items-center gap-2 px-6 pt-3 shrink-0 lg:hidden border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('input')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'input'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            1. Dán văn bản đề thi
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span>2. Xem trước kết quả</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-[10px]">
              {previewItems.length}
            </span>
          </button>
        </div>

        {/* Modal Body: Split view on Desktop */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Form (lg:col-span-6) */}
          <div
            className={`space-y-4 lg:col-span-6 flex flex-col ${
              activeTab === 'preview' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Metadata Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Tên Bộ Đề Thi
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Đề Ôn Thi Cuối Kỳ PRF192 - Đề 1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Môn học
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <optgroup label="Môn mặc định trong hệ thống">
                      {QUESTION_BANKS.map((sec) => (
                        <option key={sec.id} value={sec.subjectCode}>
                          {sec.subjectCode}
                          {sec.title !== sec.subjectCode
                            ? ` — ${sec.title.replace(/\s*\([^)]+\)$/, '')}`
                            : ' — Python Fundamentals'}
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
                      <option value="Khác">Môn học khác</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Chuyên đề
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ví dụ: Con trỏ & Mảng"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Smart Import Filters */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-500" />
                  Bộ lọc thông minh khi nhập
                </span>
                {(parsedResult.stats.noiseLinesRemoved > 0 ||
                  parsedResult.stats.duplicatesRemoved > 0 ||
                  parsedResult.stats.trailingKeysMerged > 0) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25">
                    {parsedResult.stats.noiseLinesRemoved > 0 &&
                      `Loại ${parsedResult.stats.noiseLinesRemoved} dòng rác`}
                    {parsedResult.stats.trailingKeysMerged > 0 &&
                      `${parsedResult.stats.noiseLinesRemoved > 0 ? ' · ' : ''}Khớp ${parsedResult.stats.trailingKeysMerged} đáp án`}
                    {parsedResult.stats.duplicatesRemoved > 0 &&
                      `${parsedResult.stats.noiseLinesRemoved > 0 || parsedResult.stats.trailingKeysMerged > 0 ? ' · ' : ''}Gộp ${parsedResult.stats.duplicatesRemoved} trùng lặp`}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'stripLmsNoise' as const, label: 'Loại rác LMS / Web' },
                  { key: 'mergeTrailingAnswerKey' as const, label: 'Khớp bảng đáp án cuối trang' },
                  { key: 'deduplicate' as const, label: 'Khử câu trùng' },
                  { key: 'unwrapPdfLines' as const, label: 'Gộp dòng PDF bị ngắt' },
                ].map((chip) => {
                  const enabled = filterOptions[chip.key] !== false;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => handleToggleFilter(chip.key)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        enabled
                          ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/35'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {enabled && <Check className="w-3 h-3" />}
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paste Box Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Dán văn bản (Word / PDF / Web):
              </label>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải file (.txt/.md/.csv/.json)</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dán văn bản mẫu</span>
                </button>
              </div>
            </div>

            {pasteNotice && (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                <span>{pasteNotice}</span>
                <button
                  type="button"
                  onClick={() => setPasteNotice(null)}
                  className="text-emerald-600 dark:text-emerald-400 hover:opacity-70 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {uploadError && (
              <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                {uploadError}
              </div>
            )}

            {/* Large Textarea */}
            <textarea
              rows={10}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onPaste={handleTextareaPaste}
              placeholder={`Dán đề thi của bạn vào đây (hỗ trợ giữ định dạng in đậm/gạch chân đáp án khi copy từ Word/Web):\n\nCâu 1: ALU là viết tắt của cụm từ nào?\nA. Arithmetic Logic Unit\nB. Access Level Unit\nC. Apple Logic Unit\nD. Auto Load Unit\nĐáp án: A\nGiải thích: ALU là khối số học và logic của CPU.\n\nCâu 2: Đoạn mã C sau...\n*A. Đáp án đúng có dấu sao ở đầu\nB. Đáp án sai`}
              className="flex-1 w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[200px]"
            />

            <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2">
              <span>Hỗ trợ `*A.`, `(A)`, in đậm/gạch chân Word &amp; bảng đáp án cuối trang</span>
              <span>{rawText.length.toLocaleString()} ký tự</span>
            </div>
          </div>

          {/* Right Column: Real-time Live Preview (lg:col-span-6) */}
          <div
            className={`space-y-3.5 lg:col-span-6 flex flex-col ${
              activeTab === 'input' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Status Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                {savableQuestions.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                )}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {previewItems.length > 0
                    ? `Sẵn sàng lưu: ${savableQuestions.length}/${previewItems.length} câu`
                    : 'Chờ dán nội dung văn bản...'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {pendingUnansweredItems.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                    {pendingUnansweredItems.length} câu thiếu đáp án
                  </span>
                )}
                {parsedResult.errors.length > 0 && (
                  <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {parsedResult.errors.length} lỗi định dạng
                  </span>
                )}
              </div>
            </div>

            {/* AI Auto-Solve Bar for unanswered questions */}
            {pendingUnansweredItems.length > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-200 leading-snug">
                    Phát hiện <strong>{pendingUnansweredItems.length} câu</strong> chưa có đáp án. Chọn thủ công ở thẻ câu hỏi hoặc dùng AI giải tự động:
                  </p>
                  <button
                    type="button"
                    disabled={isAiSolving}
                    onClick={handleAiSolveUnanswered}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-[11px] font-black flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isAiSolving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI đang giải...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5" />
                        <span>🤖 Dùng AI Giải &amp; Điền Đáp Án ({pendingUnansweredItems.length} câu)</span>
                      </>
                    )}
                  </button>
                </div>

                {needsSolveApiKey && (
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <input
                      type="password"
                      value={solveApiKey}
                      onChange={(e) => setSolveApiKey(e.target.value)}
                      placeholder="Nhập Gemini API Key (AIza...) lưu tạm phiên này rồi bấm AI Giải lại"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {aiSolveError && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    {aiSolveError}
                  </p>
                )}
              </div>
            )}

            {parsedResult.errors.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300 space-y-1 max-h-24 overflow-y-auto">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span>Các đoạn chưa đủ câu hỏi + 2 lựa chọn bị bỏ qua:</span>
                </p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {parsedResult.errors.map((errMsg, errIdx) => (
                    <li key={errIdx}>{errMsg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions Live Preview List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[380px] lg:max-h-[460px] pr-1">
              {previewItems.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">
                    Hãy dán đề thi hoặc tải file ở khung bên trái, hoặc bấm{' '}
                    <strong
                      onClick={handleLoadSample}
                      className="text-indigo-500 cursor-pointer hover:underline"
                    >
                      &quot;Dán văn bản mẫu&quot;
                    </strong>{' '}
                    để xem hệ thống bóc tách tự động trong tích tắc!
                  </p>
                </div>
              ) : (
                previewItems.map((item, idx) => {
                  const q = item.resolvedWord;
                  const isEditing = editingKey === item.key;

                  return (
                    <div
                      key={item.key}
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                        item.hasValidAnswer
                          ? 'bg-slate-50 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
                          : 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-400/50 dark:border-amber-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            Câu {idx + 1}
                          </span>
                          {item.hasValidAnswer ? (
                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              Đáp án đúng: {q.answer}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                              Chưa có đáp án — Bấm A/B/C/D để chọn
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingKey(isEditing ? null : item.key)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            title="Sửa nội dung câu hỏi / giải thích"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{isEditing ? 'Xong' : 'Sửa'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreviewItem(item.key)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Xóa câu này khỏi bản nhập"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={q.question || ''}
                            onChange={(e) =>
                              setQuestionOverrides((prev) => ({
                                ...prev,
                                [item.key]: {
                                  ...prev[item.key],
                                  question: e.target.value,
                                },
                              }))
                            }
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-400/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <textarea
                            rows={2}
                            placeholder="Giải thích đáp án (tùy chọn)..."
                            value={q.explanation || ''}
                            onChange={(e) =>
                              setQuestionOverrides((prev) => ({
                                ...prev,
                                [item.key]: {
                                  ...prev[item.key],
                                  explanation: e.target.value,
                                },
                              }))
                            }
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      ) : (
                        <CodeQuestionRenderer
                          content={q.question || ''}
                          className="font-medium text-slate-800 dark:text-slate-100 text-xs"
                        />
                      )}

                      {/* Clickable Options list to assign/change correct answer */}
                      <div className="space-y-1.5 pt-1">
                        {q.options?.map((opt, optIdx) => {
                          const isCorrect =
                            item.hasValidAnswer &&
                            isAnswerMatch(opt, q.correctWord, q.answer);
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOptionAnswer(item.key, opt, optIdx)}
                              className={`w-full text-left p-2 rounded-xl text-[11px] font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-400/60'
                              }`}
                            >
                              <span className="flex-1 min-w-0">{opt}</span>
                              {isCorrect ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                  ✓ ĐÚNG
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                  Chọn đúng
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {!isEditing && q.explanation && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          💡 {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-[#0B1120] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {savableQuestions.length > 0 ? (
              <span>
                Sẵn sàng lưu{' '}
                <strong className="text-emerald-500 font-mono">{savableQuestions.length}</strong>{' '}
                câu hỏi có đáp án
                {pendingUnansweredItems.length > 0
                  ? ` (${pendingUnansweredItems.length} câu chưa chọn đáp án sẽ bị bỏ qua)`
                  : '.'}
              </span>
            ) : (
              <span>Nhập nội dung đề thi và chọn đáp án để kích hoạt lưu trữ.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={savableQuestions.length === 0}
              onClick={() => handleSaveAndLaunch('just_save')}
              className="py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all disabled:opacity-40 cursor-pointer"
            >
              Lưu Vào Kho Đề
            </button>

            <button
              type="button"
              disabled={savableQuestions.length === 0}
              onClick={() => handleSaveAndLaunch('exam')}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-glow transition-all disabled:opacity-40 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>LƯU &amp; THI THỬ NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
