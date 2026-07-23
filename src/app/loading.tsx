export default function RootLoading() {
  return (
    <section className="iv2-container py-14 sm:py-16" aria-busy="true" aria-live="polite">
      <div className="iv2-glass iv2-glass-strong p-8 sm:p-10">
        <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 h-10 max-w-xl animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-4 h-4 max-w-2xl animate-pulse rounded-full bg-white/5" />
        <div className="mt-3 h-4 max-w-lg animate-pulse rounded-full bg-white/5" />
        <span className="sr-only">Đang tải nội dung…</span>
      </div>
    </section>
  );
}
