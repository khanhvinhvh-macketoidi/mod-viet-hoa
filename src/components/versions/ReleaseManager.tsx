'use client';

import {
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  FormEvent,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type {
  ModDependency,
  ModItem,
  ModVersion,
} from '@/lib/types';

type DependencyDraft = {
  dependencyModId: string;
  externalName: string;
  externalUrl: string;
  type: 'REQUIRED' | 'OPTIONAL';
  note: string;
};

type Props = {
  mod: ModItem;
  versions: ModVersion[];
  dependencies: ModDependency[];
  availableMods: Array<{
    id: string;
    title: string;
  }>;
};

export default function ReleaseManager({
  mod,
  versions,
  dependencies,
  availableMods,
}: Props) {
  const router = useRouter();
  const [uploading, setUploading] =
    useState(false);
  const [savingDependencies, setSavingDependencies] =
    useState(false);
  const [message, setMessage] = useState('');

  const [drafts, setDrafts] = useState<
    DependencyDraft[]
  >(
    dependencies.map((item) => ({
      dependencyModId:
        item.dependencyModId ?? '',
      externalName:
        item.externalName ?? '',
      externalUrl:
        item.externalUrl ?? '',
      type: item.type,
      note: item.note,
    })),
  );

  async function uploadVersion(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setUploading(true);
    setMessage('');

    try {
      const form = event.currentTarget;
      const response = await fetch(
        `/api/admin/mods/${mod.id}/versions`,
        {
          method: 'POST',
          body: new FormData(form),
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            'Không thể phát hành phiên bản.',
        );
      }

      form.reset();
      setMessage('Đã phát hành phiên bản mới.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể phát hành phiên bản.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveDependencies() {
    setSavingDependencies(true);
    setMessage('');

    try {
      const response = await fetch(
        `/api/admin/mods/${mod.id}/dependencies`,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            dependencies: drafts,
          }),
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            'Không thể lưu phụ thuộc.',
        );
      }

      setMessage('Đã lưu danh sách phụ thuộc.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu phụ thuộc.',
      );
    } finally {
      setSavingDependencies(false);
    }
  }

  async function deleteVersion(
    versionId: string,
  ) {
    if (
      !window.confirm(
        'Xóa phiên bản cũ này?',
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/admin/mods/${mod.id}/versions/${versionId}`,
      {
        method: 'DELETE',
      },
    );

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      )}

      <form
        onSubmit={uploadVersion}
        className="rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
          Phát hành mới
        </p>

        <h2 className="mt-2 text-2xl font-black">
          Tạo phiên bản mới
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-200">
              Số phiên bản
            </span>
            <input
              name="version"
              required
              placeholder="Ví dụ: 1.2.0"
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-200">
              Phiên bản game
            </span>
            <input
              name="gameVersion"
              required
              defaultValue={mod.gameVersion}
              className="w-full"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold text-slate-200">
            Changelog
          </span>
          <textarea
            name="changelog"
            rows={7}
            required
            placeholder="Liệt kê thay đổi, sửa lỗi và lưu ý nâng cấp..."
            className="w-full"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold text-slate-200">
            File phiên bản
          </span>
          <input
            type="file"
            name="file"
            required
            className="w-full"
          />
        </label>

        <button
          type="submit"
          disabled={uploading}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
        >
          <UploadCloud className="h-5 w-5" />
          {uploading
            ? 'Đang phát hành...'
            : 'Phát hành phiên bản'}
        </button>
      </form>

      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-2xl font-black">
          Các phiên bản hiện có
        </h2>

        <div className="mt-5 space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>
                    v{version.version}
                  </strong>

                  {version.isCurrent && (
                    <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-bold text-emerald-200">
                      Hiện tại
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Game {version.gameVersion} ·{' '}
                  {version.downloads} lượt tải
                </p>
              </div>

              {!version.isCurrent && (
                <button
                  type="button"
                  onClick={() =>
                    void deleteVersion(
                      version.id,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">
              Mod phụ thuộc
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Khai báo mod bắt buộc hoặc tùy chọn trước khi cài đặt.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setDrafts((current) => [
                ...current,
                {
                  dependencyModId: '',
                  externalName: '',
                  externalUrl: '',
                  type: 'REQUIRED',
                  note: '',
                },
              ])
            }
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-200"
          >
            <Plus className="h-4 w-4" />
            Thêm phụ thuộc
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {drafts.map((draft, index) => (
            <article
              key={index}
              className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={draft.dependencyModId}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setDrafts((current) =>
                      current.map(
                        (item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                dependencyModId:
                                  value,
                              }
                            : item,
                      ),
                    );
                  }}
                >
                  <option value="">
                    Chọn mod nội bộ
                  </option>
                  {availableMods.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.title}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={draft.type}
                  onChange={(event) => {
                    const value =
                      event.target.value as
                        | 'REQUIRED'
                        | 'OPTIONAL';

                    setDrafts((current) =>
                      current.map(
                        (item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                type: value,
                              }
                            : item,
                      ),
                    );
                  }}
                >
                  <option value="REQUIRED">
                    Bắt buộc
                  </option>
                  <option value="OPTIONAL">
                    Tùy chọn
                  </option>
                </select>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={draft.externalName}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setDrafts((current) =>
                      current.map(
                        (item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                externalName:
                                  value,
                              }
                            : item,
                      ),
                    );
                  }}
                  placeholder="Tên phụ thuộc ngoài website"
                />

                <input
                  value={draft.externalUrl}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setDrafts((current) =>
                      current.map(
                        (item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                externalUrl:
                                  value,
                              }
                            : item,
                      ),
                    );
                  }}
                  placeholder="Liên kết ngoài"
                />
              </div>

              <textarea
                value={draft.note}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setDrafts((current) =>
                    current.map(
                      (item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              note: value,
                            }
                          : item,
                    ),
                  );
                }}
                rows={3}
                placeholder="Ghi chú cài đặt hoặc thứ tự tải..."
                className="mt-3 w-full"
              />

              <button
                type="button"
                onClick={() =>
                  setDrafts((current) =>
                    current.filter(
                      (_, itemIndex) =>
                        itemIndex !== index,
                    ),
                  )
                }
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                Xóa dòng
              </button>
            </article>
          ))}

          {drafts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
              Mod chưa khai báo phụ thuộc.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            void saveDependencies()
          }
          disabled={savingDependencies}
          className="mt-6 rounded-xl bg-sky-400 px-5 py-3 font-bold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
        >
          {savingDependencies
            ? 'Đang lưu...'
            : 'Lưu phụ thuộc'}
        </button>
      </section>
    </div>
  );
}
