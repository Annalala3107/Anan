import { Cpu, GraduationCap, Code2, Layers } from 'lucide-react';
import { QuizSet, CustomQuiz, Word } from './types';

export interface SubjectSection {
  id: string;
  title: string;
  subjectCode: string;
  icon: any;
  color: string;
  quizzes: QuizSet[];
}

export const QUESTION_BANKS: SubjectSection[] = [
  {
    id: 'cea201',
    title: 'Tổ Chức & Kiến Trúc Máy Tính (CEA201)',
    subjectCode: 'CEA201',
    icon: Layers,
    color: 'from-violet-600 to-indigo-600',
    quizzes: [
      {
        id: 'cea_all',
        name: 'CEA201 — Đề Thi Tổng Hợp Toàn Bộ 318 Câu',
        description: 'Trọn bộ 318 câu hỏi trắc nghiệm ôn tập thi cuối kỳ môn Tổ chức và Kiến trúc máy tính (CEA201).',
        file_path: '/data/cea201_all.json',
        is_public: true,
        wordCount: 318,
        tags: ['Full Exam', '318 Câu', 'Official'],
        subject: 'CEA201',
        topic: 'Tổng Hợp'
      },
      {
        id: 'cea_mem',
        name: 'Chuyên Đề 1: Bộ Nhớ Cache, RAID & Lưu Trữ Từ Tính',
        description: 'Ánh xạ Cache (Direct, Associative, Set-Associative), Hamming ECC, SRAM/DRAM/SDRAM/DDR, RAID 0-5, SSD & HDD.',
        file_path: '/data/cea_memory_cache_raid.json',
        is_public: true,
        wordCount: 77,
        tags: ['Cache Mapping', 'Hamming ECC', 'RAID'],
        subject: 'CEA201',
        topic: 'Cache, RAID & Lưu Trữ'
      },
      {
        id: 'cea_isa',
        name: 'Chuyên Đề 2: Tập Lệnh (ISA), Thanh Ghi & Xử Lý Lệnh CPU',
        description: 'Chế độ định địa chỉ (Addressing modes), chu trình lệnh, thanh ghi MAR/MBR/PC/IR, RISC vs CISC, Pipelining, MASM32.',
        file_path: '/data/cea_isa_cpu_pipeline.json',
        is_public: true,
        wordCount: 98,
        tags: ['Addressing', 'RISC/CISC', 'Pipeline'],
        subject: 'CEA201',
        topic: 'ISA, CPU & Pipeline'
      },
      {
        id: 'cea_overview',
        name: 'Chuyên Đề 3: Tổng Quan Kiến Trúc, Hiệu Năng & Xử Lý Song Song',
        description: 'Kiến trúc Von Neumann & IAS, các thế hệ máy tính, định luật Amdahl, MIPS, phân loại Flynn (SISD, SIMD, MIMD), SMP & NUMA.',
        file_path: '/data/cea_overview_parallel.json',
        is_public: true,
        wordCount: 50,
        tags: ['Amdahl', 'Flynn', 'Von Neumann'],
        subject: 'CEA201',
        topic: 'Hiệu Năng & Song Song'
      },
      {
        id: 'cea_os',
        name: 'Chuyên Đề 4: Hỗ Trợ Hệ Điều Hành & Quản Lý Bộ Nhớ Ảo',
        description: 'Tiến trình (Process states), lập lịch (Long/Medium/Short-term scheduling), Phân trang (Paging), Phân đoạn, TLB, MMU, API & ABI.',
        file_path: '/data/cea_os_virtual_memory.json',
        is_public: true,
        wordCount: 22,
        tags: ['Scheduling', 'Paging', 'TLB/MMU'],
        subject: 'CEA201',
        topic: 'HĐH & Bộ Nhớ Ảo'
      },
      {
        id: 'cea_io',
        name: 'Chuyên Đề 5: Hệ Thống Vào/Ra (I/O), Ngắt & Bus',
        description: 'Programmed I/O, Interrupt-driven I/O, DMA, Memory-mapped vs Isolated I/O, Daisy chain, cấu trúc Bus hệ thống.',
        file_path: '/data/cea_io_bus_interrupt.json',
        is_public: true,
        wordCount: 35,
        tags: ['DMA', 'Interrupts', 'System Bus'],
        subject: 'CEA201',
        topic: 'I/O, Ngắt & Bus'
      },
      {
        id: 'cea_logic',
        name: 'Chuyên Đề 6: Đại Số Boolean & Mạch Logic Số',
        description: 'Cổng logic (AND, OR, NOT, NAND, NOR, XOR), định lý DeMorgan, bìa Karnaugh (K-map), dịch bit, xoay bit, số bù 2.',
        file_path: '/data/cea_boolean_logic.json',
        is_public: true,
        wordCount: 36,
        tags: ['Boolean', 'K-Map', 'Bitwise'],
        subject: 'CEA201',
        topic: 'Boolean & Mạch Logic'
      }
    ]
  },
  {
    id: 'csi106',
    title: 'Kiến Trúc Máy Tính (CSI106)',
    subjectCode: 'CSI106',
    icon: Cpu,
    color: 'from-blue-600 to-indigo-600',
    quizzes: [
      {
        id: 'csi_all',
        name: 'CSI106 — Đề Thi Tổng Hợp Toàn Bộ 344 Câu',
        description: 'Trọn bộ 344 câu hỏi trắc nghiệm ôn tập thi cuối kỳ môn Kiến trúc máy tính (CSI106).',
        file_path: '/data/csi106_all.json',
        is_public: true,
        wordCount: 344,
        tags: ['Full Exam', '344 Câu', 'Official'],
        subject: 'CSI106',
        topic: 'Tổng Hợp'
      },
      {
        id: 'csi_num',
        name: 'Chuyên Đề 1: Hệ Thống Số & Biểu Diễn Dữ Liệu',
        description: 'Chuyển đổi Nhị phân, Bát phân, Thập lục phân, Số bù 2, Dấu phẩy động Excess-127, Phép toán logic.',
        file_path: '/data/csi_h_th_ng_s_bi_u_di_n_d_li_u.json',
        is_public: true,
        wordCount: 65,
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
        wordCount: 29,
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
        wordCount: 56,
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
        wordCount: 38,
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
        wordCount: 62,
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
        wordCount: 75,
        tags: ['Relational DB', 'SDLC', 'Agile'],
        subject: 'CSI106',
        topic: 'CSDL & Phần Mềm'
      },
      {
        id: 'csi_gen',
        name: 'Chuyên Đề 7: Kiến Trúc Máy Tính Chung',
        description: 'Mô hình Turing, Đạo đức CNTT (Computer Ethics), Sở hữu trí tuệ (Intellectual Property) & Trí tuệ nhân tạo (AI).',
        file_path: '/data/csi_ki_n_tr_c_m_y_t_nh_chung.json',
        is_public: true,
        wordCount: 19,
        tags: ['Turing Model', 'Ethics', 'AI'],
        subject: 'CSI106',
        topic: 'Kiến Trúc Máy Tính Chung'
      },
      {
        id: 'csi_su26_b5_fe',
        name: 'Đề Thi CSI106 — SU26 - B5 - FE (60 Câu)',
        description: 'Bộ 60 câu hỏi đề thi CSI106 - SU26 - B5 - FE kèm đáp án và giải thích chi tiết bằng tiếng Anh.',
        file_path: '/data/csi106_su26_b5_fe.json',
        is_public: true,
        wordCount: 60,
        tags: ['SU26', 'B5 - FE', '60 Câu'],
        subject: 'CSI106',
        topic: 'SU26 - B5 - FE'
      },
      {
        id: 'csi_su26_fe',
        name: 'Đề Thi CSI106 — SU26 - FE (60 Câu)',
        description: 'Bộ 60 câu hỏi đề thi CSI106 - SU26 - FE kèm đáp án và giải thích chi tiết bằng tiếng Anh.',
        file_path: '/data/csi106_su26_fe.json',
        is_public: true,
        wordCount: 60,
        tags: ['SU26', 'FE', '60 Câu'],
        subject: 'CSI106',
        topic: 'SU26 - FE'
      },
      {
        id: 'csi_su26_re',
        name: 'Đề Thi CSI106 — SU26 - RE (60 Câu)',
        description: 'Bộ 60 câu hỏi đề thi CSI106 - SU26 - RE kèm đáp án và giải thích chi tiết bằng tiếng Anh.',
        file_path: '/data/csi106_su26_re.json',
        is_public: true,
        wordCount: 60,
        tags: ['SU26', 'RE', '60 Câu'],
        subject: 'CSI106',
        topic: 'SU26 - RE'
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
        name: 'SSA101 — Đề Thi Tổng Hợp Toàn Bộ 355 Câu',
        description: 'Trọn bộ 355 câu hỏi trắc nghiệm ôn tập môn Kỹ năng học tập đại học và ứng dụng AI (SSA101).',
        file_path: '/data/ssa101_all.json',
        is_public: true,
        wordCount: 355,
        tags: ['Full Exam', '355 Câu', 'Official'],
        subject: 'SSA101',
        topic: 'Tổng Hợp'
      },
      {
        id: 'ssa_crit',
        name: 'Chuyên Đề 1: Tư Duy Phản Biện & Phân Tích',
        description: 'Analytical thinking, Critical thinking, Thang đo Bloom, Giải quyết vấn đề (Problem-solving), Đánh giá nguồn tin.',
        file_path: '/data/ssa_t_duy_ph_n_bi_n_ph_n_t_ch.json',
        is_public: true,
        wordCount: 69,
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
        wordCount: 75,
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
        wordCount: 35,
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
        wordCount: 45,
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
        wordCount: 49,
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
        wordCount: 29,
        tags: ['Finance', 'Net Worth', 'Career'],
        subject: 'SSA101',
        topic: 'Tài Chính & Nghề Nghiệp'
      },
      {
        id: 'ssa_gen',
        name: 'Chuyên Đề 7: Kỹ Năng Học Đại Học Chung',
        description: 'Chuyển tiếp lên đại học, Chương trình ẩn (Hidden Curriculum), Digital Literacy, Học trực tuyến & ePortfolio.',
        file_path: '/data/ssa_k_n_ng_h_c_i_h_c_chung.json',
        is_public: true,
        wordCount: 53,
        tags: ['College Life', 'Digital Literacy', 'ePortfolio'],
        subject: 'SSA101',
        topic: 'Kỹ Năng Học Đại Học Chung'
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
        wordCount: 49,
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
        wordCount: 29,
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
        wordCount: 33,
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
        wordCount: 66,
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
        wordCount: 34,
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
        wordCount: 30,
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
        wordCount: 12,
        tags: ['File I/O', 'fopen', 'rewind'],
        subject: 'PRF192',
        topic: 'Tệp Tin'
      }
    ]
  },
  {
    id: 'pfp191',
    title: 'PFP191',
    subjectCode: 'PFP191',
    icon: Code2,
    color: 'from-sky-600 to-indigo-600',
    quizzes: [
      {
        id: 'pfp191_sp26_fe',
        name: 'PFP191 - SP26 - FE',
        description: 'Trọn bộ 50 câu hỏi đề thi PFP191 - SP26 - FE kèm đáp án và giải thích chi tiết bằng tiếng Anh.',
        file_path: '/data/pfp191_sp26_fe.json',
        is_public: true,
        wordCount: 50,
        tags: ['SP26', 'FE', '50 Câu'],
        subject: 'PFP191',
        topic: 'SP26 - FE'
      },
      {
        id: 'pfp191_su26_fe',
        name: 'PFP191 - SU26 - FE',
        description: 'Trọn bộ 50 câu hỏi đề thi PFP191 - SU26 - FE kèm đáp án và giải thích chi tiết bằng tiếng Anh.',
        file_path: '/data/pfp191_su26_fe.json',
        is_public: true,
        wordCount: 50,
        tags: ['SU26', 'FE', '50 Câu'],
        subject: 'PFP191',
        topic: 'SU26 - FE'
      },
      {
        id: 'pfp191_su26_re',
        name: 'PFP191 - SU26 - RE',
        description: 'Trọn bộ 50 câu hỏi đề thi PFP191 - SU26 - RE kèm đáp án và giải thích chi tiết bằng tiếng Anh.',
        file_path: '/data/pfp191_su26_re.json',
        is_public: true,
        wordCount: 50,
        tags: ['SU26', 'RE', '50 Câu'],
        subject: 'PFP191',
        topic: 'SU26 - RE'
      }
    ]
  }
];

