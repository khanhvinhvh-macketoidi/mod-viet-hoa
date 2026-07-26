'use client';

import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';
import { Archive, LoaderCircle, ScanSearch } from 'lucide-react';

type Feedback = {
  kind: 'success' | 'error';
  message: string;
};

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

export default function SystemOperationsClient() {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<'scan' | 'backup' | null>(null);
  const [reason, setReason] = useState('Backup thủ công từ Trung tâm vận hành');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function runScan() {
    setBusyAction('scan');
    setFeedback(null);

    try {
      const response = await fetch('/api/admin/system/scan', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const body = await readJsonResponse(response);

      if (!response.ok || body.ok !== true) {
        throw new Error(String(body.message ?? 'Không thể chạy integrity scan.'));
      }

      setFeedback({
        kind: 'success',
        message: 'Đã quét toàn vẹn. Báo cáo mới nhất đang được hiển thị.',
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không thể chạy integrity scan.',
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function createBackup() {
    setBusyAction('backup');
    setFeedback(null);

    try {
      const response = await fetch('/api/admin/system/backups', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      const body = await readJsonResponse(response);

      if (!response.ok || body.ok !== true) {
        throw new Error(String(body.message ?? 'Không thể tạo backup.'));
      }

      setFeedback({
        kind: 'success',
        message: 'Đã tạo backup ZIP ngoài cây source và ghi audit log.',
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không thể tạo backup.',
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-300/10 bg-[#071523]/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,.24)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">
            Thao tác an toàn
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            Quét trước, sửa sau
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Phase này chỉ đọc dữ liệu, tạo báo cáo và backup. Không có nút repair,
            restore hoặc xóa file tự động.
          </p>
        </div>

        <button
          type="button"
          onClick={runScan}
          disabled={busyAction !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyAction === 'scan' ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ScanSearch className="h-4 w-4" />
          )}
          Quét toàn vẹn
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Lý do backup
          </span>
          <input
            value={reason}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setReason(event.target.value.slice(0, 500))
            }
            maxLength={500}
            className="min-h-11 w-full rounded-xl border border-white/10 bg-[#03101c] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40"
            placeholder="Ví dụ: Trước khi cập nhật source"
          />
        </label>

        <button
          type="button"
          onClick={createBackup}
          disabled={busyAction !== null}
          className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyAction === 'backup' ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Tạo backup JSON
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.kind === 'success'
              ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
              : 'border-rose-300/20 bg-rose-400/10 text-rose-100'
          }`}
          role="status"
        >
          {feedback.message}
        </div>
      )}
    </section>
  );
}
