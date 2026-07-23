interface Snapshot {
  date: string;
  totalDownloads: number;
}

export default function CreatorDownloadChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 text-center">
        <div>
          <p className="font-bold text-slate-300">Đang bắt đầu ghi nhận dữ liệu</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Tông Sư Các sẽ lưu một bản ghi mỗi ngày. Biểu đồ tăng trưởng xuất hiện sau khi có ít nhất hai ngày dữ liệu.
          </p>
        </div>
      </div>
    );
  }

  const values = snapshots.map((item) => item.totalDownloads);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return (
    <div className="flex min-h-64 items-end gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/10 p-5">
      {snapshots.map((item) => {
        const height = 18 + ((item.totalDownloads - min) / range) * 82;
        return (
          <div key={item.date} className="group flex min-w-8 flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex h-44 w-full items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-amber-500/60 to-amber-300 transition group-hover:brightness-110"
                style={{ height: `${height}%` }}
                title={`${item.date}: ${item.totalDownloads.toLocaleString('vi-VN')} lượt tải`}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-600">
              {new Date(`${item.date}T00:00:00`).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
