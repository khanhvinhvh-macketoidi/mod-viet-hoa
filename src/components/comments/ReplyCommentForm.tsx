'use client';

import { FormEvent, useState } from 'react';
import { Send, X } from 'lucide-react';

import RichTextComposer from '@/components/rich-text/RichTextComposer';
import type { CommentItem } from '@/lib/types';
import type { MentionCandidate } from './MentionTextarea';

type Props = {
  modId: string;
  modSlug: string;
  parentId: string;
  parentUserName: string;
  mentionCandidates: MentionCandidate[];
  onCreated: (comment: CommentItem) => void;
  onCancel: () => void;
};

const MAX_LENGTH = 1000;

function toMentionToken(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_.-]/gu, '');
}

export default function ReplyCommentForm({
  modId,
  modSlug,
  parentId,
  parentUserName,
  mentionCandidates,
  onCreated,
  onCancel,
}: Props) {
  const mention = `@${toMentionToken(parentUserName)} `;
  const [content, setContent] = useState(mention);
  const [mediaAssetId, setMediaAssetId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmedContent = content.trim();
    if ((!trimmedContent && !mediaAssetId) || submitting) return;

    const scrollY = window.scrollY;
    setSubmitting(true);
    setErrorMessage('');

    try {
      const formData = new FormData(event.currentTarget);
      formData.set('content', trimmedContent);
      formData.set('mediaAssetId', mediaAssetId);

      const response = await fetch('/api/comments/create', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const bodyText = await response.text();
      const result = (() => {
        if (!bodyText.trim()) return null;
        try {
          return JSON.parse(bodyText) as {
            ok?: boolean;
            message?: string;
            requestId?: string;
            comment?: CommentItem;
          };
        } catch {
          return null;
        }
      })();

      if (!response.ok || !result?.ok || !result.comment) {
        const requestSuffix = result?.requestId
          ? ` (mã ${result.requestId})`
          : '';
        throw new Error(
          `${result?.message || `Máy chủ trả về lỗi HTTP ${response.status}.`}${requestSuffix}`,
        );
      }

      onCreated(result.comment);
      onCancel();
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể gửi trả lời.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      action="/api/comments/create"
      method="post"
      onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 shadow-inner shadow-sky-950/20"
    >
      <input type="hidden" name="modId" value={modId} />
      <input type="hidden" name="modSlug" value={modSlug} />
      <input type="hidden" name="parentId" value={parentId} />

      <p className="text-sm font-semibold text-sky-300">
        Trả lời {parentUserName}
      </p>

      <RichTextComposer
        name="content"
        value={content}
        onChange={setContent}
        maxLength={MAX_LENGTH}
        rows={3}
        autoFocus
        placeholder={`Viết phản hồi cho ${parentUserName}...`}
        mentionCandidates={mentionCandidates}
        allowMedia
        mediaAssetId={mediaAssetId}
        onMediaAssetChange={setMediaAssetId}
        className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
      />

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-300">
          {errorMessage}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {content.length}/{MAX_LENGTH}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300"
          >
            <X className="h-4 w-4" />
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting || (!content.trim() && !mediaAssetId)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2 font-bold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Đang gửi...' : 'Gửi trả lời'}
          </button>
        </div>
      </div>
    </form>
  );
}
