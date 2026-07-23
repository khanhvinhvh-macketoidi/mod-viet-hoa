import { buildCommentTree } from '@/lib/comment-tree';
import type { CommentItem } from '@/lib/types';
import CommentNode from './CommentNode';
import CommentHashFocus from './CommentHashFocus';
import type { MentionCandidate } from './MentionTextarea';

type ReactionSummary = {
  count: number;
  likedByCurrentUser: boolean;
};

type Props = {
  comments: CommentItem[];
  modId: string;
  modSlug: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  adminUserIds: string[];
  reactionSummaries: Record<string, ReactionSummary>;
  mentionCandidates: MentionCandidate[];
};

export default function CommentThread({
  comments,
  modId,
  modSlug,
  isLoggedIn,
  currentUserId,
  isAdmin,
  adminUserIds,
  reactionSummaries,
  mentionCandidates,
}: Props) {
  const roots = buildCommentTree(comments);

  if (roots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center">
        <p className="font-semibold text-slate-300">
          Chưa có lời luận bàn
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Hãy là người đầu tiên chia sẻ cảm nhận về bản mod này.
        </p>
      </div>
    );
  }

  return (
    <>
      <CommentHashFocus />
      <div className="space-y-5">
      {roots.map((node) => (
        <CommentNode
          key={node.id}
          node={node}
          modId={modId}
          modSlug={modSlug}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          adminUserIds={adminUserIds}
          reactionSummary={reactionSummaries[node.id]}
          reactionSummaries={reactionSummaries}
          mentionCandidates={mentionCandidates}
        />
      ))}
      </div>
    </>
  );
}
