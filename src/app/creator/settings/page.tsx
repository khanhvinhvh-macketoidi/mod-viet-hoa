import Link from 'next/link';

export default function Page() {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Tông Sư Các</p>
      <h1 className="mt-3 text-3xl font-black">Đang được phát triển</h1>
      <p className="mt-3 max-w-2xl text-slate-400">Khu vực này đã được đặt sẵn trong kiến trúc Tông Sư Các và sẽ được hoàn thiện ở giai đoạn tiếp theo.</p>
      <Link href="/creator" className="mt-6 inline-flex rounded-2xl bg-amber-400 px-4 py-3 font-black text-slate-950 hover:bg-amber-300">Quay lại Tông Sư Các</Link>
    </section>
  );
}