export function findQuizByPath(path: string): QuizSet | undefined {
  if (!path) return undefined;
  for (const section of QUESTION_BANKS) {
    const found = section.quizzes.find((q) => q.file_path === path);
    if (found) return found;
  }
  return undefined;
}

export function getQuizDisplayName(
  path?: string,
  activeCustomQuiz?: CustomQuiz | null,
  fallbackWords?: Word[]
): { title: string; shortName: string; subject: string; count?: number } {
  if (activeCustomQuiz) {
    const subj = activeCustomQuiz.subject || 'Bộ đề tự tạo';
    return {
      title: activeCustomQuiz.name,
      shortName: activeCustomQuiz.name,
      subject: subj,
      count: activeCustomQuiz.words?.length,
    };
  }

  if (path) {
    const matched = findQuizByPath(path);
    if (matched) {
      return {
        title: matched.name,
        shortName: `${matched.subject} - ${matched.topic}`,
        subject: matched.subject || 'Chuyên đề',
        count: matched.wordCount,
      };
    }
  }

  if (fallbackWords && fallbackWords.length > 0) {
    const first = fallbackWords[0];
    const subj = first.subject || 'Bộ câu hỏi';
    const topic = first.topic || 'Tổng hợp';
    return {
      title: `${subj} — ${topic} (${fallbackWords.length} câu)`,
      shortName: `${subj} - ${topic}`,
      subject: subj,
      count: fallbackWords.length,
    };
  }

  return {
    title: 'Tổ Chức & Kiến Trúc Máy Tính (CEA201) — Đề Tổng Hợp',
    shortName: 'CEA201 - Full (318 câu)',
    subject: 'CEA201',
  };
}
