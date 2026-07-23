import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Bug,
  CheckCircle2,
  CircleDashed,
  HeartHandshake,
  MessageSquareText,
  Rocket,
  Share2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import BetaJourneyButton from '@/components/beta/BetaJourneyButton';
import {
  BETA_COMPLETED_FEATURES,
  BETA_IN_PROGRESS_FEATURES,
  SITE_INFO,
} from '@/config/site';

export const metadata: Metadata = {
  title: `${SITE_INFO.stage} v${SITE_INFO.version}`,
  description: `Thông tin giai đoạn ${SITE_INFO.stage}, lộ trình và cách đồng hành cùng ${SITE_INFO.name}.`,
};

export default function BetaPage() {
  return (
    <div className="iv2-container py-12 sm:py-16 lg:py-20">
      <section
  className="
    relative
    overflow-hidden
    bg-[#07101d]
    isolate
  "
>
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#36d7ff]/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <p className="iv2-kicker">Thiên địa sơ khai · Cộng đồng đồng hành</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#e7c66f]/30 bg-[#e7c66f]/10 px-4 py-2 text-xs font-black tracking-[0.14em] text-[#f2db93]">
            <Sparkles size={14} /> {SITE_INFO.stageLabel} · v{SITE_INFO.version}
          </div>

          <h1 className="iv2-display mt-6 text-[clamp(2.3rem,6vw,4.8rem)] font-black leading-[1.04] tracking-[-0.04em] text-white">
            Chào mừng đạo hữu đến với <span className="iv2-gradient-text">MOD Việt Hóa</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#a5bdcf] sm:text-lg">
            MOD Việt Hóa đang trong giai đoạn Open Beta. Mỗi góp ý, bản mod và lượt chia sẻ của
            đạo hữu đều là một viên gạch góp phần xây dựng cộng đồng Việt hóa lớn mạnh hơn.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-bold text-[#a3ead3]">
            <span className="rounded-full border border-[#4fddb0]/20 bg-[#4fddb0]/[.06] px-3 py-1.5">Trạng thái: Đang hoạt động</span>
            <span className="rounded-full border border-[#36d7ff]/20 bg-[#36d7ff]/[.06] px-3 py-1.5">Build {SITE_INFO.build}</span>
            <span className="rounded-full border border-[#8f70ff]/20 bg-[#8f70ff]/[.06] px-3 py-1.5">Cập nhật thường xuyên</span>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <FeatureList
          icon={<BadgeCheck size={20} />}
          eyebrow="Đạo cơ đã thành"
          title="Những tính năng đã hoàn thiện"
          items={BETA_COMPLETED_FEATURES}
          completed
        />
        <FeatureList
          icon={<Rocket size={20} />}
          eyebrow="Đang bế quan tu luyện"
          title="Những tính năng đang phát triển"
          items={BETA_IN_PROGRESS_FEATURES}
        />
      </div>

      <section className="iv2-glass iv2-glass-strong mt-8 p-6 sm:p-8">
        <div className="max-w-2xl">
          <p className="iv2-kicker">Cùng kiến tạo tiên giới</p>
          <h2 className="iv2-display mt-2 text-2xl font-black sm:text-3xl">Đạo hữu có thể giúp gì?</h2>
          <p className="mt-3 text-sm leading-7 text-[#839caf]">
            Open Beta là giai đoạn để cộng đồng cùng thử nghiệm, phát hiện vấn đề và định hình
            những tính năng quan trọng nhất cho phiên bản chính thức.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HelpCard icon={<Bug size={18} />} title="Báo lỗi" text="Gửi lại thao tác, ảnh chụp và thông báo lỗi khi gặp bất thường." />
          <HelpCard icon={<MessageSquareText size={18} />} title="Góp ý" text="Chia sẻ tính năng hoặc trải nghiệm mà đạo hữu mong muốn." />
          <HelpCard icon={<UploadCloud size={18} />} title="Đăng mod" text="Đưa bí thuật và bản Việt hóa hữu ích đến cộng đồng." />
          <HelpCard icon={<Share2 size={18} />} title="Lan tỏa" text="Mời thêm modder, dịch giả và những đồng đạo cùng tham gia." />
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-[#4fddb0]/16 bg-[#071a20]/70 p-7 text-center sm:p-10">
        <HeartHandshake className="mx-auto text-[#4fddb0]" size={28} />
        <p className="iv2-display mx-auto mt-4 max-w-2xl text-xl font-bold text-[#eafff7] sm:text-2xl">
          {SITE_INFO.gratitude}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#7fa99d]">
          Thiên địa rộng lớn, hành trình này sẽ ý nghĩa hơn khi có cộng đồng cùng bước tiếp.
        </p>
        <div className="mt-7">
          <BetaJourneyButton />
        </div>
      </section>

      <div className="mt-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#8da5b7] transition hover:text-[#36d7ff]">
          <ArrowLeft size={16} /> Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}

function FeatureList({
  icon,
  eyebrow,
  title,
  items,
  completed = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  items: readonly string[];
  completed?: boolean;
}) {
  return (
    <section className="iv2-glass iv2-glass-strong p-6 sm:p-8">
      <div className="iv2-icon h-11 w-11">{icon}</div>
      <p className="iv2-kicker mt-5">{eyebrow}</p>
      <h2 className="iv2-display mt-2 text-2xl font-black">{title}</h2>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-xl border border-[#36d7ff]/8 bg-[#071424]/45 px-4 py-3">
            {completed ? (
              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#4fddb0]" />
            ) : (
              <CircleDashed size={17} className="mt-0.5 shrink-0 text-[#e7c66f]" />
            )}
            <span className="text-sm leading-6 text-[#a5bdcf]">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HelpCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#36d7ff]/10 bg-[#071424]/55 p-5">
      <span className="iv2-icon h-10 w-10">{icon}</span>
      <h3 className="iv2-display mt-4 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#7892a5]">{text}</p>
    </div>
  );
}
