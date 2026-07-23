import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách quyền riêng tư',
  description: 'Thông tin về dữ liệu được MOD Thư Viện thu thập và sử dụng.',
  robots: { index: true, follow: true },
};

import LegalPage from '@/components/public/LegalPage';
import {
  LEGAL_EFFECTIVE_DATE,
  SUPPORT_EMAIL,
} from '@/lib/public/site-public-info';

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow={`Có hiệu lực từ ${LEGAL_EFFECTIVE_DATE}`}
      title="Chính sách quyền riêng tư"
      intro="Giải thích các loại dữ liệu được lưu trữ và mục đích sử dụng trong quá trình vận hành website."
    >
      <section>
        <h2>1. Dữ liệu tài khoản</h2>
        <p>
          Hệ thống có thể lưu tên hiển thị, email, mật khẩu đã được băm,
          vai trò, trạng thái VIP, hồ sơ công khai và lịch sử hoạt động
          cần thiết để cung cấp dịch vụ.
        </p>
      </section>

      <section>
        <h2>2. Dữ liệu hoạt động</h2>
        <p>
          Luận bàn, luận đạo, lượt theo dõi, lượt tải, mod đã đăng và
          truyền âm có thể được lưu để vận hành các chức năng cộng đồng.
          Nhật ký kỹ thuật có thể ghi thời điểm, lỗi, route và địa chỉ IP
          nhằm chống lạm dụng và xử lý sự cố.
        </p>
      </section>

      <section>
        <h2>3. Cookie</h2>
        <p>
          Website sử dụng cookie phiên đăng nhập bảo mật và localStorage
          để ghi nhớ lựa chọn giao diện. Không sử dụng mật khẩu dạng văn
          bản thuần trong cookie.
        </p>
      </section>

      <section>
        <h2>4. Mục đích sử dụng</h2>
        <ul>
          <li>Xác thực tài khoản và phân quyền truy cập.</li>
          <li>Hiển thị hồ sơ và nội dung do người dùng tạo.</li>
          <li>Phòng chống spam, gian lận và hành vi gây hại.</li>
          <li>Sao lưu, khôi phục và chẩn đoán lỗi hệ thống.</li>
        </ul>
      </section>

      <section>
        <h2>5. Chia sẻ dữ liệu</h2>
        <p>
          MOD Thư Viện không bán dữ liệu cá nhân. Dữ liệu chỉ có thể được
          cung cấp khi cần vận hành hạ tầng, tuân thủ yêu cầu pháp lý hợp
          lệ hoặc bảo vệ an toàn của nền tảng và cộng đồng.
        </p>
      </section>

      <section>
        <h2>6. Yêu cầu về dữ liệu</h2>
        <p>
          Đạo hữu có thể yêu cầu cập nhật hoặc xem xét xóa dữ liệu tài khoản
          bằng cách liên hệ{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          Một số dữ liệu có thể cần được giữ lại trong thời gian hợp lý
          để giải quyết tranh chấp, bảo mật và nghĩa vụ vận hành.
        </p>
      </section>
    </LegalPage>
  );
}
