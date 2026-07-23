# MOD Thư Viện — Giai đoạn 1

MVP thư viện mod chạy bằng Next.js App Router, TypeScript và Tailwind CSS.

## Tính năng đã có
- Trang chủ và thư viện mod
- Tìm kiếm, lọc danh mục
- Trang chi tiết mod
- Đăng ký, đăng nhập, đăng xuất
- Phân quyền MEMBER / ADMIN và cờ VIP
- Upload file dành cho admin (giới hạn 200 MB)
- Download file có kiểm tra quyền PUBLIC / MEMBER / VIP
- Đếm lượt tải

## Chạy dự án
```bash
cp .env.example .env.local
npm install
npm run seed
npm run dev
```
Mở http://localhost:3000

Tài khoản admin mẫu:
- Email: admin@modhub.local
- Mật khẩu: Admin123!

## Lưu ý kiến trúc
Bản MVP sử dụng JSON trong thư mục `data/` và file local trong `storage/uploads/` để có thể chạy ngay, không cần dịch vụ ngoài. Trước khi public thật cần chuyển sang PostgreSQL, Cloudflare R2/S3, quét mã độc, giới hạn tốc độ và thanh toán VIP.
