# MOD Việt Hóa — Self-host Windows

## 1. Điều kiện mạng
- PC phải bật liên tục và tắt chế độ Sleep.
- Router chuyển tiếp TCP 80 và 443 đến IP LAN của PC.
- Domain `modviethoa.vn` và `www` trỏ A record về IP WAN.
- Nếu nhà mạng dùng CGNAT hoặc chặn cổng 80/443, cần yêu cầu IP public hoặc dùng Cloudflare Tunnel.

## 2. Chuẩn bị ứng dụng
```powershell
Copy-Item .env.production.example .env.production
# sửa AUTH_SECRET trong .env.production
npm ci
npm run release:check
```

## 3. Chạy Next.js
```powershell
powershell -ExecutionPolicy Bypass -File deploy/windows/start-production.ps1
```
Ứng dụng chỉ nghe ở `127.0.0.1:3000`, không mở trực tiếp cổng 3000 ra Internet.

## 4. Caddy HTTPS
1. Tải `caddy.exe`, đặt cạnh file Caddyfile hoặc thêm vào PATH.
2. Sửa email trong `deploy/windows/Caddyfile`.
3. Chạy với quyền Administrator:
```powershell
caddy run --config deploy/windows/Caddyfile
```
Caddy tự cấp và gia hạn HTTPS cho domain khi DNS và port forwarding đã đúng.

## 5. Tự khởi động
```powershell
powershell -ExecutionPolicy Bypass -File deploy/windows/register-startup-task.ps1
```
Nên đăng ký Caddy thành Windows service hoặc Scheduled Task riêng.

## 6. Firewall
```powershell
powershell -ExecutionPolicy Bypass -File deploy/windows/install-firewall.ps1
```

## 7. Backup
```powershell
npm run backup:production
```
Sao lưu bắt buộc: `data/`, `public/uploads/`, `storage/uploads/`.

## 8. Kiểm tra sau khi online
```powershell
npm run smoke:production
```
Mở thêm: `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/api/health`.
