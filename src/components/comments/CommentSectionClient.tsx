'use client';

import { useState } from 'react';

import CommentForm from '@/components/CommentForm';
import type { CommentItem } from '@/lib/types';
import CommentThread from './CommentThread';
import type { MentionCandidate } from './MentionTextarea';

type ReactionSummary = {
  count: number;
  likedByCurrentUser: boolean;
};

type Props = {
  initialComments: CommentItem[];
  modId: string;
  modSlug: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  userName?: string;
  isAdmin: boolean;
  adminUserIds: string[];
  reactionSummaries: Record<string, ReactionSummary>;
  mentionCandidates: MentionCandidate[];
};

type Notice = {
  message: string;
  kind: 'success' | 'error';
} | null;

export default function CommentSectionClient({
  initialComments,
  modId,
  modSlug,
  isLoggedIn,
  currentUserId,
  userName,
  isAdmin,
  adminUserIds,
  reactionSummaries,
  mentionCandidates,
}: Props) {
  const [comments, setComments] =
    useState(initialComments);
  const [notice, setNotice] =
    useState<Notice>(null);

  function handleCreated(comment: CommentItem): void {
    setComments((items) => {
      if (items.some((item) => item.id === comment.id)) {
        return items;
      }

      return [...items, comment];
    });
    setNotice({
      message: comment.parentId
        ? 'Đã gửi trả lời.'
        : 'Luận bàn đã được ghi nhận.',
      kind: 'success',
    });
  }

  function handleUpdated(comment: CommentItem): void {
    setComments((items) =>
      items.map((item) =>
        item.id === comment.id
          ? comment
          : item,
      ),
    );
  }

  function handleDeleted(commentId: string): void {
    setComments((items) =>
      items.filter((item) => item.id !== commentId),
    );
  }

  function handleMutationMessage(
    message: string,
    kind: 'success' | 'error' = 'success',
  ): void {
    setNotice({ message, kind });
  }

  return (
    <>
      <p className="mt-2 text-sm text-slate-400">
        {comments.length === 0
          ? 'Chưa có ai luận bàn.'
          : `${comments.length} lời luận bàn về bản mod này.`}
      </p>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={
            notice.kind === 'error'
              ? 'mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'
              : 'mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'
          }
        >
          {notice.message}
        </div>
      )}

      <div className="mt-6">
        <CommentForm
          modId={modId}
          modSlug={modSlug}
          isLoggedIn={isLoggedIn}
          userName={userName}
          mentionCandidates={mentionCandidates}
          onCreated={handleCreated}
        />
      </div>

      <div className="mt-8">
        <CommentThread
          comments={comments}
          modId={modId}
          modSlug={modSlug}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          adminUserIds={adminUserIds}
          reactionSummaries={reactionSummaries}
          mentionCandidates={mentionCandidates}
          onCommentCreated={handleCreated}
          onCommentUpdated={handleUpdated}
          onCommentDeleted={handleDeleted}
          onMutationMessage={handleMutationMessage}
        />
      </div>
    </>
  );
}
