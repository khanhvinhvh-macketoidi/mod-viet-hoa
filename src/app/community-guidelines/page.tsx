import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quy định cộng đồng',
  description: 'Quy định đăng mod, luận bàn và tương tác tại MOD Thư Viện.',
  robots: { index: true, follow: true },
};

import LegalPage from '@/components/public/LegalPage';

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      eyebrow="Chuẩn mực cộng đồng"
      title="Quy định đăng mod và tương tác"
      intro="Giữ MOD Thư Viện hữu ích, an toàn và thân thiện cho người chơi, tác giả mod và nhóm Việt hóa."
    >
      <section>
        <h2>Nội dung được khuyến khích</h2>
        <ul>
          <li>Mô tả rõ chức năng, phiên bản game và hướng dẫn cài đặt.</li>
          <li>Ghi nguồn, tác giả gốc và nhóm Việt hóa khi phù hợp.</li>
          <li>Nêu rõ mod phụ thuộc, xung đột và rủi ro đã biết.</li>
          <li>Phản hồi lỗi bằng thông tin có thể kiểm chứng.</li>
        </ul>
      </section>

      <section>
        <h2>Nội dung không được phép</h2>
        <ul>
          <li>Mã độc, backdoor, trình đánh cắp tài khoản hoặc dữ liệu.</li>
          <li>Spam, lừa đảo, quảng cáo gây hiểu nhầm hoặc liên kết nguy hiểm.</li>
          <li>Quấy rối, xúc phạm, đe dọa hoặc công khai thông tin cá nhân.</li>
          <li>Re-upload nội dung khi không có quyền chia sẻ.</li>
          <li>Lợi dụng luận đạo, lượt tải hoặc nhiều tài khoản để thao túng thứ hạng.</li>
        </ul>
      </section>

      <section>
        <h2>Quy trình xử lý</h2>
        <p>
          Tùy mức độ, hệ thống có thể cảnh báo, yêu cầu chỉnh sửa, tạm ẩn,
          gỡ nội dung, giới hạn chức năng hoặc khóa tài khoản. Nội dung có
          nguy cơ gây hại có thể bị ẩn ngay trong thời gian xác minh.
        </p>
      </section>

      <section>
        <h2>Khi báo cáo vi phạm</h2>
        <p>
          Hãy cung cấp URL, tên nội dung, lý do báo cáo và bằng chứng liên
          quan. Không gửi mật khẩu, khóa API hoặc dữ liệu cá nhân nhạy cảm.
        </p>
      </section>
    </LegalPage>
  );
}
