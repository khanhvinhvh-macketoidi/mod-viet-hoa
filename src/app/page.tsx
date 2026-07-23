import Link from 'next/link';
import ModCard from '@/components/ModCard';
import { getMods } from '@/lib/store';
import {
  ArrowRight,
  BookOpenText,
  Compass,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

export default async function Home() {
  const mods = (await getMods()).slice(0, 6);

  return (
    <>
      <section className="iv2-hero hero-top-cover">
        <div className="iv2-hero-orb" aria-hidden="true" />

        <div className="iv2-container relative z-10 grid min-h-[620px] items-center py-20 lg:grid-cols-[1.15fr_.85fr]">
          <div className="max-w-3xl">
            <p className="iv2-kicker">Tàng Kinh Các · Quỷ Cốc Bát Hoang</p>

            <h1 className="iv2-display mt-5 text-[clamp(2.8rem,6vw,5.6rem)] font-black leading-[1.02] tracking-[-0.045em]">
              Khai mở
              <span className="iv2-gradient-text"> tiên lộ mới</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#a8bdcc] sm:text-lg">
              Thư viện mod, bản Việt hóa và công cụ hỗ trợ dành cho cộng đồng
              Quỷ Cốc Bát Hoang tại Việt Nam.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/mods" className="iv2-button iv2-button-primary">
                <BookOpenText size={18} />
                Khám phá thư viện
              </Link>

              <Link href="/register" className="iv2-button iv2-button-secondary">
                <Compass size={18} />
                Gia nhập cộng đồng
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Stat label="Bí tịch" value={`${mods.length}+`} />
              <Stat label="Cộng đồng" value="Việt Nam" />
              <Stat label="Trạng thái" value="Online" />
            </div>
          </div>
        </div>
      </section>

      <section className="iv2-container py-14 sm:py-16">
        <div className="grid gap-4 lg:grid-cols-3">
          <Feature
            icon={<BookOpenText size={20} />}
            title="Tàng thư tinh chọn"
            text="Khám phá theo game, công năng, cốt truyện và chất lượng mod."
          />
          <Feature
            icon={<UploadCloud size={20} />}
            title="Quản lý phiên bản"
            text="Theo dõi lịch sử phát hành, hướng dẫn cài đặt và mod phụ thuộc."
          />
          <Feature
            icon={<ShieldCheck size={20} />}
            title="Cộng đồng chia sẻ"
            text="Thành viên toàn quyền chia sẻ, thảo luận và đánh giá mod."
          />
        </div>

        <div className="mb-7 mt-14 flex items-end justify-between gap-5">
          <div>
            <p className="iv2-kicker">Bí thuật mới xuất thế</p>
            <h2 className="iv2-display mt-2 text-3xl font-black">Bí thuật nổi bật</h2>
          </div>

          <Link
            href="/mods"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#a5bdcf] transition hover:text-[#36d7ff]"
          >
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>

        {mods.length ? (
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mods.map((mod) => (
              <ModCard key={mod.id} mod={mod} />
            ))}
          </div>
        ) : (
          <div className="iv2-glass iv2-glass-strong p-12 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-[#36d7ff]" />
            <p className="iv2-display mt-4 text-lg font-bold">
              Chưa có bí thuật nào được lưu giữ
            </p>
            <p className="mt-2 text-sm text-[#839caf]">
              Nhanh chóng gia nhập tiên lộ và sớm phát hành bí thuật của riêng mình.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="iv2-glass iv2-interactive flex gap-4 p-5">
      <span className="iv2-icon h-11 w-11 shrink-0">{icon}</span>
      <div>
        <h3 className="iv2-display font-bold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#839caf]">{text}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#36d7ff]/10 bg-[#071424]/56 px-4 py-3 backdrop-blur-md">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#657f92]">{label}</p>
      <p className="mt-1 font-bold text-[#eafaff]">{value}</p>
    </div>
  );
}
