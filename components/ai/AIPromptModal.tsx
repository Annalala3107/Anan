'use client';

import { useState } from 'react';
import { Word, CustomQuiz } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { Copy, Check, Sparkles, X, AlertCircle, FileText, Upload } from 'lucide-react';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: CustomQuiz) => void;
}

const SAMPLE_PROMPT = `Give me 10 advanced SAT/IELTS vocabulary words. Format the response STRICTLY as a valid JSON array of objects with the following schema:
[
  {
    "word": "eloquent",
    "ipa": "/ˈel.ə.kwənt/",
    "vi": "hùng hồn, lưu loát, truyền cảm",
    "synonyms": ["articulate", "fluent", "persuasive"],
    "simple_examples": ["She delivered an eloquent speech at the ceremony."],
    "advanced_example": "The author's eloquent prose dismantled the opposition's arguments.",
    "confusions": ["elegant", "elusive"]
  }
]
Do not include any markdown backticks or extra text outside the JSON array.`;

const SAMPLE_JSON = `[
  {
    "word": "tenacious",
    "ipa": "/təˈneɪ.ʃəs/",
    "vi": "kiên trì, bền bỉ, không bỏ cuộc",
    "synonyms": ["persistent", "resolute"],
    "simple_examples": ["She had a tenacious grip on her principles."],
    "advanced_example": "The researcher maintained a tenacious commitment to finding a cure despite repeated setbacks.",
    "confusions": ["tentative", "tenuous"]
  },
  {
    "word": "ephemeral",
    "ipa": "/ɪˈfem.ər.əl/",
    "vi": "phù du, chóng tàn, ngắn ngủi",
    "synonyms": ["transient", "fleeting"],
    "simple_examples": ["Social media fame is often ephemeral."],
    "advanced_example": "The financial surge was fueled by ephemeral speculation rather than concrete fundamentals.",
    "confusions": ["eternal", "ethereal"]
  }
]`;

export default function AIPromptModal({ isOpen, onClose, onQuizCreated }: AIPromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleFillSample = () => {
    setQuizName('Bộ từ vựng SAT chọn lọc (Sample AI)');
    setJsonInput(SAMPLE_JSON);
    setError(null);
  };

  const handleSave = () => {
    if (!quizName.trim()) {
      setError('Vui lòng nhập tên bộ đề.');
      return;
    }

    try {
      // Clean possible markdown code fences
      let cleaned = jsonInput.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '');
      if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError('Dữ liệu JSON phải là một mảng (Array) chứa các từ vựng.');
        return;
      }

      // Validate objects
      const validatedWords: Word[] = parsed.map((item: any) => ({
        word: String(item.word || '').trim(),
        ipa: item.ipa ? String(item.ipa) : undefined,
        vi: item.vi ? String(item.vi) : undefined,
        ru: item.ru ? String(item.ru) : undefined,
        definition: item.definition ? String(item.definition) : undefined,
        synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
        simple_examples: Array.isArray(item.simple_examples) ? item.simple_examples : [],
        advanced_example: String(item.advanced_example || ''),
        confusions: Array.isArray(item.confusions) ? item.confusions : [],
      }));

      const newQuiz = StorageEngine.saveCustomQuiz({
        name: quizName.trim(),
        description: `Tạo từ AI Prompt (${validatedWords.length} từ)`,
        words: validatedWords,
        is_public: true,
        author_name: 'Học viên (Bạn)',
      });

      onQuizCreated(newQuiz);
      onClose();
    } catch (e: any) {
      setError(`Lỗi định dạng JSON: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Tạo Bộ Đề Bằng AI Prompt
            </h2>
            <p className="text-xs text-slate-500">
              Copy câu lệnh gửi cho ChatGPT / Claude / Gemini, sau đó dán kết quả JSON vào đây.
            </p>
          </div>
        </div>

        {/* Step 1: Copy Prompt */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Bước 1: Copy Câu Lệnh AI (Prompt)
            </span>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép!' : 'Copy Prompt'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {SAMPLE_PROMPT}
          </pre>
        </div>

        {/* Step 2: Paste JSON */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Bước 2: Dán kết quả JSON vào đây
            </span>
            <button
              onClick={handleFillSample}
              className="text-xs font-semibold text-indigo-500 hover:underline"
            >
              Thử điền dữ liệu mẫu
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên bộ đề:
            </label>
            <input
              type="text"
              placeholder="VD: 20 Từ Vựng SAT Đọc Hiểu..."
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dữ liệu JSON từ AI:
            </label>
            <textarea
              rows={8}
              placeholder="[ { &quot;word&quot;: &quot;...&quot;, &quot;vi&quot;: &quot;...&quot; } ]"
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError(null);
              }}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Tạo & Bắt Đầu Học Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
