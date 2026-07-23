import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Download,
  Edit3,
  ImageIcon,
  Plus,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { getMods } from '@/lib/store';
import DeleteModButton from '@/components/DeleteModButton';

function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} GB`;
  }

  return `${megabytes.toFixed(2)} MB`;
}

function getAccessLabel(
  accessLevel: 'PUBLIC' | 'MEMBER' | 'VIP',
): string {
  switch (accessLevel) {
    case 'VIP':
      return 'VIP';

    case 'MEMBER':
      return 'Thành viên';

    default:
      return 'Công khai';
  }
}

type AdminModsPageProps = {
  searchParams: Promise<{
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function AdminModsPage({
  searchParams,
}: AdminModsPageProps) {
  const user = await getCurrentUser();

  if (user?.role !== 'ADMIN') {
    redirect('/login');
  }

  const params = await searchParams;
  const mods = await getMods();

  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <div
        className="
          flex flex-col gap-5
          sm:flex-row sm:items-center sm:justify-between
        "
      >
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
            Quản trị nội dung
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Quản lý mod
          </h1>

          <p className="mt-2 text-slate-400">
            Sửa thông tin, thay file hoặc xóa các mod đã đăng.
          </p>
        </div>

        <Link
          href="/admin/upload"
          className="
            inline-flex items-center justify-center gap-2
            rounded-xl bg-amber-400 px-5 py-3
            font-bold text-slate-950 transition
            hover:bg-amber-300
          "
        >
          <Plus className="h-5 w-5" />
          Đăng mod mới
        </Link>
      </div>

      {params.updated && (
        <div
          className="
            mt-6 rounded-xl border border-emerald-400/20
            bg-emerald-500/10 px-4 py-3 text-emerald-200
          "
        >
          Đã cập nhật mod thành công.
        </div>
      )}

      {params.deleted && (
        <div
          className="
            mt-6 rounded-xl border border-emerald-400/20
            bg-emerald-500/10 px-4 py-3 text-emerald-200
          "
        >
          Đã xóa mod thành công.
        </div>
      )}

      {params.error && (
        <div
          className="
            mt-6 rounded-xl border border-red-400/20
            bg-red-500/10 px-4 py-3 text-red-200
          "
        >
          Không thể thực hiện thao tác. Hãy kiểm tra lại dữ liệu.
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-slate-900">
              <tr className="text-left text-sm text-slate-400">
                <th className="px-4 py-4 font-semibold">
                  Mod
                </th>

                <th className="px-4 py-4 font-semibold">
                  Game
                </th>

                <th className="px-4 py-4 font-semibold">
                  Quyền
                </th>

                <th className="px-4 py-4 font-semibold">
                  File
                </th>

                <th className="px-4 py-4 font-semibold">
                  Lượt tải
                </th>

                <th className="px-4 py-4 text-right font-semibold">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 bg-slate-950/40">
              {mods.map((mod) => (
                <tr
                  key={mod.id}
                  className="transition hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="
                          h-16 w-28 shrink-0 overflow-hidden
                          rounded-xl border border-white/10
                          bg-slate-900
                        "
                      >
                        {mod.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mod.coverUrl}
                            alt={mod.title}
                            className="h-full w-full object-cover"
                            style={{
                              objectPosition: `${
                                mod.coverPositionX ?? 50
                              }% ${mod.coverPositionY ?? 50}%`,
                            }}
                          />
                        ) : (
                          <div
                            className="
                              flex h-full w-full items-center
                              justify-center text-slate-600
                            "
                          >
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/mods/${mod.slug}`}
                          className="
                            block max-w-sm truncate
                            font-bold text-slate-100
                            transition hover:text-amber-300
                          "
                          title={mod.title}
                        >
                          {mod.title}
                        </Link>

                        <p className="mt-1 text-xs text-slate-500">
                          v{mod.version} · {mod.category}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="max-w-52 px-4 py-4">
                    <p
                      className="truncate text-sm text-slate-300"
                      title={mod.game}
                    >
                      {mod.game}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className="
                        rounded-full bg-white/5
                        px-3 py-1 text-xs text-slate-300
                      "
                    >
                      {getAccessLabel(mod.accessLevel)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <p
                      className="max-w-48 truncate text-sm text-slate-300"
                      title={mod.fileName}
                    >
                      {mod.fileName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatFileSize(mod.fileSize)}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                      <Download className="h-4 w-4 text-slate-500" />
                      {mod.downloads}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/mods/${mod.id}/edit`}
                        className="
                          inline-flex items-center gap-2
                          rounded-xl border border-sky-400/20
                          bg-sky-500/10 px-3 py-2
                          text-sm font-semibold text-sky-200
                          transition hover:bg-sky-500/20
                        "
                      >
                        <Edit3 className="h-4 w-4" />
                        Sửa
                      </Link>

                  <DeleteModButton
                      modId={mod.id}
                      modTitle={mod.title}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {mods.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Chưa có bí thuật nào trong Tàng kinh các.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}