'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

type DeleteModButtonProps = {
  modId: string;
  modTitle: string;
};

export default function DeleteModButton({
  modId,
  modTitle,
}: DeleteModButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          inline-flex items-center gap-2
          rounded-xl border border-red-400/20
          bg-red-500/10 px-3 py-2
          text-sm font-semibold text-red-200
          transition hover:bg-red-500/20
        "
      >
        <Trash2 className="h-4 w-4" />
        Xóa
      </button>

      {open && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/70 px-4
            backdrop-blur-sm
          "
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-mod-title"
            onClick={(event) => event.stopPropagation()}
            className="
              w-full max-w-md rounded-3xl
              border border-white/10
              bg-slate-900 p-6
              shadow-2xl shadow-black/40
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className="
                  flex h-12 w-12 shrink-0
                  items-center justify-center
                  rounded-2xl bg-red-500/10
                  text-red-300
                "
              >
                <AlertTriangle className="h-6 w-6" />
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="
                  rounded-xl p-2 text-slate-500
                  transition hover:bg-white/5
                  hover:text-slate-200
                "
                aria-label="Đóng hộp thoại"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2
              id="delete-mod-title"
              className="mt-5 text-2xl font-black text-slate-100"
            >
              Đạo hữu có chắc muốn xóa?
            </h2>

            <p className="mt-3 leading-6 text-slate-400">
              Mod{' '}
              <span className="font-semibold text-slate-200">
                “{modTitle}”
              </span>{' '}
              sẽ bị xóa khỏi thư viện.
            </p>

            <div
              className="
                mt-4 rounded-2xl
                border border-red-400/20
                bg-red-500/5 p-4
                text-sm leading-6 text-red-200
              "
            >
              Ảnh bìa và file tải xuống liên quan cũng sẽ bị xóa.
              Thao tác này không thể hoàn tác.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="
                  rounded-xl border border-white/10
                  bg-slate-800 px-4 py-2.5
                  font-semibold text-slate-200
                  transition hover:bg-slate-700
                "
              >
                Hủy
              </button>

              <form
                action={`/api/admin/mods/${modId}/delete`}
                method="post"
              >
                <button
                  type="submit"
                  className="
                    inline-flex items-center gap-2
                    rounded-xl bg-red-500
                    px-4 py-2.5
                    font-bold text-white
                    transition hover:bg-red-400
                  "
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa vĩnh viễn
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}