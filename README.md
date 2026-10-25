# ClinPharmAI Hub

Thư viện tài liệu dược lâm sàng dạng PWA, có thanh điều hướng bên trái: tóm tắt guideline, thông tin thuốc, so sánh dược lý, thẩm định EBM. Chạy offline sau lần mở đầu tiên.

## Cấu trúc

```
index.html              khung app: sidebar + vùng xem tài liệu
css/app.css             design system ClinPharmAI + theme đơn vị (BVPS MêKông / Phương Châu)
js/app.js               điều hướng, tìm kiếm không dấu, định tuyến #/p/<id>
data/pages.json         danh mục tài liệu (version, updated, source, status, records)
sw.js                   service worker: cache app + 20 tài liệu + thư viện CDN
manifest.webmanifest    cài đặt như ứng dụng
icons/                  biểu tượng
*.html (gốc)            20 tài liệu chuyên môn, giữ nguyên, không sửa
serve.ps1               máy chủ tĩnh cục bộ (Windows, không cần Node/Python)
```

## Chạy trên máy

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Mở http://localhost:8080. Mở thẳng `index.html` bằng cách nhấp đúp sẽ không đọc được `data/pages.json`, vì trình duyệt chặn đọc tệp cục bộ.

## Thêm tài liệu

1. Chép tệp `.html` vào thư mục gốc.
2. Thêm một bản ghi vào `data/pages.json`: `id` (duy nhất), `group`, `file`, `title`, `short`, `org`, `year`, `tags`.
3. Tăng `version` và `updated` trong `data/pages.json`, đồng thời tăng `CACHE_VERSION` trong `sw.js`.

## Phím tắt

- `/`: tìm kiếm
- `Ctrl+B`: ẩn hoặc hiện thanh bên
- `Esc`: đóng ngăn kéo trên điện thoại

## An toàn và dữ liệu

- Không thu thập hay lưu dữ liệu người bệnh. `localStorage` chỉ giữ giao diện (sáng/tối, đơn vị), trạng thái thanh bên và id tài liệu đã xem.
- Nội dung chuyên môn nằm trong từng tài liệu gốc và **chưa được kiểm chứng lại trong hub** (`status: unverified`).
- Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP. Đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.

## Nhật ký thay đổi

| Ngày | Phiên bản | Nội dung | Kiểm tra đã chạy |
|---|---|---|---|
| 2026-10-25 | 1.0.0 | Dựng hub: sidebar, tìm kiếm, khung xem, PWA offline | 20/20 tài liệu HTTP 200; tìm kiếm không dấu; định tuyến id lạ; chống chèn HTML vào ô tìm; drawer trên điện thoại 375 px không cuộn ngang; tắt máy chủ vẫn mở được tài liệu (offline); không lỗi console |
| 2026-10-25 | 1.1.0 | Thêm 2 tóm tắt guideline: EAU 2026 nhiễm khuẩn niệu khoa (mục 3.3–3.9); KDIGO AKI/AKD dự thảo 03/2026 (chương 3–4). Tổng 22 tài liệu | Tệp chép giữ nguyên (so khớp hash); 22/22 tài liệu HTTP 200; tìm kiếm; service worker cài lại với cache mới |
| 2026-10-25 | sw 1.1.1 | Service worker: `data/` lấy mạng trước, mất mạng mới dùng cache, để tài liệu mới hiện ngay ở lần mở đầu tiên sau cập nhật | Gài danh mục cũ vào cache, tải lại vẫn hiện v1.1.0; tắt máy chủ, tải lại vẫn mở được danh mục và EAU |
| 2026-10-25 | sw 1.1.3 | Có service worker mới thì trang tự tải lại một lần; link tới id chưa có trong danh mục được giữ nguyên thay vì đổi về trang chủ | Tăng CACHE_VERSION, trang tự tải lại đúng một lần, giữ hash, xóa cache cũ, không lặp tải lại, không lỗi console |
| 2026-10-25 | 1.1.1 | Đổi tên đơn vị BVĐK Phương Nam thành BVPS MêKông (thanh bên, ô chọn đơn vị, nguồn danh mục); mã nội bộ `phuong-nam` đổi thành `mekong`, lựa chọn cũ đã lưu tự chuyển sang | Hiển thị tên mới; lựa chọn cũ `phuong-nam` vẫn ra MêKông; đổi qua lại Phương Châu; không lỗi console |
