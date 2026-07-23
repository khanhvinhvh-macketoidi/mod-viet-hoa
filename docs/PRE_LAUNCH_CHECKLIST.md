# Public Beta — Pre-launch checklist

## Build
- [ ] `npm ci`
- [ ] `npm run audit:production`
- [ ] `npm run build`
- [ ] `npm run start`
- [ ] `npm run smoke:production`

## Security
- [ ] SESSION_SECRET ngẫu nhiên từ 32 ký tự trở lên.
- [ ] HTTPS hoạt động và HTTP chuyển hướng sang HTTPS.
- [ ] Mỗi route POST/PUT/PATCH/DELETE kiểm tra đăng nhập ở server.
- [ ] Route ADMIN/MODDER kiểm tra role ở server.
- [ ] Password được hash; không lưu plain text.
- [ ] Thử upload file sai đuôi, MIME, quá dung lượng.
- [ ] Thử gửi request lặp để xác nhận HTTP 429.
- [ ] Không public `.env`, `data/`, logs hoặc backup qua static URL.

## Functional smoke test
- [ ] Đăng ký, đăng nhập, đăng xuất.
- [ ] Upload mod, cover, gallery và package.
- [ ] Download và ghi nhận lượt tải.
- [ ] Comment, review, favorite, collection.
- [ ] Tạo collection từ trang mod và mod được thêm ngay.
- [ ] Follow creator và notification.
- [ ] Publish release mới.
- [ ] Admin edit/delete và phân quyền MEMBER/MODDER/ADMIN.
- [ ] Creator dashboard, analytics và followers.

## Operations
- [ ] Chạy backup và mở được manifest.
- [ ] Thử restore trên staging, không thử lần đầu trên production.
- [ ] Health check trả HTTP 200.
- [ ] Log không chứa password, token hoặc cookie.
- [ ] Có monitoring dung lượng ổ đĩa và uptime.
- [ ] Có lịch backup hằng ngày và bản sao ngoài VPS.
