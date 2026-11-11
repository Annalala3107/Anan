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
  FileText,
  FolderPlus,
  Plus,
  Pencil,
  PlusCircle,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { CustomQuiz, CustomSubject, QuizSet } from '@/lib/types';
import AIPromptModal from '@/components/ai/AIPromptModal';
import QuickTextParserModal from '@/components/QuickTextParserModal';
import CustomSubjectModal, { SUBJECT_ICONS } from '@/components/CustomSubjectModal';

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
    id: 'csi106',
    title: 'Kiến Trúc Máy Tính (CSI106)',
    subjectCode: 'CSI106',
    icon: Cpu,
    color: 'from-blue-600 to-indigo-600',
    quizzes: [
      {
        id: 'csi_all',
        name: 'CSI106 — Đề Thi Tổng Hợp Toàn Diện',
        description: 'Trọn bộ 347 câu hỏi trắc nghiệm ôn tập thi cuối kỳ môn Kiến trúc máy tính (CSI106).',
        file_path: '/data/csi106_all.json',
        is_public: true,
        wordCount: 347,
        tags: ['Full Exam', '347 Câu', 'Official'],
        subject: 'CSI106',
        topic: 'Tổng Hợp'
      },
      {
        id: 'csi_num',
        name: 'Chuyên Đề 1: Hệ Thống Số & Biểu Diễn Dữ Liệu',
        description: 'Chuyển đổi Nhị phân, Bát phân, Thập lục phân, Số bù 2, Dấu phẩy động Excess-127, Phép toán logic.',
        file_path: '/data/csi_h_th_ng_s_bi_u_di_n_d_li_u.json',
        is_public: true,
        wordCount: 77,
        tags: ['Hệ Nhị Phân', 'Bù 2', 'Logic'],
        subject: 'CSI106',
        topic: 'Hệ Thống Số'
      },
      {
        id: 'csi_arch',
        name: 'Chuyên Đề 2: Kiến Trúc Phần Cứng & Vi Xử Lý',
        description: 'Mô hình Von Neumann, Turing, chức năng CPU, ALU, Control Unit, Thanh ghi (Registers), Cache 80-20.',
        file_path: '/data/csi_ki_n_tr_c_ph_n_c_ng_vi_x_l.json',
        is_public: true,
        wordCount: 55,
        tags: ['Von Neumann', 'CPU', 'ALU'],
        subject: 'CSI106',
        topic: 'Phần Cứng & CPU'
      },
      {
        id: 'csi_net',
        name: 'Chuyên Đề 3: Mạng Máy Tính & An Toàn Thông Tin',
        description: 'Giao thức TCP/IP, UDP, Địa chỉ IPv4/MAC, Port, Mật mã học đối xứng/bất đối xứng, Tường lửa, Loại hacker.',
        file_path: '/data/csi_m_ng_m_y_t_nh_an_to_n_th_ng_tin.json',
        is_public: true,
        wordCount: 52,
        tags: ['TCP/IP', 'Security', 'OSI'],
        subject: 'CSI106',
        topic: 'Mạng & Bảo Mật'
      },
      {
        id: 'csi_os',
        name: 'Chuyên Đề 4: Hệ Điều Hành & Quản Lý Bộ Nhớ',
        description: 'Phân trang (Paging), Phân đoạn (Segmentation), Bộ nhớ ảo, Đa chương (Multiprogramming), RTOS, Unix.',
        file_path: '/data/csi_h_i_u_h_nh_qu_n_l_b_nh.json',
        is_public: true,
        wordCount: 33,
        tags: ['Paging', 'Virtual Memory', 'OS'],
        subject: 'CSI106',
        topic: 'Hệ Điều Hành'
      },
      {
        id: 'csi_dsa',
        name: 'Chuyên Đề 5: Cấu Trúc Dữ Liệu & Giải Thuật',
        description: 'Cây nhị phân, BST, Stack (LIFO), Queue (FIFO), Danh sách liên kết (Linked list), Graph, Sắp xếp & Tìm kiếm.',
        file_path: '/data/csi_c_u_tr_c_d_li_u_gi_i_thu_t.json',
        is_public: true,
        wordCount: 34,
        tags: ['Binary Tree', 'Stack', 'Queue'],
        subject: 'CSI106',
        topic: 'CTDL & GT'
      },
      {
        id: 'csi_db_se',
        name: 'Chuyên Đề 6: Cơ Sở Dữ Liệu & Kỹ Thuật Phần Mềm',
        description: 'Mô hình CSDL quan hệ, ERD, ACID, Chuẩn hóa 1NF/2NF, Quy trình SDLC, Mô hình Thác nước (Waterfall), Agile, Testing.',
        file_path: '/data/csi_c_s_d_li_u_k_thu_t_ph_n_m_m.json',
        is_public: true,
        wordCount: 34,
        tags: ['Relational DB', 'SDLC', 'Agile'],
        subject: 'CSI106',
        topic: 'CSDL & Phần Mềm'
      }
    ]
  },
  {
    id: 'ssa101',
    title: 'Kỹ Năng Học Đại Học & Kỹ Năng Mềm (SSA101)',
    subjectCode: 'SSA101',
    icon: GraduationCap,
    color: 'from-emerald-600 to-teal-600',
    quizzes: [
      {
        id: 'ssa_all',
        name: 'SSA101 — Đề Thi Tổng Hợp Toàn Bộ 370 Câu',
        description: 'Toàn bộ ngân hàng câu hỏi trắc nghiệm ôn tập môn Kỹ năng học tập đại học và ứng dụng AI (SSA101).',
        file_path: '/data/ssa101_all.json',
        is_public: true,
        wordCount: 370,
        tags: ['Full Exam', '370 Câu', 'Official'],
        subject: 'SSA101',
        topic: 'Tổng Hợp'
      },
      {
        id: 'ssa_crit',
        name: 'Chuyên Đề 1: Tư Duy Phản Biện & Phân Tích',
        description: 'Analytical thinking, Critical thinking, Thang đo Bloom, Giải quyết vấn đề (Problem-solving), Đánh giá nguồn tin.',
        file_path: '/data/ssa_t_duy_ph_n_bi_n_ph_n_t_ch.json',
        is_public: true,
        wordCount: 83,
        tags: ['Critical Thinking', 'Bloom', 'Analysis'],
        subject: 'SSA101',
        topic: 'Tư Duy Phản Biện'
      },
      {
        id: 'ssa_mem',
        name: 'Chuyên Đề 2: Chiến Lược Học Tập & Trí Nhớ',
        description: 'Metacognition (Nhận thức về tư duy), Trí nhớ làm việc (Working memory), Đường cong quên lãng Ebbinghaus, Phương pháp SQ3R.',
        file_path: '/data/ssa_chi_n_l_c_h_c_t_p_tr_nh.json',
        is_public: true,
        wordCount: 113,
        tags: ['Metacognition', 'Memory', 'SQ3R'],
        subject: 'SSA101',
        topic: 'Trí Nhớ & Học Tập'
      },
      {
        id: 'ssa_ai',
        name: 'Chuyên Đề 3: AI Literacy & Đạo Đức Học Thuật',
        description: 'Hiểu biết về Trí tuệ nhân tạo, Hallucination (ảo giác AI), Liêm chính học thuật (Academic Integrity), Turnitin, Deepfake.',
        file_path: '/data/ssa_ai_literacy_o_c_h_c_thu_t.json',
        is_public: true,
        wordCount: 14,
        tags: ['AI Literacy', 'Ethics', 'Hallucination'],
        subject: 'SSA101',
        topic: 'AI & Đạo Đức'
      },
      {
        id: 'ssa_time',
        name: 'Chuyên Đề 4: Quản Lý Thời Gian & Mục Tiêu SMART',
        description: 'Mục tiêu SMART, Trì hoãn (Procrastination), Lập kế hoạch theo tuần/kỳ, Tác hại của All-nighter và Multitasking.',
        file_path: '/data/ssa_qu_n_l_th_i_gian_m_c_ti_u_smart.json',
        is_public: true,
        wordCount: 44,
        tags: ['Time Management', 'SMART Goals'],
        subject: 'SSA101',
        topic: 'Quản Lý Thời Gian'
      },
      {
        id: 'ssa_team',
        name: 'Chuyên Đề 5: Làm Việc Nhóm & Giao Tiếp Hiệu Quả',
        description: 'Mô hình phát triển nhóm Tuckman (Forming, Storming, Norming, Performing), Lắng nghe tích cực, Kỹ năng phản hồi.',
        file_path: '/data/ssa_l_m_vi_c_nh_m_giao_ti_p_hi_u_qu.json',
        is_public: true,
        wordCount: 40,
        tags: ['Tuckman', 'Teamwork', 'Communication'],
        subject: 'SSA101',
        topic: 'Làm Việc Nhóm'
      },
      {
        id: 'ssa_fin',
        name: 'Chuyên Đề 6: Tài Chính Cá Nhân & Định Hướng Nghề Nghiệp',
        description: 'Tài sản (Assets), Nợ (Liabilities), Giá trị ròng (Net Worth), Hoạch định tài chính sinh viên, Chu trình nghề nghiệp.',
        file_path: '/data/ssa_t_i_ch_nh_c_nh_n_nh_h_ng_ngh_nghi_p.json',
        is_public: true,
        wordCount: 19,
        tags: ['Finance', 'Net Worth', 'Career'],
        subject: 'SSA101',
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
  }
];

const getSubjectIcon = (iconName?: string) => {
  const item = SUBJECT_ICONS.find((i) => i.name === iconName);
  return item ? item.Icon : BookOpen;
};

export default function QuizzesPage() {
  const router = useRouter();
  const { selectedQuizPath, setSelectedQuizPath, activeCustomQuiz, setActiveCustomQuiz } = useQuizStore();
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('all');
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTextParserOpen, setIsTextParserOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<CustomSubject | null>(null);
  const [modalDefaultSubject, setModalDefaultSubject] = useState<string | undefined>(undefined);

  const refreshData = () => {
    setCustomQuizzes(StorageEngine.getCustomQuizzes());
    setCustomSubjects(StorageEngine.getCustomSubjects());
  };

  useEffect(() => {
    refreshData();
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

  const handleSelectCustomQuiz = (quiz: CustomQuiz) => {
    setActiveCustomQuiz(quiz);
  };

  const handleStartExamCustom = (quiz: CustomQuiz, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(quiz);
    router.push('/session/exam');
  };

  const handleStartDrillCustom = (quiz: CustomQuiz, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(quiz);
    router.push('/session/drill');
  };

  const handleDeleteCustomQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bộ đề tự tạo này?')) {
      StorageEngine.deleteCustomQuiz(id);
      refreshData();
      if (activeCustomQuiz?.id === id) {
        setActiveCustomQuiz(null);
      }
    }
  };

  const handleOpenAddQuiz = (subjectCode?: string, mode: 'parser' | 'ai' = 'parser') => {
    setModalDefaultSubject(subjectCode);
    if (mode === 'parser') {
      setIsTextParserOpen(true);
    } else {
      setIsAIModalOpen(true);
    }
  };

  const handleEditCustomSubject = (sub: CustomSubject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(sub);
    setIsSubjectModalOpen(true);
  };

  const handleDeleteCustomSubject = (sub: CustomSubject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa môn học "${sub.title} (${sub.subjectCode})"? Các đề thi thuộc môn này vẫn được bảo lưu an toàn.`
      )
    ) {
      StorageEngine.deleteCustomSubject(sub.id);
      refreshData();
      if (activeSubjectTab === `custom_${sub.id}`) {
        setActiveSubjectTab('all');
      }
    }
  };

  const isAll = activeSubjectTab === 'all';
  const filteredDefaultSections = isAll
    ? QUESTION_BANKS
    : QUESTION_BANKS.filter((s) => s.id === activeSubjectTab);

  const filteredCustomSubjects = isAll
    ? customSubjects
    : customSubjects.filter((s) => `custom_${s.id}` === activeSubjectTab);

  // Unassigned custom quizzes (quizzes not matching custom subjects or default subjects)
  const knownCodes = new Set([
    'CSI106',
    'SSA101',
    'PRF192',
    ...customSubjects.map((s) => s.subjectCode),
  ]);
  const unassignedCustomQuizzes = customQuizzes.filter(
    (q) => !q.subject || !knownCodes.has(q.subject)
  );

  const renderCustomQuizCard = (quiz: CustomQuiz) => {
    const isSelected = activeCustomQuiz?.id === quiz.id;
    return (
      <div
        key={quiz.id}
        onClick={() => handleSelectCustomQuiz(quiz)}
        className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
          isSelected
            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-glow'
            : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {quiz.subject || 'Tự tạo'}
              </span>
              {quiz.topic && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {quiz.topic}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isSelected ? (
                <span className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> Đang Học
                </span>
              ) : null}
              <button
                onClick={(e) => handleDeleteCustomQuiz(quiz.id, e)}
                title="Xóa bộ đề"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-indigo-500 transition-colors line-clamp-1">
            {quiz.name}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {quiz.description ||
              `Được tạo lúc ${new Date(quiz.created_at).toLocaleDateString('vi-VN')}`}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {quiz.words.length} Câu hỏi
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => handleStartDrillCustom(quiz, e)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Luyện tập
            </button>
            <button
              onClick={(e) => handleStartExamCustom(quiz, e)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-white" /> Thi thử
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 md:py-10 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-500" />
            Ngân Hàng Đề Thi & Chuyên Đề Phân Loại
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Quản lý linh hoạt môn học, đề thi chuyên đề chính khóa và các môn tùy chỉnh (MAD101, SWE201, MAS291...)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <button
            onClick={() => {
              setEditingSubject(null);
              setIsSubjectModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all text-sm"
            title="Thêm môn học mới theo chương trình của bạn"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Thêm Môn Học</span>
          </button>

          <button
            onClick={() => handleOpenAddQuiz(undefined, 'parser')}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all text-sm"
            title="Dán nội dung từ Word, PDF, Web để tự động bóc tách thành bộ đề thi"
          >
            <FileText className="w-4 h-4" />
            <span>Nhập Đề Nhanh (Word/Text)</span>
          </button>

          <button
            onClick={() => handleOpenAddQuiz(undefined, 'ai')}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold shadow-glow hover:opacity-95 active:scale-95 transition-all text-sm"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Tạo Bộ Đề Bằng AI</span>
          </button>
        </div>
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

        {/* Dynamic Custom Subject Tabs */}
        {customSubjects.map((sub) => {
          const Icon = getSubjectIcon(sub.iconName);
          const tabKey = `custom_${sub.id}`;
          const isSelected = activeSubjectTab === tabKey;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubjectTab(tabKey)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-glow'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.subjectCode}</span>
            </button>
          );
        })}

        {/* Quick Add Subject Tab Button */}
        <button
          onClick={() => {
            setEditingSubject(null);
            setIsSubjectModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border border-dashed border-indigo-400/60 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Thêm Môn</span>
        </button>
      </div>

      {/* Render Custom Subject Sections */}
      {filteredCustomSubjects.map((sub) => {
        const Icon = getSubjectIcon(sub.iconName);
        const subjectQuizzes = customQuizzes.filter(
          (q) => q.subject === sub.subjectCode
        );

        return (
          <div key={sub.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${sub.color} flex items-center justify-center text-white shadow-lg shrink-0`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {sub.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {sub.subjectCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {sub.description ||
                      `${subjectQuizzes.length} bộ đề thi và chuyên đề luyện tập.`}
                  </p>
                </div>
              </div>

              {/* Subject Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleOpenAddQuiz(sub.subjectCode, 'parser')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  title="Nhập đề trắc nghiệm cho môn học này"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Nhập Đề</span>
                </button>

                <button
                  onClick={() => handleOpenAddQuiz(sub.subjectCode, 'ai')}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  title="Tạo đề bằng Gemini AI cho môn này"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo Bằng AI</span>
                </button>

                <button
                  onClick={(e) => handleEditCustomSubject(sub, e)}
                  title="Chỉnh sửa môn học"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => handleDeleteCustomSubject(sub, e)}
                  title="Xóa môn học"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quizzes Grid for this Subject */}
            {subjectQuizzes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-5">
                {subjectQuizzes.map((quiz) => renderCustomQuizCard(quiz))}
              </div>
            ) : (
              <div className="p-8 rounded-3xl border border-dashed border-slate-700/80 bg-slate-900/20 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-400">
                  Chưa có đề thi nào trong môn {sub.subjectCode} ({sub.title}).
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleOpenAddQuiz(sub.subjectCode, 'parser')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Dán văn bản Word / PDF</span>
                  </button>
                  <button
                    onClick={() => handleOpenAddQuiz(sub.subjectCode, 'ai')}
                    className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sinh đề tự động bằng AI</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Render Default Subject Sections */}
      <div className="space-y-10">
        {filteredDefaultSections.map((section) => {
          const SectionIcon = section.icon;
          // Quizzes in this default subject created by user
          const matchingCustomQuizzes = customQuizzes.filter(
            (q) => q.subject === section.subjectCode
          );

          return (
            <div key={section.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${section.color} flex items-center justify-center text-white shadow-md`}
                  >
                    <SectionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {section.quizzes.length + matchingCustomQuizzes.length} Bộ đề thi & chuyên đề
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddQuiz(section.subjectCode, 'parser')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    title={`Thêm đề thi cho môn ${section.subjectCode}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>+ Thêm Đề</span>
                  </button>
                </div>
              </div>

              {/* Grid of Quizzes in this Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-5">
                {/* User-created quizzes for this default subject */}
                {matchingCustomQuizzes.map((quiz) => renderCustomQuizCard(quiz))}

                {/* Built-in Official Quizzes */}
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

      {/* Unassigned / Other Custom Quizzes (if any exist) */}
      {isAll && unassignedCustomQuizzes.length > 0 && (
        <div className="space-y-4 p-6 rounded-3xl bg-slate-900/40 dark:bg-slate-900/60 border border-slate-700/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Bộ Đề Tự Tạo Khác
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-extrabold">
                    {unassignedCustomQuizzes.length} đề
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các bộ đề chưa gán theo môn học hoặc môn học khác.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenAddQuiz(undefined, 'parser')}
              className="text-xs font-bold text-indigo-400 hover:underline"
            >
              + Nhập thêm đề
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-5 pt-2">
            {unassignedCustomQuizzes.map((quiz) => renderCustomQuizCard(quiz))}
          </div>
        </div>
      )}

      {/* Custom Subject Create/Edit Modal */}
      {isSubjectModalOpen && (
        <CustomSubjectModal
          isOpen={isSubjectModalOpen}
          editingSubject={editingSubject}
          onClose={() => {
            setIsSubjectModalOpen(false);
            setEditingSubject(null);
          }}
          onSubjectSaved={(saved) => {
            refreshData();
            setActiveSubjectTab(`custom_${saved.id}`);
          }}
        />
      )}

      {/* AI Prompt Modal */}
      {isAIModalOpen && (
        <AIPromptModal
          isOpen={isAIModalOpen}
          defaultSubject={modalDefaultSubject}
          onClose={() => {
            setIsAIModalOpen(false);
            setModalDefaultSubject(undefined);
          }}
          onQuizCreated={(quiz) => {
            refreshData();
            setActiveCustomQuiz(quiz);
          }}
        />
      )}

      {/* Quick Text / Word Parser Modal */}
      {isTextParserOpen && (
        <QuickTextParserModal
          isOpen={isTextParserOpen}
          defaultSubject={modalDefaultSubject}
          onClose={() => {
            setIsTextParserOpen(false);
            setModalDefaultSubject(undefined);
          }}
          onQuizCreated={(quiz) => {
            refreshData();
            setActiveCustomQuiz(quiz);
          }}
        />
      )}
    </div>
  );
}
