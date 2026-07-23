import StarRatingDisplay from '@/components/StarRatingDisplay';

type ReviewSummaryProps = {
  average: number;
  count: number;

  distribution: Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;
};

export default function ReviewSummary({
  average,
  count,
  distribution,
}: ReviewSummaryProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-black text-slate-100">
            {average.toFixed(1)}
          </p>

          <div className="mt-3">
            <StarRatingDisplay
              value={average}
              size="md"
            />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {count === 0
              ? 'Chưa có luận đạo'
              : `${count} lượt luận đạo`}
          </p>
        </div>

        <div className="space-y-2">
          {([5, 4, 3, 2, 1] as const).map(
            (star) => {
              const value =
                distribution[star];

              const percentage =
                count > 0
                  ? (value / count) * 100
                  : 0;

              return (
                <div
                  key={star}
                  className="grid grid-cols-[52px_1fr_34px] items-center gap-3 text-sm"
                >
                  <span className="text-slate-400">
                    {star} sao
                  </span>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <span className="text-right text-slate-500">
                    {value}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}