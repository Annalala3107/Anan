# 🌟 AnanQuiz — Open-Source Smart Quiz & Flashcard Platform

> Dự án mã nguồn mở thay thế toàn diện cho Quizlet và Anki, tối ưu cho ôn luyện từ vựng SAT, IELTS, TOEIC và học thuật. Được thiết kế với kiến trúc **Next.js 14 App Router**, thuật toán **Spaced Repetition (SM-2)**, giao diện **Cosmic Dark & Glassmorphism**, và khả năng **tạo đề trắc nghiệm bằng AI chỉ trong 1 click**.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Optional%20Sync-3ecf8e?style=for-the-badge&logo=supabase)

---

## 🎯 Mục Đích & Triết Lý Dự Án

Thị trường học từ vựng hiện nay tràn ngập các ứng dụng thu phí đắt đỏ hoặc giới hạn tính năng (Quizlet Plus, Memrise, Anki giao diện cũ). **AnanQuiz** được phát triển nhằm mục đích:
1. **100% Miễn Phí & Mã Nguồn Mở**: Phục vụ cộng đồng học sinh, sinh viên và lập trình viên.
2. **Kiến Trúc Chuẩn Công Nghệ Mới**: Làm tài liệu học tập thực chiến về Next.js 14 App Router, TypeScript, Zustand, Tailwind CSS, và Web Speech API.
3. **Local-First (Chạy Ngay Không Cần Cấu Hình)**: Hoạt động mượt mà ngay trên LocalStorage/IndexedDB mà không bắt buộc phải có tài khoản đám mây hay API key. Khi cần, có thể kích hoạt Supabase PostgreSQL chỉ với 2 dòng biến môi trường.
4. **Trải Nghiệm UX/UI Đẳng Cấp**: Phong cách Cosmic Space hiện đại, thẻ lật 3D, âm thanh phát âm bản ngữ, phím tắt nhanh và hiệu ứng chúc mừng (confetti).

---

## ✨ 4 Chế Độ Học Thông Minh (Intelligent Study Modes)

| Chế độ | Biểu tượng | Mô tả kỹ thuật & Trải nghiệm học |
| :--- | :---: | :--- |
| **Học Tập (Learn)** | 🧠 | **Phương pháp 3 bước vi mô (Microlearning)**:<br>• **Vòng 1 (Recall)**: Lật thẻ 3D ghi nhớ từ, phát âm bản xứ, đánh giá [1] Chưa nhớ / [2] Đã thuộc.<br>• **Vòng 2 (Simple Usage)**: Điền từ vào câu ví dụ thực tế.<br>• **Vòng 3 (Contrast)**: Phân biệt từ vựng với các từ đồng nghĩa và từ dễ gây nhầm lẫn. |
| **Luyện Ngữ Cảnh (Drill)** | 🏋️ | Điền từ vào ngữ cảnh học thuật với **giải thích chi tiết tức thì** (tại sao chọn từ này, bẫy nằm ở đâu). Hỗ trợ phím tắt `1, 2, 3, 4` và `Enter`. |
| **Thi Thử SAT (Exam)** | 🏆 | Mô phỏng bài thi SAT chuẩn hoá: Có đồng hồ đếm ngược, bảng điều hướng câu hỏi, chấm điểm tự động và bảng phân tích chi tiết từng câu làm đúng/sai. |
| **Khắc Phục Lỗi (Mistakes)** | ⚠️ | Thuật toán SRS tự động gom các từ bạn từng làm sai hoặc có chỉ số ghi nhớ thấp để củng cố đến khi hoàn toàn thành thạo. |

---

## 🤖 Tạo Bộ Đề Bằng AI (ChatGPT / Claude / Gemini)

Bạn có thể tự tạo bộ đề ôn luyện về bất kỳ chủ đề nào (SAT, IELTS 8.0, Y khoa, Lập trình...) chỉ bằng cách gửi prompt sau cho bất kỳ AI nào:

```text
Give me 15 advanced SAT/IELTS vocabulary words about "Technology and Society". Format the response STRICTLY as a valid JSON array like this:
[
  {
    "word": "ubiquitous",
    "ipa": "/juːˈbɪk.wɪ.təs/",
    "vi": "phổ biến, có mặt ở khắp mọi nơi",
    "synonyms": ["omnipresent", "pervasive"],
    "simple_examples": ["Smartphones have become ubiquitous in daily life."],
    "advanced_example": "The ubiquitous adoption of AI has restructured modern academic discourse.",
    "confusions": ["unique", "ambiguous"]
  }
]
Do not include any markdown backticks or text outside the JSON array.
```

Sau đó bấm **"Tạo Bộ Đề Bằng AI"** trong app &rarr; Dán JSON &rarr; Bắt đầu học ngay lập tức!

---

## 📐 Thuật Toán Lặp Lại Ngắt Quãng (Spaced Repetition - SM-2)

Trong file `lib/srs.ts`, hệ thống áp dụng biến thể của thuật toán **SuperMemo SM-2**:
* **Hệ số dễ (Ease Factor - $EF$)**: Mặc định $2.5$.
* **Khoảng cách ôn tập ($I$)**:
  $$I(1) = 1 \text{ ngày}, \quad I(2) = 3 \text{ ngày}, \quad I(n) = I(n-1) \times EF$$
* Khi trả lời đúng chất lượng cao (Easy / Correct), $EF$ tăng và khoảng cách ôn dài ra.
* Khi trả lời sai (Hard / Wrong), từ vựng bị reset về chu kỳ 1 ngày và tăng điểm phạt chuỗi sai (`wrongStreak`).
* Từ đạt độ nhớ $\ge 80\%$ qua ít nhất 3 lần kiểm tra sẽ được chứng nhận **Đã Thành Thạo (Mastered)**.

