import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Clock3,
  Download,
  Gauge,
  History,
  Rocket,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import ReleaseCenterClient from '@/components/admin/ReleaseCenterClient';
import { getCurrentUser } from '@/lib/auth';
import {
  getReleaseCenterOverview,
  type ReleaseCheckItem,
  type ReleaseCheckReport,
  type ReleaseCheckStatus,
  type ReleaseCheckVerdict,
} from '@/lib/release-center';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trung tâm kiểm thử & phát hành',
  robots: { index: false, follow: false },
};

function formatDate(value: string | undefined): string {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

function verdictLabel(verdict: ReleaseCheckVerdict): string {
  if (verdict === 'READY') return 'Có thể phát hành';
  if (verdict === 'REVIEW') return 'Cần xem cảnh báo';
  return 'Không nên phát hành';
}

function verdictClass(verdict: ReleaseCheckVerdict): string {
  if (verdict === 'READY') {
    return 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100';
  }
  if (verdict === 'REVIEW') {
    return 'border-amber-300/25 bg-amber-400/10 text-amber-100';
  }
  return 'border-rose-300/25 bg-rose-400/10 text-rose-100';
}

function statusLabel(status: ReleaseCheckStatus): string {
  if (status === 'PASS') return 'Đạt';
  if (status === 'WARNING') return 'Cảnh báo';
  return 'Thất bại';
}

function statusClass(status: ReleaseCheckStatus): string {
  if (status === 'PASS') {
    return 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200';
  }
  if (status === 'WARNING') {
    return 'border-amber-300/20 bg-amber-400/10 text-amber-100';
  }
  return 'border-rose-300/20 bg-rose-400/10 text-rose-100';
}

function StatusIcon({ status }: { status: ReleaseCheckStatus }) {
  if (status === 'PASS') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (status === 'WARNING') return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  return <CircleX className="h-4 w-4 text-rose-300" />;
}

function CheckRow({ check }: { check: ReleaseCheckItem }) {
  return (
    <tr className="border-t border-white/5 align-top">
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(check.status)}`}>
          <StatusIcon status={check.status} />
          {statusLabel(check.status)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        {check.category}
      </td>
      <td className="min-w-52 px-4 py-3">
        <p className="font-bold text-slate-200">{check.title}</p>
        <p className="mt-1 font-mono text-[11px] text-slate-600">
          {check.durationMs}ms · {check.key}
        </p>
      </td>
      <td className="min-w-72 px-4 py-3">
        <p className="leading-6 text-slate-300">{check.detail}</p>
        {check.recommendation && (
          <p className="mt-1 text-xs leading-5 text-amber-100/70">
            {check.recommendation}
          </p>
        )}
      </td>
    </tr>
  );
}

function ReportSummaryCard({
  report,
  title,
  icon,
}: {
  report: ReleaseCheckReport | null;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-cyan-300">
          {icon}
          <p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">
            {title}
          </p>
        </div>
        {report && (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${verdictClass(report.verdict)}`}>
            {verdictLabel(report.verdict)}
          </span>
        )}
      </div>

      {report ? (
        <>
          <p className="mt-4 text-2xl font-black text-white">
            {report.summary.passed}/{report.summary.total} đạt
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {report.summary.warnings} cảnh báo · {report.summary.failed} thất bại · {report.durationMs}ms
          </p>
          <p className="mt-3 text-xs text-slate-600">{formatDate(report.createdAt)}</p>
        </>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Chưa có báo cáo.</p>
      )}
    </div>
  );
}

