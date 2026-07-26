import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bug, ChevronRight, ImageIcon } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { getAllPublicModErrorReports } from '@/lib/mod-error-reports';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  VERIFYING: 'Đang xác minh',
  NEED_INFO: 'Cần thêm thông tin',
  FIXED: 'Đã sửa',
  REJECTED: 'Từ chối',
};

export default async function AdminModReportsPage() {
  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') redirect('/login');

  const reports = await getAllPublicModErrorReports();

  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-red-300">Quản trị chất lượng</p>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-black">
            <Bug className="h-8 w-8 text-red-300" />
            Báo cáo lỗi mod
          </h1>
          <p className="mt-2 text-slate-400">
            Mở bài mod tương ứng để xem ảnh, trao đổi và cập nhật trạng thái.
          </p>
        </div>
        <Link
          href="/admin/mods"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 font-semibold text-slate-300 hover:bg-white/5"
        >
          Quay lại quản lý mod
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[31%]" />
              <col className="w-[19%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-900 text-left text-sm text-slate-400">
              <tr>
                <th className="px-4 py-4">Báo cáo</th>
                <th className="px-4 py-4">Mod</th>
                <th className="px-4 py-4">Người gửi</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4">Thời gian</th>
                <th className="px-4 py-4 text-right">Mở</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-950/40">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-4">
                    <p className="truncate font-bold text-slate-100" title={report.title}>{report.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {report.images.length} ảnh · v{report.version}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="truncate text-sm text-slate-300" title={report.modTitle}>{report.modTitle}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">{report.reporterName}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-red-400/15 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-200">
                      {STATUS_LABELS[report.status] ?? report.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-400">
                    {new Date(report.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/mods/${report.modSlug}#mod-error-reports`}
                      className="inline-flex items-center gap-1 rounded-xl bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-400/15"
                    >
                      Xử lý <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    Chưa có báo cáo lỗi mod nào.
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
