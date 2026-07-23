'use client';

import { useEffect, useState } from 'react';

type MigrationResult = {
  executedAt: string;
  backup: {
    directory: string;
    usersFile: string;
    modsFile: string;
  };
  usersTotal: number;
  usersUpdated: number;
  modsTotal: number;
  modsLinked: number;
  modsAlreadyLinked: number;
  unmatchedMods: Array<{
    modId: string;
    title: string;
    author: string;
  }>;
  ambiguousMods: Array<{
    modId: string;
    title: string;
    author: string;
    candidateUserIds: string[];
  }>;
};

type MigrationState = {
  migration: 'user-profile-v1';
  completedAt: string;
  completedByUserId: string;
  result: MigrationResult;
};

type ApiResponse = {
  ok: boolean;
  completed?: boolean;
  message?: string;
  state?: MigrationState | null;
};

export default function UserProfileMigrationPanel() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<MigrationState | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch(
          '/api/admin/migrations/user-profile',
          { cache: 'no-store' },
        );
        const data = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(data.message || 'Không thể tải trạng thái migration.');
        }

        if (!cancelled) {
          setState(data.state ?? null);
        }
      } catch (statusError) {
        if (!cancelled) {
          setError(
            statusError instanceof Error
              ? statusError.message
              : 'Không thể tải trạng thái migration.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runMigration() {
    if (state || running) return;

    const confirmed = window.confirm(
      'Hệ thống sẽ sao lưu users.json và mods.json, sau đó cập nhật dữ liệu. Migration này chỉ được chạy một lần. Đạo hữu có chắc muốn tiếp tục?',
    );

    if (!confirmed) return;

    setRunning(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/migrations/user-profile',
        { method: 'POST' },
      );
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        if (data.state) setState(data.state);
        throw new Error(data.message || 'Migration thất bại.');
      }

      setState(data.state ?? null);
      setMessage(data.message || 'Migration đã hoàn tất.');
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : 'Migration thất bại.',
      );
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-slate-300">
        Đang kiểm tra trạng thái migration...
      </div>
    );
  }

  const result = state?.result;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              User Profile Migration v1
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Chuẩn hóa hồ sơ người dùng, tạo profileSlug duy nhất, liên kết
              authorId cho các mod cũ và sao lưu dữ liệu trước khi ghi.
            </p>
          </div>

          <button
            type="button"
            onClick={runMigration}
            disabled={Boolean(state) || running}
            className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {state
              ? 'Đã chạy migration'
              : running
                ? 'Đang migration...'
                : 'Chạy migration một lần'}
          </button>
        </div>

        {message && (
          <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-950/60 p-4 text-emerald-200">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red-400/20 bg-red-950/60 p-4 text-red-200">
            {error}
          </p>
        )}
      </div>

      {state && result && (
        <div className="rounded-2xl border border-emerald-400/20 bg-slate-900 p-6">
          <h3 className="text-lg font-bold text-emerald-300">
            Migration đã hoàn tất
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Thời gian: {new Date(state.completedAt).toLocaleString('vi-VN')}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Tổng đạo tịch" value={result.usersTotal} />
            <Stat label="Đạo tịch đã cập nhật" value={result.usersUpdated} />
            <Stat label="Tổng mod" value={result.modsTotal} />
            <Stat label="Mod vừa liên kết" value={result.modsLinked} />
            <Stat label="Mod đã có authorId" value={result.modsAlreadyLinked} />
            <Stat label="Mod chưa khớp tác giả" value={result.unmatchedMods.length} />
          </dl>

          <div className="mt-6 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Thư mục backup</p>
            <p className="mt-1 break-all text-slate-400">
              {result.backup.directory}
            </p>
          </div>

          {result.unmatchedMods.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-amber-300">
                Mod chưa tìm thấy tài khoản tác giả
              </h4>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="text-slate-400">
                    <tr className="border-b border-white/10">
                      <th className="px-3 py-3">Tên mod</th>
                      <th className="px-3 py-3">Tác giả cũ</th>
                      <th className="px-3 py-3">Mod ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.unmatchedMods.map((mod) => (
                      <tr key={mod.modId} className="border-b border-white/5">
                        <td className="px-3 py-3 text-white">{mod.title}</td>
                        <td className="px-3 py-3">{mod.author}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-500">
                          {mod.modId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.ambiguousMods.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-amber-300">
                Mod có nhiều tài khoản tác giả trùng khớp
              </h4>
              <div className="mt-3 space-y-3">
                {result.ambiguousMods.map((mod) => (
                  <div
                    key={mod.modId}
                    className="rounded-xl border border-white/10 bg-slate-950 p-4 text-sm"
                  >
                    <p className="font-semibold text-white">{mod.title}</p>
                    <p className="mt-1 text-slate-400">Tác giả: {mod.author}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      Candidate IDs: {mod.candidateUserIds.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="mt-1 text-2xl font-black text-white">{value}</dd>
    </div>
  );
}
