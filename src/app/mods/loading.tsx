const ITEMS = Array.from({ length: 6 }, (_, index) => index);

export default function ModsLoading() {
  return (
    <section className="iv2-container py-12" aria-busy="true" aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-2xl bg-white/10" />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <div key={item} className="iv2-glass overflow-hidden">
            <div className="aspect-[16/9] animate-pulse bg-white/10" />
            <div className="space-y-3 p-5">
              <div className="h-5 animate-pulse rounded-full bg-white/10" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/5" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Đang tải thư viện mod…</span>
    </section>
  );
}