export default async function AdminReleaseCenterPage() {
  const admin = await getCurrentUser();

  if (!admin) redirect('/login?next=/admin/release-center');
  if (admin.role !== 'ADMIN') redirect('/');

  const overview = await getReleaseCenterOverview();
  const report = overview.latestReport;

  return (
    <main className="min-h-screen bg-[#030a14] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[.18em] text-amber-300">
              Cổng phát hành
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Trung tâm kiểm thử &amp; phát hành
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-400">
              Kiểm tra runtime, JSON, storage, production build, tính năng cộng đồng,
              backup và webhook SePay trước hoặc sau mỗi lần triển khai.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/system"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-400/5 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/10"
            >
              <Wrench className="h-4 w-4" />
              Trung tâm vận hành
            </Link>
            {report && (
              <span className={`inline-flex min-h-10 items-center rounded-xl border px-4 text-sm font-black ${verdictClass(report.verdict)}`}>
                {verdictLabel(report.verdict)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <ReportSummaryCard
            report={overview.latestQuickReport}
            title="Kiểm tra nhanh gần nhất"
            icon={<Gauge className="h-5 w-5" />}
          />
          <ReportSummaryCard
            report={overview.latestReleaseReport}
            title="Kiểm tra phát hành gần nhất"
            icon={<Rocket className="h-5 w-5" />}
          />
          <div className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
              <p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">
                Nguyên tắc an toàn
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Không repair, restore, restart PM2 hoặc tạo dữ liệu nghiệp vụ tự động.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Các probe quyền ghi dùng file tạm riêng và tự xóa trong khối finally.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ReleaseCenterClient />
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071523]/90">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-amber-300" />
                <h2 className="text-lg font-black">Báo cáo gần nhất</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {report
                  ? `${report.mode === 'RELEASE' ? 'Kiểm tra phát hành' : 'Kiểm tra nhanh'} · ${formatDate(report.createdAt)} · ${report.durationMs}ms`
                  : 'Chưa chạy kiểm tra.'}
              </p>
              {report && (
                <p className="mt-1 break-all font-mono text-[11px] leading-5 text-slate-600">
                  PID {report.runtime.processId} · v{report.runtime.applicationVersion} · {report.runtime.projectRoot}
                </p>
              )}
            </div>

            {report && (
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-emerald-200">
                    {report.summary.passed} đạt
                  </span>
                  <span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-amber-100">
                    {report.summary.warnings} cảnh báo
                  </span>
                  <span className="rounded-full bg-rose-400/10 px-3 py-1.5 text-rose-100">
                    {report.summary.failed} thất bại
                  </span>
                </div>
                <Link
                  href={`/api/admin/release-center/reports/${encodeURIComponent(report.id)}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cyan-300/15 px-3 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải JSON
                </Link>
              </div>
            )}
          </div>

          {report ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#0a1b2b] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3">Nhóm</th>
                    <th className="px-4 py-3">Kiểm tra</th>
                    <th className="px-4 py-3">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {report.checks.map((check) => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-slate-500">
              Chạy “Kiểm tra nhanh” để tạo báo cáo đầu tiên.
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071523]/90">
          <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4">
            <History className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-black">Lịch sử kiểm tra</h2>
            <span className="ml-auto text-xs text-slate-600">{overview.reports.length} báo cáo gần nhất</span>
          </div>
          <div className="divide-y divide-white/5">
            {overview.reports.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-200">
                      {item.mode === 'RELEASE' ? 'Kiểm tra phát hành' : 'Kiểm tra nhanh'}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${verdictClass(item.verdict)}`}>
                      {verdictLabel(item.verdict)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(item.createdAt)} · {item.summary.passed}/{item.summary.total} đạt · {item.durationMs}ms
                  </p>
                  {item.reason && (
                    <p className="mt-1 truncate text-xs text-slate-600">{item.reason}</p>
                  )}
                </div>
                <Link
                  href={`/api/admin/release-center/reports/${encodeURIComponent(item.id)}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-black text-slate-300 transition hover:border-cyan-300/20 hover:text-cyan-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </Link>
              </div>
            ))}
            {overview.reports.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Chưa có lịch sử kiểm tra.
              </p>
            )}
          </div>
        </section>

        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/8 bg-black/10 px-5 py-4 text-sm text-slate-500">
          <Clock3 className="h-4 w-4 shrink-0 text-cyan-300" />
          Kiểm tra nhanh phù hợp sau restart; kiểm tra phát hành cần chạy sau build và trước khi công bố patch.
        </div>
      </div>
    </main>
  );
}
