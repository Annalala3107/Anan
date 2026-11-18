# AnanQuiz — Project Rules, Architecture & UX Design Contract

Tài liệu này là quy ước bắt buộc cho mọi phiên làm việc trên kho mã nguồn **AnanQuiz**. Trước khi thiết kế hoặc chỉnh sửa bất kỳ giao diện hay luồng hệ thống nào, bắt buộc phải đọc thêm [`DESIGN.md`](./DESIGN.md).

---

## 1. Sứ mệnh Sản phẩm & Đối tượng Cốt lõi

- **Định vị sản phẩm:** Nền tảng ôn thi trắc nghiệm vượt trội **thay thế Quizlet**, tích hợp sẵn **không gian nghe nhạc tập trung (Zen Focus Studio & Mini-Player)** ngay trong ứng dụng để triệt tiêu xao nhãng từ việc mở tab YouTube/SoundCloud ngoài.
- **Khán giả mục tiêu:** Học sinh, sinh viên đang **học gấp rút trước kỳ thi**, "lười thao tác rườm rà" nhưng bắt buộc **phải hiểu bản chất bài** và **làm quen tâm lý + format phòng thi thật**.
- **Bài toán cốt lõi cần giải tốt nhất:**
  1. Luyện thi trắc nghiệm **1 đáp án** và **nhiều đáp án đúng (multi-select)**.
  2. Hỗ trợ **đề chưa có đáp án sẵn**: vẫn vào học/làm quen format đề được, có AI suy luận đáp án & giảng bản chất bài.
  3. **Quy tắc 3 giây đầu (First-Impression Clarity):** Người mới mở Trang chủ lên phải hiểu ngay lập tức AnanQuiz làm gì, giải quyết vấn đề gì, dành cho ai, và bấm vào học ngay trong **1–2 bước**.

---

## 2. Quy trình Bắt buộc: `"Hỏi trước → Thiết kế → Duyệt → Mới Code"`

Với **mọi** yêu cầu về giao diện (UX/UI), chuyển động (Motion), tính năng mới, luồng dữ liệu hoặc cải tổ hệ thống *(trừ sửa lỗi chính tả hoặc bug kỹ thuật đơn lẻ hiển nhiên)*, **TUYỆT ĐỐI KHÔNG sửa code ngay**. Bắt buộc thực hiện đủ 3 nhịp:

1. **Nhịp 1 — Hỏi trước (nếu còn điểm mơ hồ):**
   - Dùng cơ chế hỏi từng điểm trọng tâm (tối đa 1–3 câu ngắn gọn, kèm **phán đoán đề xuất**) để chốt ranh giới nghiệp vụ, luồng thao tác hoặc gu thị giác chưa rõ.
2. **Nhịp 2 — Trình bày Bản Thiết kế gọn trên 1 màn hình:**
   - **(a) Mục tiêu & Luồng người dùng (User Flow):** Ai dùng, giải quyết ma sát nào, mất bao nhiêu chạm để vào học.
   - **(b) Bố cục UI Thiên văn & Motion:** Phân vùng không gian chòm sao vs vùng đọc đề tĩnh, hành vi trên Laptop + Mobile 1 tay, tốc độ chuyển động (`120–180ms` vs êm sâu).
   - **(c) Kiến trúc Hệ thống & Rủi ro:** Các file sẽ chạm, ảnh hưởng tới store/storage/API/quota AI, và ngân sách hiệu năng (GPU layers, `backdrop-blur`, tương thích mọi thiết bị).
3. **Nhịp 3 — Chờ Duyệt → Mới Code & Kiểm thử:**
   - Chỉ khi người dùng gật đầu **"Duyệt"** (hoặc chốt phần chỉnh sửa) mới tiến hành sửa code.
   - Triển khai xong bắt buộc chạy kiểm thử (`npx.cmd tsc --noEmit`, `npm.cmd run build` trên Windows) và đẩy lên nhánh được chỉ định (mặc định làm việc trên nhánh `demo` khi người dùng yêu cầu demo).

---

## 3. Nguyên tắc Thiết kế UX & Luồng "Học gấp rút"

- **Không màn hình chờ chặn đường:** Sinh viên ôn gấp rất ngại đợi.
- **Quy tắc ngưỡng ~50 câu cho đề chưa có đáp án:**
  - Nếu bộ đề tự nhập không có đáp án và số lượng **≤ ~50 câu**: có thể cho phép AI giải nhanh theo lô gọn nếu người học muốn cày ngay kèm đáp án.
  - Nếu bộ đề lớn (**> 50 câu**): **vào thẳng giao diện luyện đề / format phòng thi ngay lập tức**, không treo màn hình chờ AI xử lý hết cả file; cung cấp nút **AI giải & giảng bản chất tại chỗ** theo từng câu hoặc tại màn hình kết quả để tiết kiệm quota AI và giữ tốc độ tối đa.
- **Đọc đề không mỏi mắt:** Hỗ trợ song song **Cosmic Dark** (mặc định) và **Light Mode** cho môi trường nhiều sáng; khối hiển thị đề bài, code (`JetBrains Mono`) và công thức toán (`KaTeX`) luôn đặt trên nền đặc tương phản cao, tách biệt khỏi hiệu ứng sao bay.
- **Công thái học hai thiết bị:**
  - *Laptop/PC:* Tối ưu copy-paste nhập đề nhanh, phím tắt điều hướng câu hỏi (`1–4`, mũi tên, `Space` phát/dừng nhạc).
  - *Điện thoại:* Ưu tiên thao tác **1 tay (thumb-zone ở nửa dưới màn hình)** để lướt ôn nhanh trước giờ thi.

---

## 4. Ràng buộc Kiến trúc Hệ thống & Hiệu năng

- **Zero-Login, Offline-First:** Tuyệt đối không ép đăng nhập mới được học. Dữ liệu cá nhân, tiến độ SRS và lịch sử lưu cục bộ (`localStorage` / `IndexedDB` qua `StorageEngine`), đồng bộ đa thiết bị qua **QR / mã PIN 6 số** (`/api/sync/session` + Upstash Redis TTL 15 phút).
- **Bảo toàn dữ liệu cũ:** Mọi thay đổi schema lưu trữ phải tương thích ngược với dữ liệu đã lưu của người dùng.
- **Tiết kiệm chi phí Serverless & Quota AI:** Chỉ gọi AI (`/api/ai/explain`, `/api/ai/generate-quiz`) khi thực sự cần, có validation bằng `zod`, giới hạn kích thước payload và chống spam request.
- **Ngân sách mượt 60–120 FPS:**
  - Chỉ animate các thuộc tính GPU (`transform`, `opacity`, `clip-path`).
  - Không chồng nhiều tầng `backdrop-blur` lên nhau trên cùng một cột.
  - Hỗ trợ `prefers-reduced-motion` và tự hạ tải hiệu ứng nền trên thiết bị cấu hình yếu / mobile.
- **Môi trường lệnh Windows:** Luôn gọi `npm.cmd` / `npx.cmd` thay vì `npm` / `npx` trong PowerShell.
