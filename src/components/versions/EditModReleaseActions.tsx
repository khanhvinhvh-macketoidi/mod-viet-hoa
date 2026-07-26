'use client';

import {
  FileArchive,
  Link2,
  Rocket,
  Save,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  FormEvent,
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

type Props = {
  modId: string;
  currentVersion: string;
  currentGameVersion: string;
  saveFormId: string;
};

export default function EditModReleaseActions({
  modId,
  currentVersion,
  currentGameVersion,
  saveFormId,
}: Props) {
  const router = useRouter();
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [publishing, setPublishing] =
    useState(false);
  const [message, setMessage] =
    useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [downloadSource, setDownloadSource] =
    useState<'LOCAL' | 'EXTERNAL'>('LOCAL');

  function close() {
    if (publishing) return;
    setOpen(false);
    setMessage('');
  }

  async function publish(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (publishing) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedSource =
      formData.get('downloadSource') === 'EXTERNAL'
        ? 'EXTERNAL'
        : 'LOCAL';

    setPublishing(true);
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
        `/api/admin/mods/${modId}/versions`,
        formData,
        abortController.signal,
      );

      releaseCreated = true;
      form.reset();
      setDownloadSource('LOCAL');
      setUploadProgress(100);
      setUploadStatus('Đã phát hành phiên bản mới.');
      setMessage('Đã phát hành phiên bản mới thành công.');
      router.refresh();

      window.setTimeout(() => {
        setOpen(false);
        setMessage('');
        setUploadProgress(0);
        setUploadStatus('');
      }, 900);
    } catch (error) {
      setMessage(
        abortController.signal.aborted
          ? 'Đã hủy tải file phiên bản.'
          : error instanceof Error
            ? error.message
            : 'Không thể phát hành phiên bản mới.',
      );
    } finally {
      if (sessionId && !releaseCreated) {
        await cancelChunkedUploadSession(sessionId);
      }

      uploadAbortRef.current = null;
      setPublishing(false);
    }
  }

  return (
    <>
      <div
        className="
          mt-6 grid gap-3
          sm:grid-cols-2
        "
      >
        <button
          type="submit"
          form={saveFormId}
          className="
            inline-flex items-center
            justify-center gap-2
            rounded-xl bg-amber-400
            px-5 py-3 font-bold
            text-slate-950
            transition hover:bg-amber-300
          "
        >
          <Save className="h-5 w-5" />
          Lưu thay đổi
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="
            inline-flex items-center
            justify-center gap-2
            rounded-xl border
            border-sky-400/30
            bg-sky-400/10
            px-5 py-3 font-bold
            text-sky-200 transition
            hover:bg-sky-400/15
          "
        >
          <Rocket className="h-5 w-5" />
          Phát hành phiên bản mới
        </button>
      </div>

      {open && (
        <div
          className="
            fixed inset-0 z-[130]
            flex items-center justify-center
            bg-black/75 p-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              close();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Phát hành phiên bản mới"
            className="
              max-h-[90vh] w-full
              max-w-2xl overflow-y-auto
              rounded-3xl border
              border-white/10
              bg-slate-950
              shadow-2xl shadow-black/60
            "
          >
            <header
              className="
                flex items-start
                justify-between gap-4
                border-b border-white/10
                p-5
              "
            >
              <div>
                <p
                  className="
                    text-xs font-bold
                    uppercase tracking-wider
                    text-sky-400
                  "
                >
                  Smart Release
                </p>

                <h2
                  className="
                    mt-1 text-2xl
                    font-black text-slate-100
                  "
                >
                  Phát hành phiên bản mới
                </h2>

                <p
                  className="
                    mt-1 text-sm
                    text-slate-500
                  "
                >
                  Phiên bản hiện tại:
                  {' '}
                  <strong
                    className="
                      text-slate-300
                    "
                  >
                    v{currentVersion}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                className="
                  rounded-xl p-2
                  text-slate-500
                  hover:bg-white/5
                  hover:text-slate-200
                "
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form
              onSubmit={publish}
              className="space-y-5 p-5"
            >
              <div
                className="
                  grid gap-4
                  sm:grid-cols-2
                "
              >
                <label className="block">
                  <span
                    className="
                      mb-2 block text-sm
                      font-bold
                      text-slate-200
                    "
                  >
                    Phiên bản mới
                  </span>

                  <input
                    name="version"
                    required
                    placeholder="Ví dụ: 1.2.0"
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <span
                    className="
                      mb-2 block text-sm
                      font-bold
                      text-slate-200
                    "
                  >
                    Phiên bản game
                  </span>

                  <input
                    name="gameVersion"
                    required
                    defaultValue={
                      currentGameVersion
                    }
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

              <div className="grid gap-3">
                <span className="text-sm font-bold text-slate-200">
                  Nguồn tải phiên bản
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`cursor-pointer rounded-2xl border p-4 ${downloadSource === 'LOCAL' ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/10 bg-slate-900/60'}`}>
                    <input
                      type="radio"
                      name="downloadSource"
                      value="LOCAL"
                      checked={downloadSource === 'LOCAL'}
                      onChange={() => setDownloadSource('LOCAL')}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-2 font-semibold text-slate-100">
                      <FileArchive className="h-5 w-5 text-sky-300" />
                      File trực tiếp
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">Tối đa 500 MB.</span>
                  </label>
                  <label className={`cursor-pointer rounded-2xl border p-4 ${downloadSource === 'EXTERNAL' ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-slate-900/60'}`}>
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
                    <span className="mb-2 block text-sm font-bold text-slate-200">File mod mới</span>
                    <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/60 p-5">
                      <div className="flex items-center gap-3">
                        <FileArchive className="h-7 w-7 text-amber-300" />
                        <div>
                          <p className="font-bold text-slate-200">Chọn file phát hành</p>
                          <p className="text-xs text-slate-500">ZIP, RAR hoặc 7Z · tối đa 500 MB</p>
                        </div>
                      </div>
                      <input
                        type="file"
                        name="file"
                        accept=".zip,.rar,.7z"
                        required
                        className="mt-4 w-full"
                      />
                    </div>
                  </label>
                )}
              </div>

              {(publishing || uploadProgress > 0) && (
                <div
                  className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4"
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

              {message && (
                <p
                  className={
                    message.startsWith('Đã phát hành')
                      ? 'text-sm text-emerald-300'
                      : 'text-sm text-red-300'
                  }
                >
                  {message}
                </p>
              )}

              <div
                className="
                  flex flex-wrap
                  justify-end gap-3
                  border-t
                  border-white/10 pt-4
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    if (publishing) {
                      uploadAbortRef.current?.abort();
                    } else {
                      close();
                    }
                  }}
                  className="
                    rounded-xl border
                    border-white/10
                    px-4 py-2
                    font-semibold
                    text-slate-300
                  "
                >
                  {publishing ? 'Hủy tải lên' : 'Hủy'}
                </button>

                <button
                  type="submit"
                  disabled={publishing}
                  className="
                    inline-flex items-center
                    gap-2 rounded-xl
                    bg-sky-400 px-5 py-2
                    font-bold text-slate-950
                    hover:bg-sky-300
                    disabled:opacity-50
                  "
                >
                  <UploadCloud className="h-5 w-5" />

                  {publishing
                    ? 'Đang phát hành...'
                    : 'Phát hành'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
