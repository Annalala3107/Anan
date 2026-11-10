'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  BookOpen,
  Play,
  Check,
  Share2,
  Trash2,
  Upload,
  Layers,
  Cpu,
  GraduationCap,
  Code2,
  FileCode,
  Languages
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { CustomQuiz, QuizSet } from '@/lib/types';
import AIPromptModal from '@/components/ai/AIPromptModal';

interface SubjectSection {
  id: string;
  title: string;
  subjectCode: string;
  icon: any;
  color: string;
  quizzes: QuizSet[];
}

const QUESTION_BANKS: SubjectSection[] = [
  {
    id: 'cea201',
    title: 'Kiến Trúc Máy Tính (CEA201)',
    subjectCode: 'CEA201',
    icon: Cpu,
    color: 'from-blue-600 to-indigo-600',
    quizzes: [
      {
        id: 'cea_all',
        name: 'CEA201 — Đề Thi Tổng Hợp Toàn Diện',
        description: 'Trọn bộ 347 câu hỏi trắc nghiệm ôn tập thi cuối kỳ môn Kiến trúc máy tính (CEA201).',
        file_path: '/data/cea201_all.json',
        is_public: true,
        wordCount: 347,
        tags: ['Full Exam', '347 Câu', 'Official'],
        subject: 'CEA201',
        topic: 'Tổng Hợp'
      },
      {
        id: 'cea_num',
        name: 'Chuyên Đề 1: Hệ Thống Số & Biểu Diễn Dữ Liệu',
        description: 'Chuyển đổi Nhị phân, Bát phân, Thập lục phân, Số bù 2, Dấu phẩy động Excess-127, Phép toán logic.',
        file_path: '/data/cea_h_th_ng_s_bi_u_di_n_d_li_u.json',
        is_public: true,
        wordCount: 77,
        tags: ['Hệ Nhị Phân', 'Bù 2', 'Logic'],
        subject: 'CEA201',
        topic: 'Hệ Thống Số'
      },
      {
        id: 'cea_arch',
        name: 'Chuyên Đề 2: Kiến Trúc Phần Cứng & Vi Xử Lý',
        description: 'Mô hình Von Neumann, Turing, chức năng CPU, ALU, Control Unit, Thanh ghi (Registers), Cache 80-20.',
        file_path: '/data/cea_ki_n_tr_c_ph_n_c_ng_vi_x_l.json',
        is_public: true,
        wordCount: 55,
        tags: ['Von Neumann', 'CPU', 'ALU'],
        subject: 'CEA201',
        topic: 'Phần Cứng & CPU'
      },
      {
        id: 'cea_net',
        name: 'Chuyên Đề 3: Mạng Máy Tính & An Toàn Thông Tin',
        description: 'Giao thức TCP/IP, UDP, Địa chỉ IPv4/MAC, Port, Mật mã học đối xứng/bất đối xứng, Tường lửa, Loại hacker.',
        file_path: '/data/cea_m_ng_m_y_t_nh_an_to_n_th_ng_tin.json',
        is_public: true,
        wordCount: 52,
        tags: ['TCP/IP', 'Security', 'OSI'],
        subject: 'CEA201',
        topic: 'Mạng & Bảo Mật'
      },
      {
        id: 'cea_os',
        name: 'Chuyên Đề 4: Hệ Điều Hành & Quản Lý Bộ Nhớ',
        description: 'Phân trang (Paging), Phân đoạn (Segmentation), Bộ nhớ ảo, Đa chương (Multiprogramming), RTOS, Unix.',
        file_path: '/data/cea_h_i_u_h_nh_qu_n_l_b_nh.json',
        is_public: true,
        wordCount: 33,
        tags: ['Paging', 'Virtual Memory', 'OS'],
        subject: 'CEA201',
        topic: 'Hệ Điều Hành'
      },
      {
        id: 'cea_dsa',
        name: 'Chuyên Đề 5: Cấu Trúc Dữ Liệu & Giải Thuật',
        description: 'Cây nhị phân, BST, Stack (LIFO), Queue (FIFO), Danh sách liên kết (Linked list), Graph, Sắp xếp & Tìm kiếm.',
        file_path: '/data/cea_c_u_tr_c_d_li_u_gi_i_thu_t.json',
        is_public: true,
        wordCount: 34,
        tags: ['Binary Tree', 'Stack', 'Queue'],
        subject: 'CEA201',
        topic: 'CTDL & GT'
      },
      {
        id: 'cea_db_se',
        name: 'Chuyên Đề 6: Cơ Sở Dữ Liệu & Kỹ Thuật Phần Mềm',
        description: 'Mô hình CSDL quan hệ, ERD, ACID, Chuẩn hóa 1NF/2NF, Quy trình SDLC, Mô hình Thác nước (Waterfall), Agile, Testing.',
        file_path: '/data/cea_c_s_d_li_u_k_thu_t_ph_n_m_m.json',
        is_public: true,
        wordCount: 34,
        tags: ['Relational DB', 'SDLC', 'Agile'],
        subject: 'CEA201',
        topic: 'CSDL & Phần Mềm'
      }
    ]
  },
  {
    id: 'ssl101',
    title: 'Kỹ Năng Học Đại Học & AI Literacy (SSL101)',
    subjectCode: 'SSL101',
    icon: GraduationCap,
    color: 'from-emerald-600 to-teal-600',
    quizzes: [
      {
        id: 'ssl_all',
        name: 'SSL101 — Đề Thi Tổng Hợp Toàn Bộ 370 Câu',
        description: 'Toàn bộ ngân hàng câu hỏi trắc nghiệm ôn tập môn Kỹ năng học tập đại học và ứng dụng AI (SSL101).',
        file_path: '/data/ssl101_all.json',
        is_public: true,
        wordCount: 370,
        tags: ['Full Exam', '370 Câu', 'Official'],
        subject: 'SSL101',
        topic: 'Tổng Hợp'
      },
      {
        id: 'ssl_crit',
        name: 'Chuyên Đề 1: Tư Duy Phản Biện & Phân Tích',
        description: 'Analytical thinking, Critical thinking, Thang đo Bloom, Giải quyết vấn đề (Problem-solving), Đánh giá nguồn tin.',
        file_path: '/data/ssl_t_duy_ph_n_bi_n_ph_n_t_ch.json',
        is_public: true,
        wordCount: 83,
        tags: ['Critical Thinking', 'Bloom', 'Analysis'],
        subject: 'SSL101',
        topic: 'Tư Duy Phản Biện'
      },
      {
        id: 'ssl_mem',
        name: 'Chuyên Đề 2: Chiến Lược Học Tập & Trí Nhớ',
        description: 'Metacognition (Nhận thức về tư duy), Trí nhớ làm việc (Working memory), Đường cong quên lãng Ebbinghaus, Phương pháp SQ3R.',
        file_path: '/data/ssl_chi_n_l_c_h_c_t_p_tr_nh.json',
        is_public: true,
        wordCount: 113,
        tags: ['Metacognition', 'Memory', 'SQ3R'],
        subject: 'SSL101',
        topic: 'Trí Nhớ & Học Tập'
      },
      {
        id: 'ssl_ai',
        name: 'Chuyên Đề 3: AI Literacy & Đạo Đức Học Thuật',
        description: 'Hiểu biết về Trí tuệ nhân tạo, Hallucination (ảo giác AI), Liêm chính học thuật (Academic Integrity), Turnitin, Deepfake.',
        file_path: '/data/ssl_ai_literacy_o_c_h_c_thu_t.json',
        is_public: true,
        wordCount: 14,
        tags: ['AI Literacy', 'Ethics', 'Hallucination'],
        subject: 'SSL101',
        topic: 'AI & Đạo Đức'
      },
      {
        id: 'ssl_time',
        name: 'Chuyên Đề 4: Quản Lý Thời Gian & Mục Tiêu SMART',
        description: 'Mục tiêu SMART, Trì hoãn (Procrastination), Lập kế hoạch theo tuần/kỳ, Tác hại của All-nighter và Multitasking.',
        file_path: '/data/ssl_qu_n_l_th_i_gian_m_c_ti_u_smart.json',
        is_public: true,
        wordCount: 44,
        tags: ['Time Management', 'SMART Goals'],
        subject: 'SSL101',
        topic: 'Quản Lý Thời Gian'
      },
      {
        id: 'ssl_team',
        name: 'Chuyên Đề 5: Làm Việc Nhóm & Giao Tiếp Hiệu Quả',
        description: 'Mô hình phát triển nhóm Tuckman (Forming, Storming, Norming, Performing), Lắng nghe tích cực, Kỹ năng phản hồi.',
        file_path: '/data/ssl_l_m_vi_c_nh_m_giao_ti_p_hi_u_qu.json',
        is_public: true,
        wordCount: 40,
        tags: ['Tuckman', 'Teamwork', 'Communication'],
        subject: 'SSL101',
        topic: 'Làm Việc Nhóm'
      },
      {
        id: 'ssl_fin',
        name: 'Chuyên Đề 6: Tài Chính Cá Nhân & Định Hướng Nghề Nghiệp',
        description: 'Tài sản (Assets), Nợ (Liabilities), Giá trị ròng (Net Worth), Hoạch định tài chính sinh viên, Chu trình nghề nghiệp.',
        file_path: '/data/ssl_t_i_ch_nh_c_nh_n_nh_h_ng_ngh_nghi_p.json',
        is_public: true,
        wordCount: 19,
        tags: ['Finance', 'Net Worth', 'Career'],
        subject: 'SSL101',
        topic: 'Tài Chính & Nghề Nghiệp'
      }
    ]
  },
  {
    id: 'prf192',
    title: 'Lập Trình C Căn Bản & Nâng Cao (PRF192)',
    subjectCode: 'PRF192',
    icon: Code2,
    color: 'from-amber-600 to-orange-600',
    quizzes: [
      {
        id: 'prf_all',
        name: 'PRF192 — Đề Thi Trắc Nghiệm C Toàn Diện',
        description: 'Trọn bộ 253 câu hỏi trắc nghiệm code C, phân tích output chương trình và ngữ pháp lập trình C.',
        file_path: '/data/prf192_all.json',
        is_public: true,
        wordCount: 253,
        tags: ['Full Exam', '253 Câu', 'C Code'],
        subject: 'PRF192',
        topic: 'Tổng Hợp'
      },
      {
        id: 'prf_loops',
        name: 'Chuyên Đề 1: Cấu Trúc Điều Khiển & Vòng Lặp',
        description: 'Vòng lặp for, while, do-while, cấu trúc rẽ nhánh if-else, switch-case, break và continue.',
        file_path: '/data/prf_c_u_tr_c_i_u_khi_n_v_ng_l_p.json',
        is_public: true,
        wordCount: 62,
        tags: ['Loops', 'Switch Case', 'If-Else'],
        subject: 'PRF192',
        topic: 'Vòng Lặp & Điều Khiển'
      },
      {
        id: 'prf_ptr',
        name: 'Chuyên Đề 2: Con Trỏ & Quản Lý Bộ Nhớ Động',
        description: 'Toán tử con trỏ *, &, số học con trỏ, con trỏ cấp 2, hàm malloc(), calloc(), realloc(), free().',
        file_path: '/data/prf_con_tr_qu_n_l_b_nh.json',
        is_public: true,
        wordCount: 44,
        tags: ['Pointers', 'Malloc', 'Memory'],
        subject: 'PRF192',
        topic: 'Con Trỏ'
      },
      {
        id: 'prf_str',
        name: 'Chuyên Đề 3: Chuỗi Ký Tự (Strings in C)',
        description: 'Mảng ký tự, ký tự kết thúc chuỗi \\0, các hàm strcmp, strcpy, strcat, strlen, gets, puts.',
        file_path: '/data/prf_chu_i_k_t_strings.json',
        is_public: true,
        wordCount: 38,
        tags: ['Strings', 'strcmp', 'strcpy'],
        subject: 'PRF192',
        topic: 'Chuỗi Ký Tự'
      },
      {
        id: 'prf_syntax',
        name: 'Chuyên Đề 4: Cú Pháp, Kiểu Dữ Liệu & Toán Tử',
        description: 'Toán tử bitwise &, |, ^, dịch bit <<, >>, toán tử điều kiện ?:, độ ưu tiên toán tử, ép kiểu dữ liệu.',
        file_path: '/data/prf_c_ph_p_ki_u_d_li_u_to_n_t.json',
        is_public: true,
        wordCount: 33,
        tags: ['Data Types', 'Bitwise', 'Operators'],
        subject: 'PRF192',
        topic: 'Toán Tử & Kiểu Dữ Liệu'
      },
      {
        id: 'prf_func',
        name: 'Chuyên Đề 5: Hàm & Phạm Vi Biến',
        description: 'Khai báo nguyên mẫu hàm (Prototype), truyền tham trị vs truyền tham chiếu, biến local vs global.',
        file_path: '/data/prf_h_m_ph_m_vi_bi_n.json',
        is_public: true,
        wordCount: 28,
        tags: ['Functions', 'Scope', 'Parameters'],
        subject: 'PRF192',
        topic: 'Hàm'
      },
      {
        id: 'prf_arr',
        name: 'Chuyên Đề 6: Mảng & Giải Thuật Tìm Kiếm, Sắp Xếp',
        description: 'Mảng 1 chiều, mảng 2 chiều (matrix), duyệt mảng, tìm kiếm tuần tự (linear), nhị phân, Bubble/Selection sort.',
        file_path: '/data/prf_m_ng_gi_i_thu_t_c_b_n.json',
        is_public: true,
        wordCount: 26,
        tags: ['Arrays', 'Matrix', 'Sorting'],
        subject: 'PRF192',
        topic: 'Mảng'
      },
      {
        id: 'prf_file',
        name: 'Chuyên Đề 7: Tệp Tin (File I/O)',
        description: 'Mở file fopen, chế độ r, w, a, a+, wb, đọc ghi file fprintf, fscanf, fgetc, fputc, hàm feof, rewind.',
        file_path: '/data/prf_t_p_tin_file_i_o.json',
        is_public: true,
        wordCount: 14,
        tags: ['File I/O', 'fopen', 'rewind'],
        subject: 'PRF192',
        topic: 'Tệp Tin'
      }
    ]
  },
  {
    id: 'vocab',
    title: 'Từ Vựng Tiếng Anh & SAT / IELTS',
    subjectCode: 'VOCAB',
    icon: Languages,
    color: 'from-purple-600 to-pink-600',
    quizzes: [
      {
        id: 'preset_vi_en',
        name: 'IELTS / SAT Tiếng Việt Chọn Lọc',
        description: 'Từ vựng SAT & IELTS nâng cao kèm dịch nghĩa tiếng Việt, phiên âm IPA và câu ví dụ học thuật.',
        file_path: '/sat/vi-en-ielts.json',
        is_public: true,
        wordCount: 12,
        tags: ['Tiếng Việt', 'IELTS 7.5+', 'SAT'],
        subject: 'VOCAB',
        topic: 'Tiếng Anh Học Thuật'
      },
      {
        id: 'preset_sat_1',
        name: 'SAT Vocabulary - Set 1 Core',
        description: 'Core SAT vocabulary words with definitions, synonyms, simple and advanced examples.',
        file_path: '/sat/1.json',
        is_public: true,
        wordCount: 40,
        tags: ['SAT Core', 'English'],
        subject: 'VOCAB',
        topic: 'SAT Cốt Lõi'
      },
      {
        id: 'preset_sat_2',
        name: 'SAT Vocabulary - Set 2 Advanced',
        description: 'Extensive advanced vocabulary set designed for competitive SAT test takers.',
        file_path: '/sat/2.json',
        is_public: true,
        wordCount: 100,
        tags: ['SAT Advanced', 'English'],
        subject: 'VOCAB',
        topic: 'SAT Nâng Cao'
      },
      {
        id: 'preset_sat_archaic',
        name: 'Archaic & Classical Literature',
        description: 'Historical, formal, and classical literary words frequently tested in SAT reading passages.',
        file_path: '/sat/archaic.json',
        is_public: true,
        wordCount: 50,
        tags: ['Literature', 'Archaic'],
        subject: 'VOCAB',
        topic: 'Văn Học Cổ'
      }
    ]
  }
];

