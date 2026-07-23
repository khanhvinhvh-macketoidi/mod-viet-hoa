'use client';

import {
  FormEvent,
  useState,
} from 'react';

import {
  LogIn,
  MessageSquareText,
  Send,
} from 'lucide-react';

type CommentFormProps = {
  modId: string;
  modSlug: string;
  isLoggedIn: boolean;
  userName?: string;
};

const MAX_LENGTH = 1000;

export default function CommentForm({
  modId,
  modSlug,
  isLoggedIn,
  userName,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] =
    useState(false);

  if (!isLoggedIn) {
    return (
      <div
        className="
          rounded-2xl border border-amber-400/20
          bg-amber-400/5 p-5
        "
      >
        <div className="flex items-start gap-3">
          <div
            className="
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-xl bg-amber-400/10
              text-amber-400
            "
          >
            <LogIn className="h-5 w-5" />
          </div>

          <div>
            <p className="font-bold text-slate-100">
              Đăng nhập để bình luận
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Bạn vẫn có thể đọc bình luận của cộng đồng,
              nhưng cần đăng nhập để tham gia thảo luận.
            </p>

            <a
              href={`/login?next=${encodeURIComponent(
                `/mods/${modSlug}#comments`,
              )}`}
              className="
                mt-4 inline-flex items-center gap-2
                rounded-xl bg-amber-400
                px-4 py-2.5 font-bold
                text-slate-950 transition
                hover:bg-amber-300
              "
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </a>
          </div>
        </div>
      </div>
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    if (!content.trim()) {
      event.preventDefault();
      return;
    }

    setSubmitting(true);
  }

  return (
    <form
      action="/api/comments/create"
      method="post"
      onSubmit={handleSubmit}
      className="
        rounded-2xl border border-white/10
        bg-slate-950/50 p-5
      "
    >
      <input
        type="hidden"
        name="modId"
        value={modId}
      />

      <input
        type="hidden"
        name="modSlug"
        value={modSlug}
      />

      <div className="flex items-center gap-3">
        <div
          className="
            flex h-10 w-10 items-center
            justify-center rounded-full
            bg-sky-400/10 text-sky-300
          "
        >
          <MessageSquareText className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-100">
            Viết bình luận
          </p>

          <p className="text-xs text-slate-500">
            Đang bình luận với tên{' '}
            {userName || 'Tán Tu'}
          </p>
        </div>
      </div>

      <textarea
        name="content"
        value={content}
        onChange={(event) =>
          setContent(event.target.value)
        }
        maxLength={MAX_LENGTH}
        rows={5}
        required
        placeholder="Chia sẻ cảm nhận, báo lỗi hoặc đặt câu hỏi về bản mod..."
        className="
          mt-4 min-h-32 w-full resize-y
          rounded-2xl border border-white/10
          bg-slate-900 px-4 py-3
          text-slate-100 outline-none
          transition
          placeholder:text-slate-600
          focus:border-amber-400/50
          focus:ring-2
          focus:ring-amber-400/10
        "
      />

      <div
        className="
          mt-3 flex flex-col gap-3
          sm:flex-row sm:items-center
          sm:justify-between
        "
      >
        <p
          className={
            content.length >= MAX_LENGTH
              ? 'text-xs text-red-300'
              : 'text-xs text-slate-500'
          }
        >
          {content.length}/{MAX_LENGTH} ký tự
        </p>

        <button
          type="submit"
          disabled={
            submitting ||
            !content.trim()
          }
          className="
            inline-flex items-center
            justify-center gap-2
            rounded-xl bg-amber-400
            px-5 py-3 font-bold
            text-slate-950 transition
            hover:bg-amber-300
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <Send className="h-4 w-4" />

          {submitting
            ? 'Đang gửi...'
            : 'Gửi bình luận'}
        </button>
      </div>
    </form>
  );
}