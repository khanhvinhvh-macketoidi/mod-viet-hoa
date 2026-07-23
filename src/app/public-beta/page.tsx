import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông tin giai đoạn thử nghiệm',
  description: 'Trạng thái thử nghiệm và phạm vi hỗ trợ của MOD Thư Viện.',
  robots: { index: true, follow: true },
};

import LegalPage from '@/components/public/LegalPage';

export default function PublicBetaPage() {
  return (
    <LegalPage
      eyebrow="Trạng thái phát hành"
      title="MOD Thư Viện đang trong giai đoạn thử nghiệm công khai"
      intro="Các chức năng cốt lõi đã hoạt động, nhưng nền tảng vẫn đang được kiểm thử với người dùng thực tế."
    >
      <section>
        <h2>Đã sẵn sàng</h2>
        <ul>
          <li>Đăng ký, đăng nhập và hồ sơ người dùng.</li>
          <li>Thư viện mod, upload, tải xuống và phân quyền.</li>
          <li>Luận bàn, luận đạo, theo dõi và truyền âm.</li>
          <li>Kiểm tra tình trạng hệ thống, sao lưu tự động và chẩn đoán môi trường vận hành.</li>
        </ul>
      </section>

      <section>
        <h2>Có thể còn thay đổi</h2>
        <p>
          Giao diện, quy trình kiểm duyệt, giới hạn upload và một số chức
          năng cộng đồng có thể được điều chỉnh dựa trên phản hồi và khả
          năng vận hành thực tế.
        </p>
      </section>

      <section>
        <h2>Khuyến nghị người dùng</h2>
        <ul>
          <li>Sao lưu save game trước khi thử mod.</li>
          <li>Đọc kỹ phiên bản, phụ thuộc và hướng dẫn cài đặt.</li>
          <li>Báo lỗi bằng thông tin cụ thể, tránh đăng lặp nhiều lần.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
