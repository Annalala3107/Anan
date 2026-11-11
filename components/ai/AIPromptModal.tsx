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

const SAMPLE_PROMPT_VOCAB = `Give me 10 advanced SAT/IELTS vocabulary words. Format the response STRICTLY as a valid JSON array of objects with the following schema:
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

const SAMPLE_PROMPT_MCQ = `Tạo cho tôi 5 câu hỏi trắc nghiệm ôn thi (môn Kiến trúc máy tính hoặc Lập trình C). Định dạng BẮT BUỘC theo chuẩn mảng JSON sau:
[
  {
    "question": "What is the binary equivalent of (4C)16 ?",
    "options": [
      "A. (11000100)2",
      "B. (01001010)2",
      "C. (00101100)2",
      "D. (01001100)2"
    ],
    "answer": "D",
    "correctWord": "D. (01001100)2",
    "explanation": "4 in binary is 0100, C in binary is 1100. Thus (4C)16 = 01001100.",
    "subject": "CSI106",
    "topic": "Hệ thống số"
  }
]
Chỉ trả về JSON thuần túy, không có ký tự thừa bên ngoài.`;

const SAMPLE_JSON = `[
  {
    "question": "Trong ngôn ngữ C, kích thước của kiểu dữ liệu con trỏ trên hệ điều hành 64-bit là bao nhiêu?",
    "options": [
      "A. 2 bytes",
      "B. 4 bytes",
      "C. 8 bytes",
      "D. Phụ thuộc vào kiểu dữ liệu mà nó trỏ tới"
    ],
    "answer": "C",
    "correctWord": "C. 8 bytes",
    "explanation": "Trên kiến trúc 64-bit, mọi con trỏ (pointer) đều chiếm 8 bytes (64 bits) địa chỉ bộ nhớ.",
    "subject": "Lập Trình C",
    "topic": "Con Trỏ & Bộ Nhớ"
  },
  {
    "question": "Bộ nhớ Cache trong kiến trúc máy tính hoạt động dựa trên nguyên lý nào?",
    "options": [
      "A. Nguyên lý cục bộ (Locality of Reference)",
      "B. Nguyên lý Von Neumann",
      "C. Nguyên lý ngắt quãng (Interrupt)",
      "D. Nguyên lý đa luồng (Multithreading)"
    ],
    "answer": "A",
    "correctWord": "A. Nguyên lý cục bộ (Locality of Reference)",
    "explanation": "Cache tận dụng tính cục bộ thời gian (Temporal locality) và cục bộ không gian (Spatial locality).",
    "subject": "Kiến Trúc Máy Tính",
    "topic": "Hệ Thống Bộ Nhớ"
  }
]`;

export default function AIPromptModal({ isOpen, onClose, onQuizCreated }: AIPromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [promptTab, setPromptTab] = useState<'mcq' | 'vocab'>('mcq');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPrompt = promptTab === 'mcq' ? SAMPLE_PROMPT_MCQ : SAMPLE_PROMPT_VOCAB;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleFillSample = () => {
    if (promptTab === 'mcq') {
      setQuizName('Đề Ôn Thi Mẫu Kiến Trúc & C (AI Generated)');
      setJsonInput(SAMPLE_JSON);
    } else {
      setQuizName('Bộ Từ Vựng IELTS/SAT (AI Generated)');
      setJsonInput(
        JSON.stringify(
          [
            {
              word: 'tenacious',
              ipa: '/təˈneɪ.ʃəs/',
              vi: 'kiên trì, bền bỉ, không bỏ cuộc',
              synonyms: ['persistent', 'resolute'],
              simple_examples: ['She had a tenacious grip on her principles.'],
              advanced_example:
                'The researcher maintained a tenacious commitment to finding a cure.',
              confusions: ['tentative', 'tenuous'],
            },
          ],
          null,
          2
        )
      );
    }
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
        setError('Dữ liệu JSON phải là một mảng (Array) chứa các câu hỏi hoặc từ vựng.');
        return;
      }

      // Validate objects (supports both Vocabulary and Academic MCQ items)
      const validatedWords: Word[] = parsed.map((item: any, idx: number) => {
        const fallbackWord = item.question
          ? `Câu ${idx + 1}: ${String(item.question).slice(0, 60)}...`
          : `Mục ${idx + 1}`;

        return {
          id: item.id ? String(item.id) : `ai_q_${Date.now()}_${idx + 1}`,
          word: String(item.word || fallbackWord).trim(),
          ipa: item.ipa ? String(item.ipa) : undefined,
          vi: item.vi ? String(item.vi) : undefined,
          ru: item.ru ? String(item.ru) : undefined,
          definition: item.definition ? String(item.definition) : undefined,
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          simple_examples: Array.isArray(item.simple_examples) ? item.simple_examples : [],
          advanced_example: item.advanced_example ? String(item.advanced_example) : undefined,
          confusions: Array.isArray(item.confusions) ? item.confusions : [],

          // Academic Multiple Choice Question attributes
          question: item.question ? String(item.question) : undefined,
          options: Array.isArray(item.options) ? item.options.map(String) : undefined,
          answer: item.answer ? String(item.answer) : undefined,
          correctWord: item.correctWord ? String(item.correctWord) : undefined,
          explanation: item.explanation ? String(item.explanation) : undefined,
          subject: item.subject ? String(item.subject) : undefined,
          topic: item.topic ? String(item.topic) : undefined,
        };
      });

      const newQuiz = StorageEngine.saveCustomQuiz({
        name: quizName.trim(),
        description: `Tạo từ AI Prompt (${validatedWords.length} câu hỏi / từ vựng)`,
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
        className="relative w-full max-w-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto"
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

        {/* Step 1: Copy Prompt with Tabs */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-700/60">
              <button
                type="button"
                onClick={() => setPromptTab('mcq')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  promptTab === 'mcq'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-500'
                }`}
              >
                Trắc Nghiệm (MCQ)
              </button>
              <button
                type="button"
                onClick={() => setPromptTab('vocab')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  promptTab === 'vocab'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-500'
                }`}
              >
                Từ Vựng (Flashcard)
              </button>
            </div>

            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-glow"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép Prompt!' : 'Copy Prompt'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40">
            {currentPrompt}
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
              placeholder="VD: 20 Câu Hỏi Ôn Thi Cuối Kỳ CSI106..."
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
