'use client';

import { useState } from 'react';
import type { NotificationPreferences } from '@/lib/notification-preferences';

type Props = {
  initialPreferences: NotificationPreferences;
};

const options: Array<{
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}> = [
  {
    key: 'follow',
    title: 'Đồng đạo mới kết giao',
    description: 'Truyền âm khi có thành viên bắt đầu kết giao với đạo hữu.',
  },
  {
    key: 'modPublished',
    title: 'Mod mới từ tác giả đang theo dõi',
    description: 'Truyền âm khi tác giả đạo hữu đang kết giao đăng mod mới.',
  },
  {
    key: 'comment',
    title: 'Luận bàn trên mod',
    description: 'Truyền âm khi mod của đạo hữu nhận luận bàn mới.',
  },
  {
    key: 'reply',
    title: 'Hồi đáp luận bàn',
    description: 'Truyền âm khi có người trả lời lời luận bàn của đạo hữu.',
  },
  {
    key: 'review',
    title: 'Luận đạo mới',
    description: 'Truyền âm khi mod của đạo hữu nhận luận đạo mới.',
  },
];

export default function NotificationPreferencesForm({
  initialPreferences,
}: Props) {
  const [preferences, setPreferences] =
    useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(
        '/api/notification-preferences',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preferences),
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        preferences?: NotificationPreferences;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || 'Không thể lưu cài đặt.',
        );
      }

      if (data.preferences) {
        setPreferences(data.preferences);
      }

      setMessage('Đã lưu cài đặt truyền âm.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu cài đặt.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
      <div className="space-y-4">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-white/10 bg-slate-900/70 p-4"
          >
            <span>
              <strong className="block text-slate-100">
                {option.title}
              </strong>
              <span className="mt-1 block text-sm leading-6 text-slate-400">
                {option.description}
              </span>
            </span>

            <input
              type="checkbox"
              checked={preferences[option.key]}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  [option.key]: event.target.checked,
                }))
              }
              className="mt-1 h-5 w-5 accent-amber-400"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>

        {message && (
          <p className="text-sm text-slate-300">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
