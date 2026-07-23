'use client';

import {
  FileArchive,
  Rocket,
  Save,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  FormEvent,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

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
  const [open, setOpen] = useState(false);
  const [publishing, setPublishing] =
    useState(false);
  const [message, setMessage] =
    useState('');

  function close() {
    if (publishing) return;
    setOpen(false);
    setMessage('');
  }

  async function publish(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPublishing(true);
    setMessage('');

    try {
      const form = event.currentTarget;
      const response = await fetch(
        `/api/admin/mods/${modId}/versions`,
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
            'Không thể phát hành phiên bản mới.',
        );
      }

      setMessage(
        'Đã phát hành phiên bản mới thành công.',
      );

      router.refresh();

      window.setTimeout(() => {
        setOpen(false);
        setMessage('');
      }, 900);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể phát hành phiên bản mới.',
      );
    } finally {
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

              <label className="block">
                <span
                  className="
                    mb-2 block text-sm
                    font-bold
                    text-slate-200
                  "
                >
                  Changelog
                </span>

                <textarea
                  name="changelog"
                  rows={8}
                  required
                  placeholder={
                    '- Thêm tính năng...\n' +
                    '- Sửa lỗi...\n' +
                    '- Cải thiện tương thích...'
                  }
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
                  File mod mới
                </span>

                <div
                  className="
                    rounded-2xl border
                    border-dashed
                    border-white/15
                    bg-slate-900/60 p-5
                  "
                >
                  <div
                    className="
                      flex items-center gap-3
                    "
                  >
                    <FileArchive
                      className="
                        h-7 w-7
                        text-amber-300
                      "
                    />

                    <div>
                      <p
                        className="
                          font-bold
                          text-slate-200
                        "
                      >
                        Chọn file phát hành
                      </p>

                      <p
                        className="
                          text-xs
                          text-slate-500
                        "
                      >
                        Tối đa 500 MB
                      </p>
                    </div>
                  </div>

                  <input
                    type="file"
                    name="file"
                    required
                    className="mt-4 w-full"
                  />
                </div>
              </label>

              {message && (
                <p
                  className={
                    message.startsWith('Đã')
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
                  onClick={close}
                  disabled={publishing}
                  className="
                    rounded-xl border
                    border-white/10
                    px-4 py-2
                    font-semibold
                    text-slate-300
                    disabled:opacity-50
                  "
                >
                  Hủy
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
