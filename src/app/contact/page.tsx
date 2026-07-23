import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Liên hệ và báo cáo nội dung',
  description: 'Liên hệ hỗ trợ hoặc báo cáo nội dung vi phạm tại MOD Thư Viện.',
  robots: { index: true, follow: true },
};

import LegalPage from '@/components/public/LegalPage';
import {
  SUPPORT_EMAIL,
  supportMailto,
} from '@/lib/public/site-public-info';

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="Hỗ trợ và phản hồi"
      title="Liên hệ MOD Thư Viện"
      intro="Gửi báo lỗi, góp ý, yêu cầu hỗ trợ tài khoản hoặc báo cáo nội dung cần xem xét."
    >
      <section>
        <h2>Thông tin nên gửi kèm</h2>
        <ul>
          <li>URL hoặc tên trang/mod liên quan.</li>
          <li>Mô tả ngắn vấn đề và các bước đã thực hiện.</li>
          <li>Ảnh chụp lỗi nếu có.</li>
          <li>Thời điểm xảy ra lỗi và thiết bị/trình duyệt đang sử dụng.</li>
        </ul>
      </section>

      <section>
        <h2>An toàn thông tin</h2>
        <p>
          Không gửi mật khẩu, mã xác thực, API key hoặc tệp chứa thông tin
          nhạy cảm. Ban quản trị không bao giờ yêu cầu đạo hữu cung cấp mật khẩu.
        </p>
      </section>

      <section>
        <h2>Kênh liên hệ</h2>
        <div className="public-contact-actions">
          <a
            className="iv2-submit"
            href={supportMailto('Hỗ trợ từ MOD Thư Viện')}
          >
            Gửi email hỗ trợ
          </a>

          <a
            className="iv2-form-secondary"
            href={supportMailto('Báo cáo nội dung tại MOD Thư Viện')}
          >
            Báo cáo nội dung
          </a>
        </div>
        <p>
          Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
