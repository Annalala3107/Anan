# AnanQuiz — Astronomy & Constellation Design System (`DESIGN.md`)

Tài liệu này định nghĩa bản sắc thị giác **Thiên hà / Chòm sao / Thiên văn học**, quy tắc phân tầng tương phản và ngôn ngữ chuyển động hai tốc độ cho toàn bộ **AnanQuiz**.

---

## 1. Bản sắc Thị giác: Thiên hà & Thiên văn học (Cosmic Astronomy)

- **Chủ đề cốt lõi:** Bầu trời đêm sâu thẳm, mạng lưới chòm sao (*constellations*), tinh vân ánh sáng dịu (*nebula glow*) và quỹ đạo thiên văn.
- **Quy tắc "3 Giây Đầu" trên Trang chủ:**
  - Hero phải truyền tải ngay: **Thay thế Quizlet — Luyện thi trắc nghiệm đa dạng & Nghe nhạc tập trung chống xao nhãng**.
  - Hiển thị ngay **3 lối vào rõ ràng** (không ẩn trong menu phụ):
    1. *Luyện kho đề có sẵn* (ôn theo môn / SRS / thi thử chuẩn format).
    2. *Dán đề tự do / Đề chưa có đáp án* (vào thi ngay trong 5 giây + AI giải thích bản chất).
    3. *Không gian Nhạc & Pomodoro (Zen Focus Studio)* để vào guồng học ngay.
- **Quy tắc Tiết chế theo Ngữ cảnh (Atmosphere vs. Focus):**
  - *Màn hình Khám phá / Trang chủ / Zen Focus Studio:* Khí quyển thiên văn thể hiện rõ (chòm sao kết nối nhẹ, hào quang tinh vân, đĩa than LP/quỹ đạo, sao băng thưa).
  - *Phòng Làm bài thi / Thư viện dài:* Nền vũ trụ **lùi xuống làm nền tĩnh tối giản** (giảm độ sáng, tắt sao băng gây xao nhãng), khung câu hỏi + code + công thức `KaTeX` dùng nền tương phản cao để cày đề gấp không mỏi mắt.

---

## 2. Design Tokens (Đồng bộ với `tailwind.config.js` & `app/layout.tsx`)

- **Typography:**
  - Chữ giao diện, tiêu đề & điều hướng: `Be Vietnam Pro` (`--font-sans`), hỗ trợ tiếng Việt có dấu sắc nét mọi kích cỡ.
  - Nội dung đọc câu hỏi, đáp án, giải thích & mệnh đề STEM song ngữ: `IBM Plex Sans` (`--font-reading`, `font-reading`), hỗ trợ tập ký tự `vietnamese`, `latin`, `greek`, phân biệt rõ `I/l/1` và `0/O`.
  - Code, đồng hồ, phím tắt, bộ đếm câu, badge mã môn & chỉ mục `(i)/(ii)`: `JetBrains Mono` (`--font-mono`) kèm `tabular-nums` chống nhảy số.
  - Toán học: `KaTeX` (`katex/dist/katex.min.css`), tỷ lệ `1.06em` inline / `1.15em` display, `.katex .mtext` kế thừa `--font-reading`.
- **Bảng màu Thiên văn (Cosmic Dark ưu tiên + hỗ trợ Light Mode):**
  - Nền vũ trụ sâu (`cosmic.bg`): `#080C14`
  - Bề mặt chính (`cosmic.surface`): `#0F172A`
  - Thẻ nổi (`cosmic.card`): `#131D31` • Viền sao tinh tế (`cosmic.border`): `#1E293B`
  - Màu nhấn chính (`primary` — Cosmic Indigo): `#6366F1` (sáng `#818CF8`, đậm `#4F46E5`)
  - Màu nhấn phụ (`secondary` — Nebula Violet): `#8B5CF6` & ánh cyan sao trẻ (`#22D3EE`)
  - Trạng thái ngữ nghĩa:
    - Đúng / Hoàn thành (`success`): `#10B981`
    - Tập trung / Cảnh báo (`warning`): `#F59E0B`
    - Sai / Nguy hiểm (`danger`): `#EF4444`
- **Vật liệu & Độ bo góc:**
  - Thẻ câu hỏi / Bento panel chính: `rounded-2xl` hoặc `rounded-3xl`, viền mảnh `border-white/10` (dark) / `border-slate-200` (light).
  - Nút điều khiển & pill lựa chọn: `rounded-xl` hoặc `rounded-full`.
  - Dùng **1 lớp `backdrop-blur` ngoài cùng** cho dock/modal thay vì lồng nhiều thẻ blur bên trong.

---

## 3. Ngôn ngữ Chuyển động Hai Tốc độ (Dual-Speed Motion Grammar)

Hệ thống chuyển động phân tách rạch ròi theo **mục đích hành động** để vừa "đã mắt" vừa không cản tay sinh viên ôn gấp:

| Ngữ cảnh | Thời lượng & Đường cong | Mục đích & Quy tắc |
|---|---|---|
| **Tương tác học & thi** (chọn đáp án, qua câu, nộp bài, mở modal dán đề) | **`120–180ms`** `cubic-bezier(0.22, 1, 0.36, 1)` | **Siêu dứt khoát, không độ trễ.** Tuyệt đối không bắt chờ hiệu ứng bay/lật mới nhận click tiếp theo. |
| **Chuyển tab / Sliding Pill / Đổi cảnh** | **`260–320ms`** `ease-out` | Thanh trượt ngang GPU (`translate3d`) dẫn hướng mắt mạch lạc. |
| **Không gian Thiên văn & Zen Music** (chòm sao, đĩa than, tay kim, đồng hồ) | **`420–700ms+`** êm sâu / lò xo nhẹ (`cubic-bezier(0.34, 1.42, 0.64, 1)`) | Tạo cảm giác thư giãn sâu, vật lý cơ khí thật (tay kim hạ đĩa, ánh sáng đứng yên trên đĩa quay). |
| **Ăn mừng Chuỗi đúng / Xong phiên học** | Hiệu ứng **chòm sao phát sáng / sao băng lướt / vòng tỏa milestone** | Giữ bản sắc thiên văn thanh lịch, không lạm dụng pháo hoa lòe loẹt che mất nội dung bài giải. |

---

## 4. Danh sách "Cấm làm" (UI/UX Anti-Patterns)

1. **Cấm cắt tên bài hát / tiêu đề đề thi bằng `...` quá sớm** khi hai bên vẫn còn thừa khoảng trống; không để badge trạng thái bị gãy thành 2 dòng dọc.
2. **Cấm dùng checkbox, radio hay range thumb mặc định lệch tông của trình duyệt** trong các màn hình dark/glass studio — phải dùng custom switch (`role="switch"`) hoặc slider dùng `clip-path` căn tâm tuyệt đối.
3. **Cấm đặt chữ/mặt từ thumbnail YouTube thô làm nền** gây đục chữ và rối mắt (phải tán sắc thành Liquid Mesh Canvas + vignette).
4. **Cấm nhồi màn hình chờ AI chặn người dùng** khi nhập bộ đề lớn chưa có đáp án.
5. **Cấm animate `width`, `height`, `top`, `left`, `box-shadow` hay `filter: blur(...)` liên tục mỗi khung hình** — mọi animation liên tục chỉ chạy trên `transform`, `opacity`, `clip-path`, và phải tắt sạch khi bật `prefers-reduced-motion`.
6. **Cấm ép người học đăng nhập/tạo tài khoản** mới được thử đề hoặc nghe nhạc.
