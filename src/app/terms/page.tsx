import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng dịch vụ MOD Thư Viện.',
  robots: { index: true, follow: true },
};

import LegalPage from '@/components/public/LegalPage';
import {
  LEGAL_EFFECTIVE_DATE,
  PUBLIC_SITE_NAME,
  SUPPORT_EMAIL,
} from '@/lib/public/site-public-info';

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow={`Có hiệu lực từ ${LEGAL_EFFECTIVE_DATE}`}
      title="Điều khoản sử dụng"
      intro={`Các điều khoản cơ bản khi truy cập, đăng tải và sử dụng nội dung trên ${PUBLIC_SITE_NAME}.`}
    >
      <section>
        <h2>1. Phạm vi dịch vụ</h2>
        <p>
          MOD Thư Viện cung cấp không gian để cộng đồng giới thiệu,
          thảo luận và chia sẻ mod, bản Việt hóa, hướng dẫn và công cụ
          hỗ trợ game. Dịch vụ đang trong giai đoạn Public Beta nên có
          thể được điều chỉnh trong quá trình vận hành.
        </p>
      </section>

      <section>
        <h2>2. Trách nhiệm tài khoản</h2>
        <p>
          Người dùng chịu trách nhiệm bảo vệ thông tin đăng nhập và mọi
          hoạt động thực hiện từ tài khoản của mình. Không được giả mạo,
          chiếm quyền hoặc sử dụng tài khoản để gây hại cho hệ thống và
          thành viên khác.
        </p>
      </section>

      <section>
        <h2>3. Nội dung được đăng tải</h2>
        <ul>
          <li>Chỉ đăng nội dung mà đạo hữu có quyền chia sẻ.</li>
          <li>Không cài mã độc, công cụ đánh cắp dữ liệu hoặc tệp nguy hiểm.</li>
          <li>Không mô tả sai chức năng, nguồn gốc hoặc yêu cầu truy cập của mod.</li>
          <li>Không sử dụng nội dung để quấy rối, lừa đảo hoặc phát tán thông tin cá nhân.</li>
        </ul>
      </section>

      <section>
        <h2>4. Quyền kiểm duyệt</h2>
        <p>
          Ban quản trị có thể tạm ẩn, gỡ nội dung, giới hạn tính năng hoặc
          khóa tài khoản khi có dấu hiệu vi phạm, rủi ro bảo mật, tranh
          chấp quyền sở hữu hoặc yêu cầu hợp lệ từ chủ thể có quyền.
        </p>
      </section>

      <section>
        <h2>5. Tuyên bố miễn trừ</h2>
        <p>
          Mod và công cụ do cộng đồng cung cấp có thể làm thay đổi dữ liệu
          game. Người dùng nên sao lưu dữ liệu và tự luận đạo độ tin cậy
          trước khi cài đặt. MOD Thư Viện không bảo đảm mọi nội dung đều
          tương thích với mọi phiên bản game hoặc thiết bị.
        </p>
      </section>

      <section>
        <h2>6. Liên hệ</h2>
        <p>
          Câu hỏi về điều khoản có thể gửi đến{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <p className="public-page__notice">
        Nội dung này là bộ quy tắc vận hành cơ bản của nền tảng và không
        thay thế tư vấn pháp lý chuyên môn.
      </p>
    </LegalPage>
  );
}
