import type { AvatarRankTier } from '@/lib/author-center/avatar-ranks';
import {
  getAvatarRankConfig,
  getAvatarRankStyle,
} from '@/lib/author-center/avatar-ranks';

type AvatarRankFrameProps = {
  tier: AvatarRankTier;
  avatar: string;
  alt: string;
  isLateStage?: boolean;
};

export default function AvatarRankFrame({
  tier,
  avatar,
  alt,
  isLateStage = false,
}: AvatarRankFrameProps) {
  const rank = getAvatarRankConfig(tier);

  const rootClassName = [
    'avatar-rank',
    rank.className,
    rank.effects.particles
      ? 'avatar-rank--particles-enabled'
      : '',
    rank.effects.breathe && isLateStage
      ? 'avatar-rank--breathe-enabled'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClassName}
      data-avatar-rank={rank.slug}
      data-frame-mode={rank.frame.mode}
      style={getAvatarRankStyle(rank)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="avatar-rank__glow"
        src={rank.glow.asset.src}
        alt=""
        aria-hidden="true"
      />

      <span
        className="avatar-rank__particles"
        aria-hidden="true"
      />

      <span className="avatar-rank__photo-window">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="avatar-rank__photo"
          src={avatar}
          alt={alt}
        />
      </span>

      {rank.frame.mode === "image" && rank.frame.asset?.src ? (
  <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      className="avatar-rank__frame avatar-rank__frame--image"
      src={rank.frame.asset.src}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        left: `${rank.frame.geometry.left}%`,
        top: `${rank.frame.geometry.top}%`,
        width: `${rank.frame.geometry.width}%`,
        height: `${rank.frame.geometry.height}%`,
        display: "block",
        visibility: "visible",
        opacity: 1,
        objectFit: "contain",
        pointerEvents: "none",
        zIndex: 6,
      }}
    />
  </>
) : (
  <span
    className="avatar-rank__frame avatar-rank__frame--css"
    aria-hidden="true"
    style={{
      position: "absolute",
      left: `${rank.frame.geometry.left}%`,
      top: `${rank.frame.geometry.top}%`,
      width: `${rank.frame.geometry.width}%`,
      height: `${rank.frame.geometry.height}%`,
      display: "block",
      zIndex: 6,
    }}
  >
    <span className="avatar-rank__botanical avatar-rank__botanical--tl" />
    <span className="avatar-rank__botanical avatar-rank__botanical--tr" />
    <span className="avatar-rank__botanical avatar-rank__botanical--bl" />
    <span className="avatar-rank__botanical avatar-rank__botanical--br" />
  </span>
)}

      <span className="avatar-rank__badge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rank.badge.asset.src}
          alt=""
          aria-hidden="true"
        />

        {rank.badge.textOverlay ? (
          <strong>
            {rank.badge.textOverlay.text}
          </strong>
        ) : null}
      </span>
    </div>
  );
}
