'use client';

import {
  ChevronDown,
  ChevronRight,
  Heart,
  Link2,
  Lock,
  MessageCircleReply,
  ShieldCheck,
  Trash2,
  UserRound,
  EyeOff,
  Unlock,
} from 'lucide-react';
import {
  useMemo,
  useState,
} from 'react';

import type { CommentTreeNode } from '@/lib/comment-tree';
import MentionText from './MentionText';
import ReplyCommentForm from './ReplyCommentForm';
import type { MentionCandidate } from './MentionTextarea';

type ReactionSummary = {
  count: number;
  likedByCurrentUser: boolean;
};

type Props = {
  node: CommentTreeNode;
  modId: string;
  modSlug: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  adminUserIds: string[];
  reactionSummary?: ReactionSummary;
  reactionSummaries: Record<string, ReactionSummary>;
  mentionCandidates: MentionCandidate[];
  initialVisibleChildren?: number;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getVisibleContent(node: CommentTreeNode): {
  text: string;
  muted: boolean;
} {
  switch (node.moderationStatus) {
    case 'HIDDEN':
      return {
        text: 'Bình luận đã bị ẩn bởi quản trị viên.',
        muted: true,
      };
    case 'DELETED':
      return {
        text: 'Bình luận đã bị người viết xóa.',
        muted: true,
      };
    default:
      return {
        text: node.content,
        muted: false,
      };
  }
}

export default function CommentNode({
  node,
  modId,
  modSlug,
  isLoggedIn,
  currentUserId,
  isAdmin,
  adminUserIds,
  reactionSummary,
  reactionSummaries,
  mentionCandidates,
  initialVisibleChildren = 3,
}: Props) {
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [visibleChildren, setVisibleChildren] =
    useState(initialVisibleChildren);
  const [reaction, setReaction] = useState(
    reactionSummary ?? {
      count: 0,
      likedByCurrentUser: false,
    },
  );
  const [reacting, setReacting] = useState(false);
  const [likePulse, setLikePulse] = useState(false);

  const content = useMemo(
    () => getVisibleContent(node),
    [node],
  );

  const canDelete =
    isAdmin ||
    currentUserId === node.userId;

  const canReply =
    isLoggedIn &&
    !node.isLocked &&
    node.moderationStatus !== 'HIDDEN' &&
    node.moderationStatus !== 'DELETED';

  const shownChildren = node.children.slice(
    0,
    visibleChildren,
  );

  async function toggleLike() {
    if (!isLoggedIn || reacting) return;

    const previous = reaction;
    const optimisticLiked =
      !reaction.likedByCurrentUser;

    setReaction({
      likedByCurrentUser: optimisticLiked,
      count: Math.max(
        0,
        reaction.count +
          (optimisticLiked ? 1 : -1),
      ),
    });

    setLikePulse(true);
    window.setTimeout(
      () => setLikePulse(false),
      280,
    );

    setReacting(true);

    try {
      const response = await fetch(
        `/api/comments/${node.id}/reaction`,
        {
          method: 'POST',
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        liked?: boolean;
        count?: number;
      };

      if (!response.ok || !data.ok) {
        setReaction(previous);
        return;
      }

      setReaction({
        count: data.count ?? previous.count,
        likedByCurrentUser:
          data.liked ??
          previous.likedByCurrentUser,
      });
    } catch {
      setReaction(previous);
    } finally {
      setReacting(false);
    }
  }

  async function copyLink() {
    const url = new URL(window.location.href);
    url.hash = `comment-${node.id}`;

    await navigator.clipboard.writeText(url.toString());
    window.history.replaceState(null, '', url.toString());
  }

  const depthClass =
    node.depth === 0
      ? ''
      : 'relative ml-3 pl-4 sm:ml-7 sm:pl-6';

  const connector =
    node.depth === 0 ? null : (
      <>
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 top-0 w-px bg-gradient-to-b from-sky-400/35 via-white/10 to-transparent"
        />
        <span
          aria-hidden="true"
          className="absolute left-0 top-8 h-px w-4 bg-sky-400/25 sm:w-6"
        />
      </>
    );

  return (
    <div className={depthClass}>
      {connector}
      <article
        id={`comment-${node.id}`}
        className="comment-card scroll-mt-28 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/75 to-slate-950/40 p-5 shadow-sm shadow-black/20 transition duration-300 hover:border-white/15"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-bold text-slate-100">
                  {node.userName}
                </p>

                {adminUserIds.includes(node.userId) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                    <ShieldCheck className="h-3 w-3" />
                    Giới Đế
                  </span>
                )}

                {node.isLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-200">
                    <Lock className="h-3 w-3" />
                    Đã khóa
                  </span>
                )}
              </div>

              <time
                dateTime={node.createdAt}
                className="mt-1 block text-xs text-slate-500"
              >
                {formatDate(node.createdAt)}
              </time>
            </div>
          </div>

          {canDelete && (
            <form
              action={`/api/comments/${node.id}/delete`}
              method="post"
            >
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa
              </button>
            </form>
          )}
        </div>

        <p
          className={
            content.muted
              ? 'mt-4 italic leading-7 text-slate-500'
              : 'mt-4 whitespace-pre-wrap break-words leading-7 text-slate-300'
          }
        >
          {content.muted ? (
            content.text
          ) : (
            <MentionText content={content.text} />
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleLike()}
            disabled={!isLoggedIn || reacting}
            className={
              reaction.likedByCurrentUser
                ? 'inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition active:scale-95'
                : 'inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/10 active:scale-95'
            }
          >
            <Heart
              className={
                likePulse
                  ? 'h-3.5 w-3.5 scale-125 transition-transform'
                  : 'h-3.5 w-3.5 transition-transform'
              }
              fill={
                reaction.likedByCurrentUser
                  ? 'currentColor'
                  : 'none'
              }
            />
            {reaction.count}
          </button>

          {canReply && (
            <button
              type="button"
              onClick={() => setReplying((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10"
            >
              <MessageCircleReply className="h-3.5 w-3.5" />
              Trả lời
            </button>
          )}

          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10"
          >
            <Link2 className="h-3.5 w-3.5" />
            Sao chép liên kết
          </button>

          {node.children.length > 0 && (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10"
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {collapsed
                ? `Mở ${node.children.length} phản hồi`
                : 'Thu gọn'}
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <form
              action={`/api/comments/${node.id}/moderate`}
              method="post"
            >
              <input
                type="hidden"
                name="action"
                value={
                  node.moderationStatus === 'HIDDEN'
                    ? 'show'
                    : 'hide'
                }
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300"
              >
                <EyeOff className="h-3.5 w-3.5" />
                {node.moderationStatus === 'HIDDEN'
                  ? 'Hiện lại'
                  : 'Ẩn'}
              </button>
            </form>

            <form
              action={`/api/comments/${node.id}/moderate`}
              method="post"
            >
              <input
                type="hidden"
                name="action"
                value={node.isLocked ? 'unlock' : 'lock'}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300"
              >
                {node.isLocked ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {node.isLocked ? 'Mở khóa' : 'Khóa'}
              </button>
            </form>
          </div>
        )}

        {replying && (
          <ReplyCommentForm
            modId={modId}
            modSlug={modSlug}
            parentId={node.id}
            parentUserName={node.userName}
            mentionCandidates={mentionCandidates}
            onCancel={() => setReplying(false)}
          />
        )}
      </article>

      {!collapsed && node.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {shownChildren.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              modId={modId}
              modSlug={modSlug}
              isLoggedIn={isLoggedIn}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              adminUserIds={adminUserIds}
              reactionSummary={
                reactionSummaries[child.id]
              }
              reactionSummaries={reactionSummaries}
              mentionCandidates={mentionCandidates}
              initialVisibleChildren={
                initialVisibleChildren
              }
            />
          ))}

          {visibleChildren < node.children.length && (
            <button
              type="button"
              onClick={() =>
                setVisibleChildren((value) =>
                  Math.min(
                    node.children.length,
                    value + initialVisibleChildren,
                  ),
                )
              }
              className="ml-3 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-sky-300 sm:ml-6"
            >
              Xem thêm{' '}
              {Math.min(
                initialVisibleChildren,
                node.children.length -
                  visibleChildren,
              )}{' '}
              phản hồi
            </button>
          )}
        </div>
      )}
    </div>
  );
}
