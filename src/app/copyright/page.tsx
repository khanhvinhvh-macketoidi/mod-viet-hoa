import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bản quyền và yêu cầu gỡ nội dung',
  description: 'Quy trình gửi yêu cầu về bản quyền hoặc quyền sở hữu nội dung.',
  robots: { index: true, follow: true },
};

import LegalPage from '@/components/public/LegalPage';
import {
  SUPPORT_EMAIL,
  supportMailto,
} from '@/lib/public/site-public-info';

export default function CopyrightPage() {
  return (
    <LegalPage
      eyebrow="Quyền tác giả và nội dung"
      title="Bản quyền và yêu cầu gỡ nội dung"
      intro="MOD Thư Viện tôn trọng tác giả mod, nhóm Việt hóa, nhà phát triển và chủ sở hữu nội dung."
    >
      <section>
        <h2>Trước khi gửi yêu cầu</h2>
        <p>
          Kiểm tra URL chính xác, xác định nội dung bị phản ánh và quyền
          hoặc mối quan hệ của đạo hữu với nội dung đó. Một số mod có thể là
          bản vá, bản dịch hoặc tác phẩm phái sinh được chia sẻ theo điều
          kiện riêng của tác giả.
        </p>
      </section>

      <section>
        <h2>Thông tin cần cung cấp</h2>
        <ul>
          <li>Họ tên hoặc tổ chức gửi yêu cầu.</li>
          <li>Thông tin liên hệ có thể xác minh.</li>
          <li>URL nội dung trên MOD Thư Viện.</li>
          <li>Mô tả quyền sở hữu hoặc quyền đại diện.</li>
          <li>Lý do và tài liệu chứng minh liên quan.</li>
        </ul>
      </section>

      <section>
        <h2>Quy trình xem xét</h2>
        <p>
          Nội dung có thể được tạm ẩn trong thời gian xác minh. Ban quản
          trị có thể liên hệ người đăng để yêu cầu giải trình. Việc gỡ,
          khôi phục hoặc điều chỉnh nội dung sẽ dựa trên thông tin có thể
          kiểm chứng và mức độ rủi ro.
        </p>
      </section>

      <section>
        <h2>Gửi yêu cầu</h2>
        <p>
          Email tiếp nhận:{' '}
          <a href={supportMailto('Yêu cầu bản quyền / gỡ nội dung')}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
