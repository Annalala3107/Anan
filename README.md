# 🌟 AnanQuiz — Nền Tảng Ôn Thi Trắc Nghiệm Học Thuật & Đề Thi Đại Học Thông Minh

> Hệ thống luyện thi trắc nghiệm học thuật mã nguồn mở, hoạt động theo triết lý **Local-First**, hỗ trợ thuật toán **Spaced Repetition (SuperMemo SM-2)**, tích hợp **Tạo đề thi bằng AI (Google Gemini Flash)**, **Bộ bóc tách đề thi từ văn bản thô (Quick Text Parser)**, và bộ giải mã cú pháp code C chuyên biệt.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash%20AI-8e75ff?style=for-the-badge&logo=google)

---

## 🎯 Mục Đích & Triết Lý Dự Án

Sinh viên đại học khối ngành Công nghệ & Kỹ thuật thường xuyên phải đối mặt với các kỳ thi trắc nghiệm chuyên ngành nặng tính lý thuyết lẫn bài tập lập trình (Kiến trúc máy tính, Hệ số bù 2, Con trỏ C, Quản lý bộ nhớ...). **AnanQuiz** được thiết kế nhằm giải quyết bài toán ôn thi hiệu quả, tối ưu thời gian với các tiêu chí cốt lõi:

1. **100% Miễn Phí & Mã Nguồn Mở**: Phục vụ cộng đồng học sinh, sinh viên các trường đại học và cao đẳng.
2. **Local-First (Chạy Ngay Không Cần Máy Chủ)**: Hoạt động trơn tru ngay trên trình duyệt thông qua LocalStorage. Dữ liệu tiến độ học tập, lịch sử thi cử được lưu trữ bảo mật trên thiết bị của bạn với tính năng Xuất/Nhập file JSON sao lưu 1-click.
3. **Ngân Hàng Đề Thi Chuẩn Hóa Sẵn Có (970+ Câu Hỏi)**:
   * **CSI106 / CEA201**: Kiến trúc máy tính (347 câu: Hệ thống số, Bù 2, Von Neumann, Mạng, OS, CTDL&GT).
   * **PRF192**: Lập trình C căn bản & nâng cao (253 câu: Vòng lặp, Con trỏ, Cấp phát động, Chuỗi, File I/O).
   * **SSA101 / SSL101**: Kỹ năng học tập đại học & Tư duy phản biện (370 câu: Bloom, Trí nhớ, AI Literacy, Quản lý thời gian, SMART).
4. **Tích Hợp Công Cụ Soạn Đề Mạnh Mẽ**: Tự động sinh đề qua Google Gemini API hoặc dán trực tiếp văn bản thô từ Word/PDF vào ứng dụng.
5. **Âm Thanh Học Tập Không Độ Trễ**: Sử dụng Web Audio API tổng hợp âm thanh hiệu ứng (SFX) và sóng não Alpha (`alpha_drone`) hỗ trợ tập trung mà không tốn dung lượng tải file âm thanh.

---

## ✨ 4 Chế Độ Học & Ôn Thi Chuyên Sâu

| Chế độ | Biểu tượng | Mô tả trải nghiệm & Cơ chế vận hành |
| :--- | :---: | :--- |
| **Cày Phản Xạ (Learn)** | ⚡ | **Cơ chế ghi nhớ phản xạ cao tốc (Rapid Muscle Memory)**:<br>• Nhìn câu hỏi → Bấm phím chọn đáp án ngay (`1-4` hoặc `A-D`). Khi chọn đúng, hệ thống tự động lướt qua câu mới cực nhanh trong **0.4 giây**.<br>• Khi chọn **SAI**, đáp án chuẩn lập tức hiển thị và câu hỏi sẽ **tự động chèn lại sau 3 câu nữa** cho đến khi bạn nhớ chính xác mặt chữ và bản chất. |
| **Luyện Trắc Nghiệm (Drill)** | 🏋️ | Làm trắc nghiệm có **giải thích chi tiết tức thì**: Phân tích vì sao đáp án đó đúng, các phương án nhiễu sai ở đâu. Hỗ trợ phím tắt số `1, 2, 3, 4` và `Enter` để sang câu tiếp theo. |
| **Thi Thử Bấm Giờ (Exam)** | 🏆 | **Mô phỏng kỳ thi trắc nghiệm chuẩn hóa**:<br>• Đồng hồ đếm ngược linh hoạt (hoặc chế độ tự do không giới hạn thời gian).<br>• Đánh dấu câu phân vân (`Flag - Phím F`), bảng điều hướng câu hỏi trực quan.<br>• Cơ chế bảo vệ phòng thi (**Exam Guard**): Ngăn chặn việc bấm nhầm link thoát trang làm mất kết quả thi.<br>• **Bảng phân tích lỗ hổng kiến thức**: Tự động xếp hạng các chuyên đề bạn còn yếu để luyện tập lại ngay lập tức. |
| **Khắc Phục Lỗi (Mistakes)** | ⚠️ | Thuật toán SRS tự động truy vết và gom các câu hỏi bạn từng trả lời sai, có chuỗi sai liên tiếp hoặc độ bền trí nhớ thấp để củng cố đến khi hoàn toàn thành thạo. |

