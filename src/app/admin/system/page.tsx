import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  FileJson,
  HardDrive,
  History,
  Server,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import SystemOperationsClient from '@/components/admin/SystemOperationsClient';
import { getCurrentUser } from '@/lib/auth';
import {
  getSystemOverview,
  type SystemIntegrityIssue,
  type SystemIssueSeverity,
} from '@/lib/system-operations';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trung tâm vận hành',
  robots: { index: false, follow: false },
};

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return 'Không xác định';
  if (bytes < 1_024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1_024;
  let unit = units[0];

  for (let index = 1; index < units.length && value >= 1_024; index += 1) {
    value /= 1_024;
    unit = units[index];
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${unit}`;
}

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

function severityClass(severity: SystemIssueSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'border-rose-300/30 bg-rose-400/15 text-rose-100';
    case 'ERROR':
      return 'border-orange-300/30 bg-orange-400/15 text-orange-100';
    case 'WARNING':
      return 'border-amber-300/30 bg-amber-400/15 text-amber-100';
    default:
      return 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100';
  }
}

function issueLabel(severity: SystemIssueSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'Nghiêm trọng';
    case 'ERROR':
      return 'Lỗi';
    case 'WARNING':
      return 'Cảnh báo';
    default:
      return 'Thông tin';
  }
}

function DirectoryState({
  label,
  state,
}: {
  label: string;
  state: { exists: boolean; readable: boolean; writable: boolean };
}) {
  const healthy = state.exists && state.readable && state.writable;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-3 py-2.5">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-black ${
          healthy
            ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
            : 'border-rose-300/20 bg-rose-400/10 text-rose-200'
        }`}
      >
        {healthy ? 'Đọc/Ghi tốt' : 'Cần kiểm tra'}
      </span>
    </div>
  );
}

