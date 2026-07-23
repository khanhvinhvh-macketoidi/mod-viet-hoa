import {
  CalendarDays,
  Download,
  History,
} from 'lucide-react';
import type { ModVersion } from '@/lib/types';

function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} GB`;
  }

  return `${megabytes.toFixed(2)} MB`;
}

type Props = {
  modId: string;
  versions: ModVersion[];
  allowed: boolean;
};

export default function VersionHistory({
  modId,
  versions,
  allowed,
}: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
          <History className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-bold">
            Lịch sử phiên bản
          </h2>
          <p className="text-sm text-slate-500">
            Changelog và file tải của từng bản phát hành.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {versions.map((version) => (
          <article
            key={version.id}
            className={
              version.isCurrent
                ? 'rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-4'
                : 'rounded-2xl border border-white/10 bg-slate-950/50 p-4'
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-slate-100">
                    Phiên bản {version.version}
                  </h3>

                  {version.isCurrent && (
                    <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-200">
                      Mới nhất
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Game {version.gameVersion}
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(
                    version.createdAt,
                  ).toLocaleDateString('vi-VN')}
                </p>
                <p className="mt-1">
                  {version.downloads} lượt tải
                </p>
              </div>
            </div>

            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">
              {version.changelog ||
                'Không có ghi chú thay đổi.'}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="min-w-0 text-xs text-slate-500">
                <p className="truncate">
                  {version.fileName}
                </p>
                <p className="mt-1">
                  {formatFileSize(
                    version.fileSize,
                  )}
                </p>
              </div>

              {allowed && (
                <a
                  href={`/api/mods/${modId}/versions/${version.id}/download`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
                >
                  <Download className="h-4 w-4" />
                  Tải bản này
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
