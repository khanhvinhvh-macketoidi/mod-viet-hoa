'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Props = {
  initialTitle?: string;
  initialDescription?: string;
  initialVisibility?: 'PUBLIC' | 'PRIVATE';
  collectionId?: string;
  pendingModId?: string;
  returnTo?: string;
};

export default function CollectionForm({
  initialTitle = '',
  initialDescription = '',
  initialVisibility = 'PRIVATE',
  collectionId,
  pendingModId = '',
  returnTo = '',
}: Props) {
  const router = useRouter();
  const [title, setTitle] =
    useState(initialTitle);
  const [description, setDescription] =
    useState(initialDescription);
  const [visibility, setVisibility] =
    useState(initialVisibility);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState('');

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(
        collectionId
          ? `/api/collections/${collectionId}`
          : '/api/collections',
        {
          method: collectionId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            visibility,
            modId: collectionId ? undefined : pendingModId || undefined,
          }),
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        collection?: {
          slug: string;
        };
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            'Không thể lưu Tàng Kinh Các.',
        );
      }

      const safeReturnTo =
        returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : '';

      router.push(
        collectionId
          ? `/collections/${data.collection?.slug}`
          : safeReturnTo || '/profile/collections',
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu Tàng Kinh Các.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-3xl border border-white/10 bg-slate-900 p-6"
    >
      <div>
        <label className="mb-2 block text-sm font-bold text-slate-200">
          Tên Tàng Kinh Các
        </label>
        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          maxLength={100}
          required
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-amber-400/50"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-200">
          Mô tả
        </label>
        <textarea
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          maxLength={1000}
          rows={6}
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-amber-400/50"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-200">
          Quyền riêng tư
        </label>
        <select
          value={visibility}
          onChange={(event) =>
            setVisibility(
              event.target.value as
                | 'PUBLIC'
                | 'PRIVATE',
            )
          }
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100"
        >
          <option value="PRIVATE">
            Riêng tư
          </option>
          <option value="PUBLIC">
            Công khai
          </option>
        </select>
      </div>

      {message && (
        <p className="text-sm text-red-300">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
      >
        {saving
          ? 'Đang lưu...'
          : collectionId
            ? 'Lưu thay đổi'
            : 'Tạo Tàng Kinh Các'}
      </button>
    </form>
  );
}
