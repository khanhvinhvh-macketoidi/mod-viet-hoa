export default function AuthorLoading() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10" aria-busy="true" aria-live="polite">
      <div className="iv2-glass iv2-glass-strong overflow-hidden">
        <div className="h-56 animate-pulse bg-white/10" />
        <div className="grid gap-6 p-6 md:grid-cols-[180px_1fr]">
          <div className="mx-auto h-36 w-36 animate-pulse rounded-3xl bg-white/10 md:mx-0" />
          <div className="space-y-4">
            <div className="h-8 max-w-sm animate-pulse rounded-xl bg-white/10" />
            <div className="h-4 max-w-xl animate-pulse rounded-full bg-white/5" />
            <div className="h-4 max-w-lg animate-pulse rounded-full bg-white/5" />
          </div>
        </div>
      </div>
      <span className="sr-only">Đang khai mở đạo tịch tác giả…</span>
    </section>
  );
}
