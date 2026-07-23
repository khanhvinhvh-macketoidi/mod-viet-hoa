# MOD Việt Hóa v1.0.0 RC1 — Release checklist

## Trước khi public
- [ ] `.env.production` có `APP_URL=https://modviethoa.vn` và `AUTH_SECRET` ngẫu nhiên ≥ 32 ký tự.
- [ ] `npm ci` và `npm run release:check` thành công.
- [ ] PC tắt Sleep, có IP LAN cố định.
- [ ] Router forward TCP 80/443 đến PC.
- [ ] DNS `@` và `www` trỏ đúng IP public.
- [ ] Caddy chạy và HTTPS hợp lệ.
- [ ] Không mở trực tiếp port 3000 ra Internet.

## Route production
- [ ] `/`
- [ ] `/mods`
- [ ] Một trang `/mods/[slug]`
- [ ] Một trang `/authors/[slug]`
- [ ] Một trang `/collections/[slug]`
- [ ] `/robots.txt`
- [ ] `/sitemap.xml`
- [ ] `/manifest.webmanifest`
- [ ] `/api/health`

## Chức năng quan trọng
- [ ] Đăng ký, đăng nhập, đăng xuất.
- [ ] Upload cover/gallery/file mod.
- [ ] Download file mod.
- [ ] Bình luận, đánh giá, yêu thích, collection.
- [ ] Admin chỉnh sửa/xóa mod.
- [ ] Backup `data`, `public/uploads`, `storage/uploads`.

## Sau khi public
- [ ] Thêm domain vào Google Search Console và gửi sitemap.
- [ ] Kiểm tra Open Graph bằng công cụ chia sẻ mạng xã hội.
- [ ] Theo dõi log Caddy và dung lượng ổ đĩa hằng ngày trong tuần đầu.
