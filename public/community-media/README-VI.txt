THƯ VIỆN ICON / GIF CỘNG ĐỒNG

1. Icon tĩnh
   - Chép file vào: public/community-media/icons/
   - Hỗ trợ: SVG, PNG, WEBP, JPG, JPEG

2. GIF động
   - Chép file vào: public/community-media/gifs/
   - Hỗ trợ: GIF hoặc WEBP động

3. Đăng ký media
   - Mở: public/community-media/library.json
   - Thêm một object mới, ví dụ:

  {
    "id": "icon-phuong-hoang",
    "label": "Phượng hoàng",
    "kind": "ICON",
    "src": "/community-media/icons/phuong-hoang.webp"
  }

  {
    "id": "gif-an-mung",
    "label": "Ăn mừng",
    "kind": "GIF",
    "src": "/community-media/gifs/an-mung.gif"
  }

QUY TẮC:
- id chỉ dùng chữ thường, số, dấu gạch ngang hoặc gạch dưới.
- id phải duy nhất và không nên đổi sau khi đã có bình luận sử dụng.
- kind chỉ nhận ICON hoặc GIF.
- Không dùng URL bên ngoài.
- Không dùng ../ trong src.
- Xóa một mục khỏi library.json sẽ làm media cũ không còn hiển thị.
- Để thay hình mà vẫn giữ bình luận cũ, thay file nhưng giữ nguyên id và src.

Sau khi sửa thư viện:
- Khuyến nghị restart PM2 để làm mới toàn bộ cache tiến trình.
- Không cần sửa TypeScript cho từng icon/GIF mới.
