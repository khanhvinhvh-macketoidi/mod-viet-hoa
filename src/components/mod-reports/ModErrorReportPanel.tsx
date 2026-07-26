'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Bug,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

import type {
  ModErrorReportStatus,
  PublicModErrorReport,
} from '@/lib/mod-error-report-types';

type Props = {
  modId: string;
  modSlug: string;
  currentVersion: string;
  isLoggedIn: boolean;
  canManage: boolean;
  initialReports: PublicModErrorReport[];
};

const STATUS_OPTIONS: Array<{
  value: ModErrorReportStatus;
  label: string;
}> = [
  { value: 'NEW', label: 'Mới' },
  { value: 'VERIFYING', label: 'Đang xác minh' },
  { value: 'NEED_INFO', label: 'Cần thêm thông tin' },
  { value: 'FIXED', label: 'Đã sửa' },
  { value: 'REJECTED', label: 'Từ chối' },
];

function statusLabel(status: ModErrorReportStatus): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ModErrorReportPanel({
  modId,
  modSlug,
  currentVersion,
  isLoggedIn,
  canManage,
  initialReports,
}: Props) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [reports, setReports] = useState(initialReports);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [updatingId, setUpdatingId] = useState('');

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function chooseFiles(list: FileList | null): void {
    if (!list) return;
    const selected = Array.from(list).slice(0, 3);
    const invalid = selected.find(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size <= 0 ||
        file.size > 2 * 1024 * 1024,
    );

    if (invalid) {
      setNotice({
        kind: 'error',
        message: 'Mỗi ảnh phải là JPG, PNG hoặc WEBP và không vượt quá 2 MB.',
      });
      return;
    }

    setNotice(null);
    setFiles(selected);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    if (files.length < 1 || files.length > 3) {
      setNotice({ kind: 'error', message: 'Vui lòng đính kèm từ 1 đến 3 ảnh lỗi.' });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      formData.delete('images');
      files.forEach((file) => formData.append('images', file));

      const response = await fetch('/api/mod-error-reports', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        report?: PublicModErrorReport;
      };

      if (!response.ok || !result.ok || !result.report) {
        throw new Error(result.message || `Máy chủ trả về HTTP ${response.status}.`);
      }

      setReports((items) => [result.report!, ...items]);
      setFiles([]);
      form.reset();
      setNotice({ kind: 'success', message: 'Đã gửi báo cáo lỗi cho quản trị viên và tác giả mod.' });
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không thể gửi báo cáo lỗi.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(
    report: PublicModErrorReport,
    status: ModErrorReportStatus,
  ): Promise<void> {
    if (updatingId) return;
    setUpdatingId(report.id);

    try {
      const response = await fetch(`/api/mod-error-reports/${report.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        report?: PublicModErrorReport;
      };

      if (!response.ok || !result.ok || !result.report) {
        throw new Error(result.message || 'Không thể cập nhật trạng thái.');
      }

      setReports((items) =>
        items.map((item) => item.id === report.id ? result.report! : item),
      );
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không thể cập nhật báo cáo.',
      });
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <section
      id="mod-error-reports"
      className="mt-12 scroll-mt-24 rounded-3xl border border-red-400/15 bg-slate-900 p-5 md:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-red-300">
            Hỗ trợ chất lượng
          </p>
          <h2 className="mt-2 flex items-center gap-3 text-3xl font-black">
            <Bug className="h-7 w-7 text-red-300" />
            Báo cáo lỗi mod
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Gửi mô tả và 1–3 ảnh lỗi để tác giả hoặc quản trị viên dễ xác minh.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 font-bold text-red-200 transition hover:bg-red-500/15"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? 'Thu gọn' : 'Tạo báo cáo'}
        </button>
      </div>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={notice.kind === 'error'
            ? 'mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'
            : 'mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'}
        >
          {notice.message}
        </div>
      )}

      {open && !isLoggedIn && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-slate-300">
          Đạo hữu cần{' '}
          <a
            href={`/login?next=${encodeURIComponent(`/mods/${modSlug}#mod-error-reports`)}`}
            className="font-bold text-amber-300 hover:text-amber-200"
          >
            đăng nhập
          </a>{' '}
          để gửi báo cáo lỗi.
        </div>
      )}

      {open && isLoggedIn && (
        <form onSubmit={submitReport} className="mt-6 rounded-2xl border border-white/10 bg-slate-950/45 p-5">
          <input type="hidden" name="modId" value={modId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-300">
              Phiên bản mod gặp lỗi
              <input
                name="version"
                defaultValue={currentVersion}
                required
                maxLength={60}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-red-400/50"
              />
            </label>

            <label className="text-sm font-semibold text-slate-300">
              Loại lỗi
              <select
                name="category"
                defaultValue="OTHER"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-red-400/50"
              >
                <option value="INSTALLATION">Cài đặt</option>
                <option value="CRASH">Crash / treo game</option>
                <option value="TRANSLATION">Dịch thuật / hiển thị chữ</option>
                <option value="COMPATIBILITY">Không tương thích phiên bản</option>
                <option value="MISSING_FILE">Thiếu hoặc hỏng file</option>
                <option value="OTHER">Khác</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-300">
            Tiêu đề ngắn
            <input
              name="title"
              required
              minLength={5}
              maxLength={140}
              placeholder="Ví dụ: Game treo khi mở nhiệm vụ Chương 3"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-red-400/50"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-300">
            Mô tả chi tiết
            <textarea
              name="description"
              required
              minLength={15}
              maxLength={4000}
              rows={5}
              placeholder="Lỗi xuất hiện ở đâu, biểu hiện cụ thể và tần suất xảy ra..."
              className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-red-400/50"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-300">
            Các bước tái hiện
            <textarea
              name="reproductionSteps"
              required
              minLength={5}
              maxLength={3000}
              rows={4}
              placeholder={'1. Mở game...\n2. Vào mục...\n3. Lỗi xuất hiện...'}
              className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-red-400/50"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-300">
            Môi trường — không bắt buộc
            <input
              name="environment"
              maxLength={500}
              placeholder="Phiên bản game, Windows, mod khác đang dùng..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-red-400/50"
            />
          </label>

          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-300">
              Ảnh lỗi <span className="text-red-300">(bắt buộc 1–3 ảnh)</span>
            </p>
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-red-400/25 bg-red-500/5 px-5 py-8 text-center transition hover:bg-red-500/10">
              <ImagePlus className="h-6 w-6 text-red-300" />
              <span>
                <strong className="block text-slate-200">Chọn ảnh chụp lỗi</strong>
                <span className="mt-1 block text-xs text-slate-500">JPG, PNG hoặc WEBP · tối đa 2 MB/ảnh</span>
              </span>
              <input
                type="file"
                name="images"
                accept="image/jpeg,image/png,image/webp"
                multiple
                required
                onChange={(event) => chooseFiles(event.target.files)}
                className="sr-only"
              />
            </label>

            {previews.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {previews.map((preview, index) => (
                  <div key={`${preview.file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.url} alt={`Ảnh lỗi ${index + 1}`} className="h-36 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-red-500"
                      aria-label={`Bỏ ảnh ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || files.length < 1}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-red-400 px-5 py-3 font-black text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {submitting ? 'Đang gửi...' : 'Gửi báo cáo lỗi'}
          </button>
        </form>
      )}

      {reports.length > 0 && (
        <div className="mt-7 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            {canManage && <ShieldCheck className="h-4 w-4 text-amber-300" />}
            {canManage ? 'Báo cáo cần xử lý' : 'Báo cáo của bạn'}
          </div>

          {reports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-200">
                      {statusLabel(report.status)}
                    </span>
                    <span className="text-xs text-slate-500">v{report.version}</span>
                  </div>
                  <h3 className="mt-3 break-words text-lg font-bold text-slate-100">{report.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {report.reporterName} · {formatDate(report.createdAt)}
                  </p>
                </div>

                {canManage && (
                  <select
                    value={report.status}
                    disabled={updatingId === report.id}
                    onChange={(event) => void updateStatus(report, event.target.value as ModErrorReportStatus)}
                    className="shrink-0 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-300">{report.description}</p>
              <div className="mt-4 rounded-xl border border-white/5 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Các bước tái hiện</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{report.reproductionSteps}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {report.imageUrls.map((url, index) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Ảnh lỗi ${index + 1}`} className="h-36 w-full object-cover transition hover:scale-[1.02]" />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