---

## 🤖 2 Cơ Chế Tạo Đề Thi Linh Hoạt

### 1. Tạo Đề Bằng Google Gemini AI
* Hỗ trợ gọi trực tiếp mô hình thế hệ mới: **`gemini-2.5-flash`**, **`gemini-2.0-flash`**, **`gemini-1.5-flash`**.
* Nhập môn học, chủ đề mong muốn và số lượng câu hỏi &rarr; AI tự động biên soạn câu hỏi trắc nghiệm kèm 4 phương án, đáp án chuẩn xác và giải thích sư phạm.
* Lưu API Key trực tiếp trên thiết bị của bạn hoặc cấu hình qua biến môi trường.

### 2. Bộ Bóc Tách Đề Thi Từ Văn Bản Thô (Quick Text Parser)
Không cần viết code hay định dạng phức tạp! Bạn chỉ cần copy bất kỳ đề thi dạng văn bản nào từ tài liệu Word, PDF hoặc bài giảng web:
```text
Câu 1: Đoạn code C sau đây sẽ in ra màn hình giá trị gì?
int x = 5;
printf("%d", ++x);
*A. 6
B. 5
C. 7
D. Lỗi biên dịch
Giải thích: Toán tử tiền tố ++x tăng x lên 1 trước khi giá trị được in ra.
```
Bấm **"Bóc tách & Tạo đề"** &rarr; Hệ thống tự động nhận diện câu hỏi stem, khối code C, các phương án `A, B, C, D`, dấu sao đáp án `*A` hoặc dòng `Đáp án: A`, và lời giải thích!

---

## 📐 Thuật Toán Lặp Lại Ngắt Quãng (Spaced Repetition - SM-2)

Trong file `lib/srs.ts`, hệ thống áp dụng biến thể của thuật toán **SuperMemo SM-2**:
* **Hệ số dễ (Ease Factor - $EF$)**: Mặc định $2.5$.
* **Khoảng cách ôn tập ($I$)**:
  $$I(1) = 1 \text{ ngày}, \quad I(2) = 3 \text{ ngày}, \quad I(n) = I(n-1) \times EF$$
* Định danh câu hỏi dựa trên giải thuật băm FNV-1a đa trường (Question stem + Options + Answer), triệt tiêu hoàn toàn nguy cơ đụng độ khóa (Key Collision) khi lưu trữ tiến trình.
* Khi trả lời đúng (Pass/Mastered), độ bền trí nhớ tăng dần và kéo dài khoảng cách ngày ôn tập.
* Khi làm sai, câu hỏi bị hạ chỉ số ghi nhớ và đưa vào danh sách ưu tiên của chế độ **Mistakes**.

---

## ⌨️ Phím Tắt Tiện Dụng (Keyboard Shortcuts)

| Phím tắt | Tác dụng | Chế độ áp dụng |
| :---: | :--- | :--- |
| **`1, 2, 3, 4`** hoặc **`A, B, C, D`** | Chọn phương án tương ứng | Learn, Drill, Exam, Mistakes |
| **`Enter`** | Chuyển sang câu hỏi tiếp theo / Bắt đầu thi | Learn, Drill, Exam |
| **`Space`** | Lướt qua câu sai sau khi đã đọc đáp án | Learn Mode |
| **`F`** | Bật / tắt cờ đánh dấu câu hỏi phân vân | Exam Mode |
| **`←` / `→`** | Điều hướng câu hỏi trước / câu hỏi sau | Exam Mode |
| **`Z`** | Bật / tắt chế độ tập trung tuyệt đối (Zen Focus HUD) | Toàn bộ phiên học |
| **`Esc`** | Thoát chế độ Zen Focus hoặc đóng Modal | Toàn hệ thống |

---

## 🚀 Cài Đặt & Khởi Chạy

