import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenText,
  CircleHelp,
  Crown,
  FileUp,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
} from 'lucide-react';
import { SITE_INFO } from '@/config/site';

export const metadata: Metadata = {
  title: 'Thiên Cơ Các',
  description:
    'Cẩm nang nhập môn, hệ thống quyền hạn, thân phận, tu luyện và hướng dẫn đăng mod tại MOD Việt Hóa.',
};

const terminology = [
  ['Bạn', 'Đạo hữu'],
  ['Hồ sơ', 'Đạo tịch'],
  ['Bộ sưu tập', 'Tàng Kinh Các'],
  ['Bình luận', 'Luận bàn'],
  ['Đánh giá', 'Luận đạo'],
  ['Thông báo', 'Truyền âm'],
  ['Theo dõi', 'Kết giao'],
  ['Yêu thích', 'Tâm đắc'],
];

const realms = [
  'Luyện Khí',
  'Trúc Cơ',
  'Kết Tinh',
  'Kim Đan',
  'Cụ Linh',
  'Nguyên Anh',
  'Hóa Thần',
  'Ngộ Đạo',
  'Vũ Hóa',
  'Đăng Tiên',
];

export default function ThienCoCacPage() {
  return (
    <main className="iv2-container py-12 sm:py-16">
      <section className="iv2-glass iv2-glass-strong relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
        <div className="iv2-hero-orb" aria-hidden="true" />
        <div className="relative z-10 max-w-3xl">
          <p className="iv2-kicker">Cẩm nang nhập môn · {SITE_INFO.stageLabel}</p>
          <h1 className="iv2-display mt-4 text-4xl font-black sm:text-6xl">
            Thiên Cơ <span className="iv2-gradient-text">Các</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#a8bdcc]">
            Nơi giải nghĩa hệ thống thuật ngữ, quyền hạn, thân phận và con đường tu luyện
            của MOD Việt Hóa. Đạo hữu mới nhập môn có thể bắt đầu từ đây trước khi khám phá Tàng Kinh Các.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/mods" className="iv2-button iv2-button-primary">
              <BookOpenText size={18} /> Khám phá thư viện
            </Link>
            <Link href="/mods/upload" className="iv2-button iv2-button-secondary">
              <FileUp size={18} /> Đăng mod
            </Link>
          </div>
        </div>
      </section>

      <GuideSection icon={<ScrollText size={21} />} kicker="Nhập môn" title="MOD Việt Hóa là gì?">
        <p>
          MOD Việt Hóa là không gian cộng đồng để lưu giữ, chia sẻ và phát triển mod, bản Việt hóa
          cùng công cụ hỗ trợ game. Website hiện ở giai đoạn{' '}
          <strong>{SITE_INFO.stageLabel} v{SITE_INFO.version}</strong>, nên một số tính năng vẫn tiếp tục
          được hoàn thiện dựa trên góp ý của cộng đồng.
        </p>
      </GuideSection>

      <GuideSection icon={<Sparkles size={21} />} kicker="Ngôn ngữ tiên hiệp" title="Thuật ngữ trong website">
        <p>Các tên gọi quen thuộc được chuyển hóa để tạo bản sắc thống nhất nhưng không làm thay đổi chức năng.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {terminology.map(([original, xianxia]) => (
            <div key={original} className="rounded-2xl border border-[#36d7ff]/10 bg-[#071424]/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#657f92]">{original}</p>
              <p className="mt-2 font-black text-[#eafaff]">{xianxia}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection icon={<ShieldCheck size={21} />} kicker="Phân quyền" title="Hệ thống Quyền hạn">
        <div className="mt-2 grid gap-4 lg:grid-cols-3">
          <RoleCard icon={<UserRound size={20} />} name="Tán Tu" code="MEMBER" text="Luận bàn, luận đạo, kết giao, tâm đắc và tải nội dung theo cấp truy cập." />
          <RoleCard icon={<Swords size={20} />} name="Tông Sư" code="MODDER" text="Có toàn bộ quyền của Tán Tu, đồng thời được đăng, chỉnh sửa và cập nhật mod của chính mình." />
          <RoleCard icon={<Crown size={20} />} name="Giới Đế" code="ADMIN" text="Quản trị hệ thống, phân quyền, kiểm duyệt và quản lý toàn bộ nội dung trên website." />
        </div>
        <p className="mt-5 rounded-xl border border-[#e7c66f]/15 bg-[#e7c66f]/[.05] p-4 text-sm leading-7 text-[#d8ca9d]">
          Khi đạt <strong>Trúc Cơ · Sơ kỳ</strong>, Tán Tu sẽ tự động được thăng thành <strong>Tông Sư</strong> và khai mở quyền đăng mod.
        </p>
      </GuideSection>

      <GuideSection icon={<Crown size={21} />} kicker="Danh hiệu" title="Hệ thống Thân phận">
        <p>Thân phận là danh hiệu và khung nhận diện, không quyết định quyền thao tác trong hệ thống.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Phàm Nhân', 'Thân phận khởi đầu của mọi đạo hữu.'],
            ['Nhân Kiệt', 'Dành cho đạo hữu tích cực hoặc có đóng góp nổi bật.'],
            ['Thiên Kiêu', 'Danh hiệu cao cấp dành cho thành viên xuất chúng.'],
            ['Thần Thoại', 'Danh dự tối cao do Giới Đế sắc phong.'],
          ].map(([name, text]) => (
            <div key={name} className="iv2-glass p-5">
              <h3 className="iv2-display font-black">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#839caf]">{text}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection icon={<Swords size={21} />} kicker="Cách thức tu luyện" title="Cảnh giới và điểm tu vi">
        <p>
          Tu vi được hình thành từ hoạt động đóng góp như phát hành mod, lượt tải, luận đạo và luận bàn.
          Mỗi cảnh giới gồm Sơ kỳ, Trung kỳ và Hậu kỳ.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {realms.map((realm, index) => (
            <span key={realm} className="inline-flex items-center gap-2 rounded-full border border-[#36d7ff]/12 bg-[#36d7ff]/[.05] px-3 py-2 text-sm font-bold text-[#b9d4e5]">
              <span className="text-[#36d7ff]">{index + 1}</span>{realm}
            </span>
          ))}
        </div>
      </GuideSection>

      <GuideSection icon={<FileUp size={21} />} kicker="Công cụ Tông Sư" title="Cách đăng và cập nhật mod">
        <div className="grid gap-4 md:grid-cols-2">
          <Step number="01" title="Khai mở quyền Tông Sư" text="Đạt Trúc Cơ · Sơ kỳ hoặc được Giới Đế cấp quyền sớm tại Author Center." />
          <Step number="02" title="Mở trang Đăng mod" text="Chọn Đăng mod trên Header hoặc truy cập /mods/upload." />
          <Step number="03" title="Điền thông tin bí tịch" text="Thêm tên mod, mô tả, game, danh mục, ảnh bìa, thư viện ảnh và hướng dẫn cài đặt." />
          <Step number="04" title="Phát hành và quản lý" text="Sau khi đăng, vào Creator Center để chỉnh sửa, thêm phiên bản, changelog và theo dõi số liệu." />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/mods/upload" className="iv2-button iv2-button-primary">Bắt đầu đăng mod <ArrowRight size={17} /></Link>
          <Link href="/creator" className="iv2-button iv2-button-secondary">Mở Creator Center</Link>
        </div>
      </GuideSection>

      <GuideSection icon={<CircleHelp size={21} />} kicker="Giải đáp nhanh" title="Câu hỏi thường gặp">
        <div className="grid gap-3">
          <Faq question="Quyền hạn và Thân phận có giống nhau không?" answer="Không. Quyền hạn quyết định chức năng được phép sử dụng; Thân phận là danh hiệu nhận diện và khung avatar." />
          <Faq question="Vì sao đã đăng nhập nhưng chưa thấy nút Đăng mod?" answer="Tài khoản cần có quyền Tông Sư hoặc Giới Đế. Tán Tu sẽ tự động thành Tông Sư khi đạt Trúc Cơ · Sơ kỳ." />
          <Faq question="Tông Sư có thể sửa mod của người khác không?" answer="Không. Tông Sư chỉ quản lý mod thuộc quyền sở hữu của mình; Giới Đế mới có quyền quản lý toàn bộ." />
          <Faq question="Tôi nên gửi góp ý hoặc báo lỗi ở đâu?" answer="Sử dụng trang Liên hệ và cung cấp đường dẫn, thao tác đã thực hiện cùng ảnh lỗi để việc kiểm tra nhanh hơn." />
        </div>
      </GuideSection>

      <section className="mt-8 rounded-3xl border border-[#36d7ff]/12 bg-[#071424]/70 p-7 text-center sm:p-10">
        <MessageCircle className="mx-auto text-[#36d7ff]" />
        <h2 className="iv2-display mt-4 text-2xl font-black">Cùng kiến tạo một Tàng Kinh Các lớn mạnh</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#839caf]">{SITE_INFO.gratitude}</p>
        <Link href="/contact" className="iv2-button iv2-button-secondary mt-6">Gửi góp ý</Link>
      </section>
    </main>
  );
}

function GuideSection({ icon, kicker, title, children }: { icon: React.ReactNode; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-3xl border border-[#36d7ff]/10 bg-[#071424]/55 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="iv2-icon h-11 w-11 shrink-0">{icon}</span>
        <div>
          <p className="iv2-kicker">{kicker}</p>
          <h2 className="iv2-display mt-2 text-2xl font-black sm:text-3xl">{title}</h2>
        </div>
      </div>
      <div className="mt-5 text-sm leading-7 text-[#9db3c3] sm:text-base">{children}</div>
    </section>
  );
}

function RoleCard({ icon, name, code, text }: { icon: React.ReactNode; name: string; code: string; text: string }) {
  return <div className="iv2-glass p-5"><span className="iv2-icon h-10 w-10">{icon}</span><p className="mt-4 text-xs font-black tracking-widest text-[#657f92]">{code}</p><h3 className="iv2-display mt-1 text-xl font-black">{name}</h3><p className="mt-2 text-sm leading-6 text-[#839caf]">{text}</p></div>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-2xl border border-[#36d7ff]/10 bg-[#06111f]/65 p-5"><span className="text-xs font-black tracking-widest text-[#36d7ff]">BƯỚC {number}</span><h3 className="iv2-display mt-2 font-black text-[#eafaff]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#839caf]">{text}</p></div>;
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return <details className="group rounded-2xl border border-[#36d7ff]/10 bg-[#06111f]/60 px-5 py-4"><summary className="cursor-pointer font-bold text-[#dceef8]">{question}</summary><p className="mt-3 text-sm leading-7 text-[#839caf]">{answer}</p></details>;
}
