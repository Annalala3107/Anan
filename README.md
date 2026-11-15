# AnanQuiz — Nền tảng Ôn Tập & Thi Thử Trắc Nghiệm CNTT

**AnanQuiz** là ứng dụng web xây dựng trên **Next.js 14 (App Router)**, **TypeScript** và **Tailwind CSS**, hỗ trợ sinh viên ôn tập trắc nghiệm các môn Công nghệ Thông tin kết hợp thuật toán **Spaced Repetition (SuperMemo SM-2 & Leitner)**.

---

## Ngân Hàng Đề Thi Mặc Định

Dự án tích hợp sẵn **5 môn học**, tổng cộng **38 bộ đề JSON** (**1.650 câu hỏi duy nhất** / **2.920 lượt câu hỏi**):

| Mã Môn | Tên Môn Học | Số Đề | Số Câu Duy Nhất |
| :--- | :--- | :---: | :---: |
| **CEA201** | Computer Organization & Architecture | 10 | 318 |
| **CSI106** | Introduction to Computer Science | 10 | 524 |
| **SSA101** | Study Skills for Academic Success | 8 | 355 |
| **PRF192** | Programming Fundamentals (C) | 6 | 253 |
| **PFP191** | Programming Fundamentals with Python | 4 | 200 |

- Manifest `public/data/index.json` lưu metadata + danh sách khóa câu hỏi để tải danh mục bộ đề tức thì, chỉ nạp toàn bộ file JSON khi mở đề hoặc tra cứu.
- Hỗ trợ tạo thêm **Môn học tùy chỉnh** và **Bộ đề tự tạo** bằng trình tách văn bản nhanh (**Quick Text Parser**) hoặc **AI Tạo Đề (Google Gemini)**.

---

## Tính Năng Cốt Lõi

1. **4 Chế Độ Học & Luyện Tập (`/session/[mode]`)**:
   - **Học (Learn)**: Flashcard 3D lật thẻ (CSS `preserve-3d`) và trắc nghiệm tương tác kèm giải thích chi tiết từng đáp án.
   - **Luyện Tập (Drill)**: Vòng lặp ôn tập liên tục, tăng chuỗi combo và ưu tiên các câu hay sai.
   - **Thi Thử (Exam)**: Mô phỏng bài thi có đếm giờ, xác nhận thoát an toàn và lưu lịch sử điểm vào Hồ sơ.
   - **Khắc Phục Lỗi (Mistakes)**: Lọc riêng những câu sai liên tục theo điểm SM-2, hỗ trợ đảo đáp án chống nhớ vẹt và phím tắt `1–9` / `Enter`.
2. **Tra Cứu Nhanh (`/library`)**: Tìm kiếm tức thì nội dung câu hỏi, đáp án đúng và giải thích trong bộ đề đang chọn, kèm trạng thái SRS từng câu.
3. **Chuyển Dữ Liệu Qua QR / Mã PIN 15 Phút (`/sync`)**:
   - Lưu mã PIN 6 chữ số trên **Upstash Redis** với TTL **15 phút** (`900s`).
   - Áp dụng **Single-claim (`GETDEL`)**: dữ liệu tự hủy ngay sau khi thiết bị đích tải về thành công.
   - Giới hạn kích thước payload (`512 KB`), kiểm tra định dạng nghiêm ngặt bằng **Zod** (`BackupDataSchema` không dùng `z.any()`), và khóa CORS theo origin hợp lệ của ứng dụng.
   - Hỗ trợ quét QR nén `#d=...` trực tiếp (Gzip + Base64) cho payload nhỏ mà không cần máy chủ trung gian.
4. **AI Tạo Đề Bảo Mật (`/api/ai/generate-quiz`)**:
   - Truyền `apiKey` lên Gemini API qua header `x-goog-api-key` thay vì query string URL.
   - Nếu nhập key cá nhân trên trình duyệt, key chỉ lưu tạm trong `sessionStorage` (tự xóa khi đóng tab) kèm nút **Xóa Key ngay** và banner cảnh báo rủi ro.
5. **Tiện Ích Học Tập Tích Hợp**:
   - Trình phát nhạc nền Lo-fi / Pomodoro Focus Timer ở Header (Floating Mini Player ẩn mặc định cho tới khi người dùng chủ động bật).
   - Nền chòm sao tương tác nhẹ nhàng (HUD cài đặt gọn trong trang Hồ sơ `/profile`).
   - Hỗ trợ đầy đủ **Light Mode** và **Dark Mode**.

---

## Cấu Hình Biến Môi Trường

Sao chép `.env.example` thành `.env.local` và điền các giá trị cần thiết:

```bash
# Google Gemini API Key (dùng cho tính năng AI Tạo Đề ở /api/ai/generate-quiz)
GEMINI_API_KEY=

# Upstash Redis REST (bắt buộc cho tính năng Chuyển dữ liệu bằng Mã PIN 15 phút)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# URL công khai của ứng dụng (tùy chọn, dùng khi tạo QR từ môi trường local)
NEXT_PUBLIC_APP_URL=
```

---

## Cài Đặt & Chạy Dự Án

```bash
# Cài đặt dependencies
npm install

# Chạy môi trường development
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

---

## Kiểm Tra Chất Lượng Trước Khi Merge / Deploy

```bash
npm run lint && npx tsc --noEmit && npm run build
```