function IssueRow({ issue }: { issue: SystemIntegrityIssue }) {
  return (
    <tr className="border-t border-white/5 align-top">
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${severityClass(
            issue.severity,
          )}`}
        >
          {issueLabel(issue.severity)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        {issue.category}
      </td>
      <td className="max-w-56 px-4 py-3 font-mono text-xs text-cyan-200">
        {issue.file || '—'}
        {issue.recordId && (
          <div className="mt-1 break-all text-[11px] text-slate-600">
            {issue.recordId}
          </div>
        )}
      </td>
      <td className="min-w-72 px-4 py-3">
        <p className="font-semibold leading-6 text-slate-200">{issue.message}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {issue.recommendation}
        </p>
      </td>
    </tr>
  );
}

export default async function AdminSystemPage() {
  const admin = await getCurrentUser();

  if (!admin) redirect('/login?next=/admin/system');
  if (admin.role !== 'ADMIN') redirect('/');

  const overview = await getSystemOverview();
  const report = overview.latestIntegrityReport;
  const issueCount = report
    ? report.summary.critical +
      report.summary.errors +
      report.summary.warnings +
      report.summary.info
    : 0;

  return (
    <main className="min-h-screen bg-[#030a14] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">
              Hộ sơn đại trận
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Trung tâm vận hành
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-400">
              Theo dõi sức khỏe JSON, storage, backup và dấu vết thao tác quản trị.
              Phase hiện tại không tự sửa hoặc xóa dữ liệu production.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/release-center"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-300/15"
            >
              <ClipboardCheck className="h-4 w-4" />
              Kiểm thử & phát hành
            </Link>
            <div
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${
                overview.status === 'ok'
                  ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                  : 'border-amber-300/25 bg-amber-400/10 text-amber-100'
              }`}
            >
              {overview.status === 'ok' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {overview.status === 'ok' ? 'Hệ thống ổn định' : 'Hệ thống cần chú ý'}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <div className="flex items-center justify-between">
              <Server className="h-5 w-5 text-cyan-300" />
              <span className="text-xs font-bold text-slate-600">
                v{overview.application.version}
              </span>
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
              Uptime
            </p>
            <p className="mt-1 text-2xl font-black">
              {(overview.application.uptimeSeconds / 3_600).toFixed(1)} giờ
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Môi trường: {overview.application.nodeEnv}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <HardDrive className="h-5 w-5 text-cyan-300" />
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
              Ổ đĩa còn trống
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatBytes(overview.disk.freeBytes)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {overview.disk.freePercent !== undefined
                ? `${overview.disk.freePercent.toFixed(1)}% của ${formatBytes(
                    overview.disk.totalBytes,
                  )}`
                : overview.disk.error || 'Không đọc được statfs'}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <FileJson className="h-5 w-5 text-cyan-300" />
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
              JSON runtime
            </p>
            <p className="mt-1 text-2xl font-black">{overview.jsonFiles.length} file</p>
            <p className="mt-1 text-xs text-slate-500">
              {overview.jsonFiles.filter((file) => !file.parseOk).length} file lỗi parse
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <Database className="h-5 w-5 text-cyan-300" />
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
              Storage
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatBytes(overview.storage.totalBytes)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {overview.storage.fileCount} file · {overview.storage.uploadSessions.total} phiên tạm
            </p>
          </div>
        </div>

        <div className="mt-6">
          <SystemOperationsClient />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-black">Quyền đọc/ghi</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <DirectoryState label="data/" state={overview.directories.data} />
              <DirectoryState label="storage/" state={overview.directories.storage} />
              <DirectoryState label="runtime backups" state={overview.directories.backups} />
            </div>
            <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Runtime đang phục vụ
              </p>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-cyan-200">
                {overview.runtime.projectRoot}
              </p>
              <p className="mt-1 break-all font-mono text-[11px] leading-5 text-slate-500">
                PID {overview.runtime.processId} · storage: {overview.runtime.storageRoot}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-black">Phiên upload</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4 xl:grid-cols-2">
              {[
                ['Tổng phiên', overview.storage.uploadSessions.total],
                ['Quá 24 giờ', overview.storage.uploadSessions.stale],
                ['Manifest lỗi', overview.storage.uploadSessions.corrupt],
                ['Dung lượng tạm', formatBytes(overview.storage.uploadSessions.totalBytes)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-black/15 px-3 py-3">
                  <p className="text-lg font-black text-slate-100">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071523]/90">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-5 w-5 text-amber-300" />
                <h2 className="text-lg font-black">Báo cáo toàn vẹn gần nhất</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {report
                  ? `${formatDate(report.createdAt)} · ${report.durationMs}ms · ${report.summary.filesScanned} file · ${report.summary.recordsScanned} bản ghi`
                  : 'Chưa chạy integrity scan.'}
              </p>
              {report && (
                <p className="mt-1 break-all font-mono text-[11px] leading-5 text-slate-600">
                  Đã quét PID {report.runtime?.processId ?? overview.runtime.processId} · storage:{' '}
                  {report.runtime?.storageRoot ?? overview.runtime.storageRoot}
                </p>
              )}
            </div>

            {report && (
              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-rose-400/10 px-3 py-1.5 text-rose-200">
                  {report.summary.critical} nghiêm trọng
                </span>
                <span className="rounded-full bg-orange-400/10 px-3 py-1.5 text-orange-200">
                  {report.summary.errors} lỗi
                </span>
                <span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-amber-100">
                  {report.summary.warnings} cảnh báo
                </span>
              </div>
            )}
          </div>

          {report && report.issues.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#0a1b2b] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mức độ</th>
                    <th className="px-4 py-3">Nhóm</th>
                    <th className="px-4 py-3">Nguồn</th>
                    <th className="px-4 py-3">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {report.issues.slice(0, 300).map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </tbody>
              </table>
              {(report.issues.length > 300 || report.truncated) && (
                <p className="border-t border-white/5 px-5 py-4 text-sm text-amber-200">
                  Báo cáo dài đã được rút gọn trên giao diện. Không có thao tác repair tự động.
                </p>
              )}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-slate-500">
              {report
                ? `Không phát hiện vấn đề trong ${issueCount} mục báo cáo.`
                : 'Nhấn “Quét toàn vẹn” để tạo báo cáo đầu tiên.'}
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071523]/90">
            <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4">
              <Archive className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-black">Backup JSON</h2>
              <span className="ml-auto text-xs text-slate-600">
                {overview.backups.length} bản
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {overview.backups.slice(0, 12).map((backup) => (
                <div key={backup.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-cyan-200">
                      {backup.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDate(backup.createdAt)} · {formatBytes(backup.bytes)}
                    </p>
                  </div>
                  <Link
                    href={`/api/admin/system/backups/${encodeURIComponent(backup.id)}`}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cyan-300/15 px-3 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tải
                  </Link>
                </div>
              ))}
              {overview.backups.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  Chưa có backup do Trung tâm vận hành tạo.
                </p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071523]/90">
            <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4">
              <History className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-black">Audit log gần đây</h2>
            </div>
            <div className="max-h-[480px] divide-y divide-white/5 overflow-y-auto">
              {overview.auditLogs.slice(0, 50).map((log) => (
                <div key={log.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-slate-200">{log.action}</p>
                    <span className="shrink-0 text-[11px] text-slate-600">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Actor: {log.actorUserId} · {log.targetType}
                    {log.targetId ? ` · ${log.targetId}` : ''}
                  </p>
                  {log.reason && (
                    <p className="mt-1 text-xs text-slate-400">{log.reason}</p>
                  )}
                </div>
              ))}
              {overview.auditLogs.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  Chưa có audit log hệ thống.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-black">Dung lượng theo thư mục</h2>
            </div>
            <div className="mt-4 space-y-2">
              {overview.storage.directories.map((directory) => (
                <div
                  key={directory.name}
                  className="flex items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-cyan-200">
                      storage/{directory.name}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {directory.fileCount} file · {directory.filesOlderThan7Days} file trên 7 ngày
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-slate-200">
                    {formatBytes(directory.totalBytes)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071523]/90">
            <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4">
              <HardDrive className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-black">File storage lớn nhất</h2>
            </div>
            <div className="divide-y divide-white/5">
              {overview.storage.largestFiles.slice(0, 12).map((file) => (
                <div key={file.relativePath} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-slate-300">
                      {file.relativePath}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
                      <Clock3 className="h-3 w-3" />
                      {formatDate(file.modifiedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-slate-200">
                    {formatBytes(file.bytes)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