### Yêu Cầu Hệ Thống:
* Node.js $\ge 18.x$
* Trình duyệt hiện đại (Chrome, Edge, Firefox, Brave)

### Các Bước Cài Đặt:
```bash
# 1. Di chuyển vào thư mục dự án
cd e:\AnanQuiz

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Cấu hình biến môi trường (Tùy chọn cho tính năng AI)
cp .env.example .env.local
# Điền GEMINI_API_KEY nếu muốn dùng key mặc định cho server

# 4. Chạy máy chủ phát triển
npm run dev
```

Truy cập: [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Cấu Trúc Mã Nguồn (Architecture Overview)

```
e:\AnanQuiz/
├── app/
│   ├── layout.tsx             # Layout gốc, Header, BottomNav, Canvas nền
│   ├── globals.css            # Tailwind directives, CSS variables, typography
│   ├── page.tsx               # Dashboard tổng quan, tiến độ SRS, điều hướng 4 chế độ
│   ├── quizzes/page.tsx       # Quản lý ngân hàng đề CSI, SSA, PRF & môn tự tạo
│   ├── library/page.tsx       # Tra cứu ngân hàng câu hỏi, bộ lọc chuyên đề & trạng thái
│   ├── profile/page.tsx       # Báo cáo thống kê học tập, xuất/nhập sao lưu JSON
│   ├── session/[mode]/page.tsx# Bộ định tuyến phiên học (learn, drill, exam, mistakes)
│   └── api/ai/generate-quiz/  # API route xử lý sinh đề thi qua Google Gemini API
├── components/
│   ├── Header.tsx             # Menu chính, chỉ báo môn học, kiểm soát thoát phòng thi
│   ├── BottomNav.tsx          # Thanh điều hướng di động (tự ẩn trong bài thi)
│   ├── CodeQuestionRenderer.tsx# Lexer highlight cú pháp ngôn ngữ C/C++ siêu nhẹ
│   ├── QuickTextParserModal.tsx# Giao diện bóc tách đề thi văn bản thô
│   ├── CustomSubjectModal.tsx # Modal tạo và chỉnh sửa môn học cá nhân
│   ├── WordModal.tsx          # Modal xem chi tiết câu hỏi, giải thích và phương án
│   ├── study/
│   │   ├── LearnMode.tsx      # Chế độ cày phản xạ cao tốc (Rapid Active Recall)
│   │   ├── DrillMode.tsx      # Chế độ luyện trắc nghiệm kèm giải thích tức thì
│   │   ├── ExamMode.tsx       # Phòng thi bấm giờ, đánh dấu cờ, phân tích chuyên đề yếu
│   │   ├── MistakesMode.tsx   # Chế độ ôn tập câu sai theo thuật toán SRS
│   │   └── ZenFocusHUD.tsx    # Thanh công cụ Zen, âm thanh sóng não Alpha & bấm giờ
│   └── ai/
│       └── AIPromptModal.tsx  # Modal tạo đề thi bằng Gemini AI & Import JSON
├── lib/
│   ├── types.ts               # Định nghĩa TypeScript toàn diện
│   ├── srs.ts                 # Thuật toán Spaced Repetition (SuperMemo SM-2)
│   ├── storage.ts             # StorageEngine cục bộ kèm kiểm tra an toàn dữ liệu
│   ├── utils.ts               # Hàm băm FNV-1a, tạo khóa chống đụng độ, so khớp đáp án
│   ├── quizHelpers.ts         # Chuẩn hóa câu hỏi thi cử cho các chế độ học
│   ├── sound.ts               # Bộ phát âm thanh Web Audio API thuần (SFX & Binaural)
│   ├── textQuizParser.ts      # Bộ phân tích văn bản thô thông minh client-side
│   └── quizStore.ts           # State store quản lý qua Zustand
└── public/data/               # Ngân hàng đề thi chính thức:
    ├── csi106_all.json        # CSI106 - Trọn bộ 347 câu hỏi Kiến trúc máy tính
    ├── prf192_all.json        # PRF192 - Trọn bộ 253 câu hỏi Lập trình C
    ├── ssa101_all.json        # SSA101 - Trọn bộ 370 câu hỏi Kỹ năng đại học
    └── ...                    # Các file chuyên đề chia nhỏ theo chương
```

---

## 📄 Bản Quyền
Dự án được phát hành theo giấy phép **MIT License**. Tự do sử dụng, chỉnh sửa và đóng góp cho cộng đồng sinh viên!
