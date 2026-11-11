'use client';

import { useState, useMemo, useEffect } from 'react';
import { parseRawExamText } from '@/lib/textQuizParser';
import { StorageEngine } from '@/lib/storage';
import { useQuizStore } from '@/lib/quizStore';
import { soundFx } from '@/lib/sound';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import { CustomQuiz, CustomSubject, Word } from '@/lib/types';
import {
  X,
  Zap,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  BookOpen,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface QuickTextParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: CustomQuiz) => void;
  defaultSubject?: string;
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
  const { setActiveCustomQuiz, setSelectedQuizPath } = useQuizStore();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('PRF192');
  const [topic, setTopic] = useState('Tổng hợp');
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'input' | 'preview'>('input');
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);

  useEffect(() => {
    if (isOpen) {
      const subs = StorageEngine.getCustomSubjects();
      setCustomSubjects(subs);
      if (defaultSubject) {
        setSubject(defaultSubject);
      }
    }
  }, [isOpen, defaultSubject]);

  // Real-time parsing engine
  const parsedResult = useMemo(() => {
    return parseRawExamText(rawText, subject, topic);
  }, [rawText, subject, topic]);

  const handleLoadSample = () => {
    setTitle('Đề Thi Thử Mẫu (Parse Tự Động)');
    setSubject('PRF192 & CSI106');
    setTopic('Ôn tập tổng hợp');
    setRawText(SAMPLE_TEXT);
    soundFx.playClick();
  };

  const handleSaveAndLaunch = (mode: 'exam' | 'drill' | 'just_save') => {
    if (parsedResult.validCount === 0) return;

    const quizTitle = title.trim() || `Bộ Đề Tạo Nhanh (${new Date().toLocaleDateString('vi-VN')})`;

    const newQuiz = StorageEngine.saveCustomQuiz({
      name: quizTitle,
      description: `Bộ đề gồm ${parsedResult.validCount} câu hỏi được nhập tự động từ văn bản thô. Môn: ${subject}.`,
      words: parsedResult.questions,
      is_public: true,
      author_name: 'Bạn',
      subject,
      topic,
    });

    soundFx.playCelebration();
    onQuizCreated(newQuiz);
    setActiveCustomQuiz(newQuiz);

    onClose();

    if (mode === 'exam') {
      window.location.href = '/session/exam';
    } else if (mode === 'drill') {
      window.location.href = '/session/drill';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
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
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
              {parsedResult.validCount}
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
                    <optgroup label="Môn cơ bản mặc định">
                      <option value="PRF192">Lập Trình C (PRF192)</option>
                      <option value="CSI106">Kiến Trúc Máy Tính (CSI106)</option>
                      <option value="SSA101">Kỹ Năng Học Đại Học (SSA101)</option>
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

            {/* Paste Box Header */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Dán nội dung văn bản (Word / PDF / Ghi chú):
              </label>

              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dán văn bản mẫu</span>
              </button>
            </div>

            {/* Large Textarea */}
            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Dán đề thi của bạn vào đây, định dạng tự nhiên như sau:\n\nCâu 1: ALU là viết tắt của cụm từ nào?\nA. Arithmetic Logic Unit\nB. Access Level Unit\nC. Apple Logic Unit\nD. Auto Load Unit\nĐáp án: A\nGiải thích: ALU là khối số học và logic của CPU.\n\nCâu 2: Đoạn mã C sau...\n*A. Đáp án đúng có dấu sao ở đầu\nB. Đáp án sai`}
              className="flex-1 w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[220px]"
            />

            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Hỗ trợ cả đáp án có dấu sao `*A.` hoặc dòng `Đáp án: A`</span>
              <span>{rawText.length} ký tự</span>
            </div>
          </div>

          {/* Right Column: Real-time Live Preview (lg:col-span-6) */}
          <div
            className={`space-y-4 lg:col-span-6 flex flex-col ${
              activeTab === 'input' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Status Header */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                {parsedResult.validCount > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                )}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {parsedResult.validCount > 0
                    ? `Đã nhận diện: ${parsedResult.validCount} câu hỏi hợp lệ`
                    : 'Chờ dán nội dung văn bản...'}
                </span>
              </div>

              {parsedResult.errors.length > 0 && (
                <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {parsedResult.errors.length} cảnh báo
                </span>
              )}
            </div>

            {/* Questions Live Preview List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[380px] lg:max-h-[460px] pr-1">
              {parsedResult.validCount === 0 ? (
                <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">
                    Hãy dán đề thi của bạn vào khung bên trái, hoặc bấm{' '}
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
                parsedResult.questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        Câu {idx + 1}
                      </span>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Đáp án đúng: {q.answer}
                      </span>
                    </div>

                    <CodeQuestionRenderer
                      content={q.question || ''}
                      className="font-medium text-slate-800 dark:text-slate-100 text-xs"
                    />

                    {/* Options list */}
                    <div className="space-y-1.5 pt-1">
                      {q.options?.map((opt, optIdx) => {
                        const isCorrect = opt.startsWith(`${q.answer}.`);
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-xl text-[11px] font-medium flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
                            }`}
                          >
                            <span>{opt}</span>
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ ĐÚNG
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-[#0B1120] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedResult.validCount > 0 ? (
              <span>
                Sẵn sàng tạo bộ đề với{' '}
                <strong className="text-emerald-500 font-mono">{parsedResult.validCount}</strong>{' '}
                câu hỏi.
              </span>
            ) : (
              <span>Nhập nội dung đề thi để kích hoạt lưu trữ.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={parsedResult.validCount === 0}
              onClick={() => handleSaveAndLaunch('just_save')}
              className="py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all disabled:opacity-40"
            >
              Lưu Vào Kho Đề
            </button>

            <button
              type="button"
              disabled={parsedResult.validCount === 0}
              onClick={() => handleSaveAndLaunch('exam')}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-glow transition-all disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>LƯU & THI THỬ NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
