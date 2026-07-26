'use client';

import {
  Link2,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelChunkedUploadSession,
  submitChunkedUploadMetadata,
  uploadFileInChunks,
} from '@/lib/client/chunked-file-upload';
import { normalizeExternalDownloadUrl } from '@/lib/download-source';
import RichTextField from '@/components/rich-text/RichTextField';
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
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] =
    useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [downloadSource, setDownloadSource] =
    useState<'LOCAL' | 'EXTERNAL'>('LOCAL');
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

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function uploadVersion(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (uploading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedSource =
      formData.get('downloadSource') === 'EXTERNAL'
        ? 'EXTERNAL'
        : 'LOCAL';

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Đang khởi tạo phiên tải file...');
    setMessage('');

    const abortController = new AbortController();
    uploadAbortRef.current = abortController;
    let sessionId = '';
    let releaseCreated = false;

    try {
      if (selectedSource === 'EXTERNAL') {
        const externalDownloadUrl = normalizeExternalDownloadUrl(
          formData.get('externalDownloadUrl'),
        );
        formData.delete('file');
        formData.delete('uploadSessionId');
        formData.set('downloadSource', 'EXTERNAL');
        formData.set('externalDownloadUrl', externalDownloadUrl);
        setUploadProgress(70);
        setUploadStatus('Đang lưu link tải ngoài và thông tin phiên bản...');
      } else {
        const file = formData.get('file');

        if (!(file instanceof File) || file.size <= 0) {
          throw new Error('Vui lòng chọn file phiên bản.');
        }

        const uploaded = await uploadFileInChunks(file, {
          signal: abortController.signal,
          onProgress: ({ receivedBytes, totalBytes }) => {
            setUploadProgress(
              Math.min(90, Math.round((receivedBytes / totalBytes) * 90)),
            );
            setUploadStatus(
              `Đang tải file phiên bản: ${(receivedBytes / 1024 / 1024).toFixed(1)} / ${(totalBytes / 1024 / 1024).toFixed(1)} MB`,
            );
          },
        });

        sessionId = uploaded.sessionId;
        setUploadProgress(94);
        setUploadStatus('Đang ghi phiên bản và cập nhật thông tin mod...');
        formData.delete('file');
        formData.delete('externalDownloadUrl');
        formData.set('downloadSource', 'LOCAL');
        formData.set('uploadSessionId', sessionId);
      }

      await submitChunkedUploadMetadata(
        `/api/admin/mods/${mod.id}/versions`,
        formData,
        abortController.signal,
      );

      releaseCreated = true;
      form.reset();
      setDownloadSource('LOCAL');
      setUploadProgress(100);
      setUploadStatus('Đã phát hành phiên bản mới.');
      setMessage('Đã phát hành phiên bản mới.');
      router.refresh();
    } catch (error) {
      setMessage(
        abortController.signal.aborted
          ? 'Đã hủy tải file phiên bản.'
          : error instanceof Error
            ? error.message
            : 'Không thể phát hành phiên bản.',
      );
    } finally {
      if (sessionId && !releaseCreated) {
        await cancelChunkedUploadSession(sessionId);
      }

      uploadAbortRef.current = null;
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
        <div className="mt-4">
          <RichTextField
            name="changelog"
            label="Changelog"
            placeholder="Liệt kê thay đổi, sửa lỗi và lưu ý nâng cấp..."
            rows={7}
            maxLength={20_000}
            required
          />
        </div>

        <div className="mt-4 grid gap-3">
          <span className="text-sm font-bold text-slate-200">
            Nguồn tải phiên bản
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`cursor-pointer rounded-2xl border p-4 ${downloadSource === 'LOCAL' ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/10 bg-slate-950/40'}`}>
              <input
                type="radio"
                name="downloadSource"
                value="LOCAL"
                checked={downloadSource === 'LOCAL'}
                onChange={() => setDownloadSource('LOCAL')}
                className="sr-only"
              />
              <span className="flex items-center gap-2 font-semibold text-slate-100">
                <UploadCloud className="h-5 w-5 text-sky-300" />
                File tải trực tiếp
              </span>
              <span className="mt-1 block text-xs text-slate-500">Tối đa 500 MB, tải theo từng phần.</span>
            </label>
            <label className={`cursor-pointer rounded-2xl border p-4 ${downloadSource === 'EXTERNAL' ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-slate-950/40'}`}>
              <input
                type="radio"
                name="downloadSource"
                value="EXTERNAL"
                checked={downloadSource === 'EXTERNAL'}
                onChange={() => setDownloadSource('EXTERNAL')}
                className="sr-only"
              />
              <span className="flex items-center gap-2 font-semibold text-slate-100">
                <Link2 className="h-5 w-5 text-amber-300" />
                Link tải ngoài
              </span>
              <span className="mt-1 block text-xs text-slate-500">Dùng cho Drive, Dropbox hoặc file rất lớn.</span>
            </label>
          </div>

          {downloadSource === 'EXTERNAL' ? (
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-200">Link tải ngoài</span>
              <input
                type="url"
                name="externalDownloadUrl"
                required
                placeholder="https://drive.google.com/..."
                className="w-full"
              />
              <p className="mt-2 text-xs text-amber-200/70">Link phải dùng HTTPS và được chia sẻ công khai.</p>
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-200">File phiên bản</span>
              <input
                type="file"
                name="file"
                accept=".zip,.rar,.7z"
                required
                className="w-full"
              />
              <p className="mt-2 text-xs text-slate-500">ZIP, RAR hoặc 7Z · tối đa 500 MB.</p>
            </label>
          )}
        </div>

        {(uploading || uploadProgress > 0) && (
          <div
            className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-sky-100">
                {uploadStatus || 'Đang chuẩn bị tải lên...'}
              </span>
              <span className="shrink-0 font-bold text-sky-300">
                {uploadProgress}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!hydrated || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadCloud className="h-5 w-5" />
            {!hydrated
              ? 'Đang khởi tạo trình tải...'
              : uploading
                ? 'Đang phát hành...'
                : 'Phát hành phiên bản'}
          </button>

          {uploading && (
            <button
              type="button"
              onClick={() => uploadAbortRef.current?.abort()}
              className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition hover:bg-red-500/20"
            >
              Hủy tải lên
            </button>
          )}
        </div>
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
