'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Gauge,
  LoaderCircle,
  Rocket,
} from 'lucide-react';

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();

  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Server trả dữ liệu không hợp lệ (HTTP ${response.status}). Hãy xem PM2/proxy log.`,
    );
  }
}

type Feedback = {
  kind: 'success' | 'error';
  message: string;
};

export default function ReleaseCenterClient() {
  const router = useRouter();
  const [busyMode, setBusyMode] = useState<'QUICK' | 'RELEASE' | null>(null);
  const [reason, setReason] = useState('Kiểm tra trước khi phát hành');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function run(mode: 'QUICK' | 'RELEASE') {
    setBusyMode(mode);
    setFeedback(null);

    try {
      const response = await fetch('/api/admin/release-center/run', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ mode, reason }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok || payload.ok !== true) {
        throw new Error(
          String(payload.message ?? 'Không thể chạy kiểm tra.'),
        );
      }

      const report = payload.report as {
        verdict?: unknown;
        summary?: { passed?: unknown; warnings?: unknown; failed?: unknown };
      } | undefined;
      const verdict = String(report?.verdict ?? 'UNKNOWN');
      const passed = Number(report?.summary?.passed ?? 0);
      const warnings = Number(report?.summary?.warnings ?? 0);
      const failed = Number(report?.summary?.failed ?? 0);

      setFeedback({
        kind: failed > 0 ? 'error' : 'success',
        message: `Hoàn tất: ${passed} đạt, ${warnings} cảnh báo, ${failed} thất bại · ${verdict}.`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error
          ? error.message
          : 'Không thể chạy kiểm tra.',
      });
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-64 flex-1">
          <span className="text-xs font-black uppercase tracking-[.14em] text-slate-500">
            Ghi chú lần kiểm tra
          </span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 500))}
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-300/30"
            placeholder="Ví dụ: trước patch bình luận v3"
          />
        </label>

        <button
          type="button"
          disabled={busyMode !== null}
          onClick={() => run('QUICK')}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyMode === 'QUICK' ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Gauge className="h-4 w-4" />
          )}
          Kiểm tra nhanh
        </button>

        <button
          type="button"
          disabled={busyMode !== null}
          onClick={() => run('RELEASE')}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 text-sm font-black text-[#281400] shadow-[0_12px_32px_rgba(251,191,36,.16)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyMode === 'RELEASE' ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
          Kiểm tra phát hành
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Công cụ chỉ đọc dữ liệu. File probe quyền ghi được tạo bằng tên riêng và xóa ngay;
        payload SePay dùng <code className="text-cyan-200">id=0</code> nên không ghi giao dịch.
      </p>

      {feedback && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.kind === 'success'
              ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
              : 'border-rose-300/20 bg-rose-400/10 text-rose-100'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </section>
  );
}