---

## 🎨 Hệ Thống Thiết Kế UX/UI (Design System Tokens)

* **Primary (Cosmic Indigo)**: `#6366F1`
* **Success (Emerald Green)**: `#10B981` (Dùng cho câu trả lời đúng, thẻ hoàn thành)
* **Warning (Amber Gold)**: `#F59E0B` (Dùng cho chuỗi streak, từ cần củng cố)
* **Danger (Rose Red)**: `#EF4444` (Dùng cho lỗi sai, đếm ngược thi)
* **Background**: `#080C14` (Cosmic Slate Dark) kèm canvas hạt sao chuyển động nhẹ (`Starfield.tsx`).
* **Typography**: `Plus Jakarta Sans` cho nội dung tổng thể và `JetBrains Mono` cho phiên âm quốc tế & phím tắt.
* **Tương tác**: Phím tắt `Space` lật thẻ, `1, 2, 3, 4` chọn đáp án, `Enter` qua câu mới.

---

## 🚀 Cài Đặt & Chạy Dự Án

### Yêu Cầu Hệ Thống:
* Node.js $\ge 18$
* Trình duyệt hiện đại (Chrome, Edge, Firefox, Safari)

### Khởi Chạy Local:
```bash
# 1. Di chuyển vào thư mục dự án
cd e:\AnanQuiz

# 2. Cài đặt thư viện (nếu chưa cài)
npm install

# 3. Khởi chạy máy chủ phát triển
npm run dev
```

Truy cập: [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Cấu Trúc Mã Nguồn (Architecture Overview)

```
e:\AnanQuiz/
├── app/
│   ├── layout.tsx             # Layout chung, Starfield canvas, Header, BottomNav
│   ├── globals.css            # Tailwind directives, glassmorphism, scrollbar
│   ├── page.tsx               # Dashboard: Tiến độ, 4 thẻ học, tra cứu từ vựng
│   ├── quizzes/page.tsx       # Quản lý bộ đề có sẵn, bộ đề tự tạo, mở modal AI
│   ├── library/page.tsx       # Kho từ vựng, tìm kiếm, lọc theo trạng thái
│   ├── profile/page.tsx       # Phân tích thống kê SRS, trạng thái Local/Supabase
│   └── session/[mode]/page.tsx# Điều hướng động cho 4 chế độ luyện tập
├── components/
│   ├── Header.tsx             # Thanh menu, badge streak, nút bật tắt âm thanh & theme
│   ├── BottomNav.tsx          # Thanh điều hướng ngón tay cái cho màn hình di động
│   ├── Starfield.tsx          # Hiệu ứng nền vũ trụ không gian
│   ├── WordModal.tsx          # Modal chi tiết từ vựng, phát âm, ví dụ, từ gây bẫy
│   ├── LaTeX.tsx              # Hỗ trợ hiển thị công thức toán/khoa học qua KaTeX
│   ├── study/
│   │   ├── LearnMode.tsx      # Chế độ 3 bước: Thẻ lật 3D, ngữ cảnh, phân biệt
│   │   ├── DrillMode.tsx      # Luyện điền từ với giải thích chi tiết tức thì
│   │   ├── ExamMode.tsx       # Thi thử tính giờ SAT, phiếu điểm chi tiết
│   │   └── MistakesMode.tsx   # Tập trung ôn các từ hay sai theo SRS
│   └── ai/
│       └── AIPromptModal.tsx  # Copy prompt 1-click & import JSON từ AI
├── lib/
│   ├── types.ts               # Định nghĩa TypeScript toàn diện
│   ├── srs.ts                 # Thuật toán Spaced Repetition (SuperMemo SM-2)
│   ├── storage.ts             # Bộ xử lý LocalStorage kèm cấu trúc đồng bộ
│   ├── speech.ts              # Trình đọc phát âm bản ngữ (Web Speech API)
│   ├── quizStore.ts           # State store quản lý qua Zustand
│   └── supabase.ts            # Client Supabase với cơ chế fallback tự động
├── public/sat/
│   ├── vi-en-ielts.json       # Bộ từ vựng IELTS/SAT Tiếng Việt đặc sắc
│   ├── 1.json                 # SAT Core Set 1
│   ├── 2.json                 # SAT Advanced Set 2
│   └── archaic.json           # Từ vựng văn học cổ
└── supabase_schema.sql        # Kịch bản tạo bảng PostgreSQL và RLS policies
```

---

## 🎓 Bài Tập Mở Rộng Dành Cho Lập Trình Viên Học Tập

Nếu bạn clone dự án này để rèn luyện kỹ năng, hãy thử thách bản thân với các bài tập sau:
1. **Thêm Audio Ghi Âm Của Người Học**: Dùng `MediaRecorder API` để người học thu âm giọng đọc và so sánh với phát âm mẫu.
2. **Xuất Thẻ Sang File Anki (`.apkg`)**: Viết một tiện ích chuyển đổi danh sách từ vựng thành định dạng Anki deck.
3. **Thêm Gemini API Key Trực Tiếp**: Tích hợp gọi trực tiếp `@google/genai` để người dùng không cần copy-paste mà AI sinh đề ngay trong ứng dụng.
4. **Chia Sẻ Bộ Đề Bằng Mã QR**: Dùng thư viện sinh QR code để quét và mở bộ đề trên điện thoại.

---

## 📄 Bản Quyền
Phát hành theo giấy phép **MIT License**. Tự do sử dụng, chỉnh sửa và đóng góp cho cộng đồng!