export default function QuizzesPage() {
  const router = useRouter();
  const { selectedQuizPath, setSelectedQuizPath, activeCustomQuiz, setActiveCustomQuiz } = useQuizStore();
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('all');
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    setCustomQuizzes(StorageEngine.getCustomQuizzes());
  }, []);

  const handleSelectQuiz = (path: string) => {
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
  };

  const handleStartExam = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
    router.push('/session/exam');
  };

  const handleStartDrill = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
    router.push('/session/drill');
  };

  const filteredSections = activeSubjectTab === 'all'
    ? QUESTION_BANKS
    : QUESTION_BANKS.filter(s => s.id === activeSubjectTab);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-500" />
            Ngân Hàng Đề Thi & Chuyên Đề Phân Loại
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Đã nhập và chia thành các chủ đề chuẩn chương trình: Kiến trúc máy tính (CEA201), Kỹ năng đại học (SSL101), Lập trình C (PRF192).
          </p>
        </div>

        <button
          onClick={() => setIsAIModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold shadow-glow hover:opacity-95 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>Tạo Bộ Đề Bằng AI</span>
        </button>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubjectTab('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeSubjectTab === 'all'
              ? 'bg-indigo-600 text-white shadow-glow'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Tất cả môn học
        </button>
        {QUESTION_BANKS.map((sub) => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubjectTab(sub.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                activeSubjectTab === sub.id
                  ? 'bg-indigo-600 text-white shadow-glow'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.title.split('(')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {/* Render Subject Sections */}
      <div className="space-y-10">
        {filteredSections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${section.color} flex items-center justify-center text-white shadow-md`}>
                    <SectionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {section.quizzes.length} Bộ đề thi & chuyên đề
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid of Quizzes in this Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.quizzes.map((quiz) => {
                  const isSelected =
                    !activeCustomQuiz && selectedQuizPath === quiz.file_path;
                  return (
                    <div
                      key={quiz.id}
                      onClick={() => handleSelectQuiz(quiz.file_path)}
                      className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-glow'
                          : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                      }`}
                    >
                      <div>
                        {/* Header Tags */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {quiz.tags?.map((t, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Đang Học
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {quiz.name}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                          {quiz.description}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">
                          {quiz.wordCount ? `${quiz.wordCount} Câu hỏi` : 'Đầy đủ'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleStartDrill(quiz.file_path, e)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Luyện tập
                          </button>
                          <button
                            onClick={(e) => handleStartExam(quiz.file_path, e)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-white" /> Thi thử
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
