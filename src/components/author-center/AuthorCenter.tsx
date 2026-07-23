import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import AvatarRankFrame from '@/components/author-center/AvatarRankFrame';
import AuthorProfileTabs from '@/components/author-center/AuthorProfileTabs';
import ShareAuthorProfileButton from '@/components/author-center/ShareAuthorProfileButton';
import {
  getAvatarRankConfig,
  getAvatarRankStyle,
  type AvatarRankTier,
} from '@/lib/author-center/avatar-ranks';
import {
  CalendarDays,
  Download,
  ExternalLink,
  Share2,
  FileArchive,
  Code2,
  Globe2,
  MapPin,
  MessageCircle,
  Pencil,
  Sparkles,
  Star,
  Gamepad2,
  UsersRound,
  Play,
} from 'lucide-react';
import {
  formatCompactNumber,
  formatJoinDate,
  getAvatarFrameTier,
  getCultivationRealm,
  sanitizePublicUrl,
  type AuthorCenterStats,
  type AuthorCenterUser,
} from '@/lib/author-center/author-center';

type AuthorCenterProps = {
  user: AuthorCenterUser;
  stats: AuthorCenterStats;
  avatar: string;
  isOwner?: boolean;
  mods: ReactNode;
  action?: ReactNode;
  variant?: 'private' | 'public';
  profileSlug?: string;
};

export default function AuthorCenter({
  user,
  stats,
  avatar,
  isOwner = false,
  mods,
  action,
  variant = 'private',
  profileSlug,
}: AuthorCenterProps) {
  const profile = user.profile;
  const displayName = profile?.displayName?.trim() || user.name;
  const realm = getCultivationRealm(stats);
  const frameTier = getAvatarFrameTier(user) as AvatarRankTier;
  const avatarRank = getAvatarRankConfig(frameTier);
  const lateClass = realm.isLateStage ? 'is-late-stage' : '';
  const phaseOrder = ['SO_KY', 'TRUNG_KY', 'HAU_KY'] as const;
  const currentPhaseIndex = phaseOrder.indexOf(realm.phase);
  const overallCultivationProgress = Math.min(
    100,
    Math.max(
      0,
      Math.round((realm.currentXp / Math.max(1, realm.stageEndXp)) * 100),
    ),
  );
  const phaseSteps = [
    { id: 'SO_KY', label: 'Sơ kỳ' },
    { id: 'TRUNG_KY', label: 'Trung kỳ' },
    { id: 'HAU_KY', label: 'Hậu kỳ' },
  ] as const;

  const website = sanitizePublicUrl(profile?.website);
  const facebook = sanitizePublicUrl(profile?.socialLinks?.facebook);
  const youtube = sanitizePublicUrl(profile?.socialLinks?.youtube);
  const github = sanitizePublicUrl(profile?.socialLinks?.github);
  const steam = sanitizePublicUrl(profile?.socialLinks?.steam);
  const discord = profile?.socialLinks?.discord?.trim();
  const isPublicProfile = variant === 'public';
  const publicProfilePath = profileSlug ? `/authors/${profileSlug}` : undefined;

  const socialLinks = [
    website && { href: website, label: 'Website', icon: Globe2 },
    facebook && { href: facebook, label: 'Facebook', icon: Share2 },
    youtube && { href: youtube, label: 'YouTube', icon: Play },
    github && { href: github, label: 'GitHub', icon: Code2 },
    steam && { href: steam, label: 'Steam', icon: Gamepad2 },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: typeof Globe2;
  }>;

  return (
    <main className={`author-center-page ${realm.className} author-tier-${frameTier.toLowerCase().replaceAll('_', '-')} ${isPublicProfile ? 'author-center-page--public' : 'author-center-page--private'}`}>
      <section className="author-center-shell">
        <section className="cultivation-hero">
          <div className="cultivation-hero__background" aria-hidden="true">
            <div className="cultivation-hero__mist cultivation-hero__mist--one" />
            <div className="cultivation-hero__mist cultivation-hero__mist--two" />
            <div className="cultivation-hero__stars" />
          </div>

          <div className="cultivation-hero__layout">
            <aside className="cultivation-hero__avatar-column">
              <AvatarRankFrame
                tier={frameTier}
                avatar={avatar}
                alt={`Ảnh đại diện của ${displayName}`}
                isLateStage={realm.isLateStage}
              />
            </aside>

            <div className="cultivation-hero__content-column">
              <div className="cultivation-hero__top-row">
                <div className="cultivation-hero__identity">
                  <p className={`cultivation-title ${lateClass}`}>
                    <Sparkles size={13} />
                    <span>{realm.name}</span>
                    <i>·</i>
                    <span>{realm.phaseName}</span>
                  </p>

                  <h1 className={`realm-nickname ${lateClass}`}>{displayName}</h1>

                  <div className="cultivation-hero__meta">
                    <span className="author-handle">@{user.name}</span>
                    <span>
                      <CalendarDays size={14} />
                      Tham gia {formatJoinDate(user.createdAt)}
                    </span>
                    {profile?.location && (
                      <span>
                        <MapPin size={14} />
                        {profile.location}
                      </span>
                    )}
                  </div>

                  <p className="author-bio">
                    {profile?.bio?.trim() ||
                      'Tác giả chưa cập nhật phần giới thiệu cá nhân.'}
                  </p>
                </div>

                <div className="author-actions">
                  {isPublicProfile ? (
                    <span className="author-public-chip">Đạo tịch công khai</span>
                  ) : null}
                  {action}
                  {isPublicProfile && publicProfilePath ? (
                    <ShareAuthorProfileButton profilePath={publicProfilePath} />
                  ) : null}
                  {isOwner && (
                    <Link href="/profile/edit" className="iv2-form-secondary">
                      <Pencil size={15} />
                      Chỉnh sửa đạo tịch
                    </Link>
                  )}
                </div>
              </div>

              <div className={`cultivation-progress cultivation-progress--hero ${lateClass}`}>
                <div className="cultivation-progress__header">
                  <div>
                    <span className="cultivation-progress__eyebrow">Tu vi</span>
                    <strong className="cultivation-progress__realm">
                      {realm.name} · {realm.phaseName}
                    </strong>
                  </div>

                  <div className="cultivation-progress__value">
                    <strong>
                      {formatCompactNumber(realm.currentXp)} /{' '}
                      {formatCompactNumber(realm.stageEndXp)}
                    </strong>
                    <span>{overallCultivationProgress}%</span>
                  </div>
                </div>

                <div
                  className="cultivation-meridian"
                  role="progressbar"
                  aria-label={`Tiến độ Tu vi ${realm.name}, ${realm.phaseName}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={overallCultivationProgress}
                >
                  <div className="cultivation-meridian__track" aria-hidden="true">
                    <span
                      className="cultivation-meridian__fill"
                      style={{ width: `${overallCultivationProgress}%` }}
                    >
                      <i />
                    </span>
                  </div>

                  <div className="cultivation-meridian__stages">
                    {phaseSteps.map((step, index) => {
                      const isReached = index <= currentPhaseIndex;
                      const isCurrent = index === currentPhaseIndex;
                      const phaseProgress = Math.max(
                        0,
                        Math.min(
                          100,
                          Math.round(
                            (overallCultivationProgress - index * (100 / 3)) * 3,
                          ),
                        ),
                      );

                      return (
                        <div
                          key={step.id}
                          className={`cultivation-meridian__stage cultivation-meridian__stage--${index + 1} ${isReached ? 'is-reached' : 'is-locked'} ${isCurrent ? 'is-current' : ''}`}
                          style={
                            {
                              '--stage-position': `${index * (100 / 3)}%`,
                            } as CSSProperties
                          }
                        >
                          <span className="cultivation-meridian__node" aria-hidden="true">
                            <i />
                          </span>

                          <span className="cultivation-meridian__copy">
                            <strong>{step.label}</strong>
                            <small className="cultivation-meridian__status">
                              {index < currentPhaseIndex
                                ? 'Đã viên mãn'
                                : isCurrent
                                  ? `Đang tu luyện ${phaseProgress}%`
                                  : 'Chưa khai mở'}
                            </small>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="cultivation-progress__footer cultivation-progress__footer--right">
                  <span className="cultivation-progress__phase-context">
                    Đang ở giai đoạn {realm.phaseName}
                  </span>
                  <strong>
                    {realm.currentXp >= realm.stageEndXp
                      ? 'Viên mãn · Chờ đột phá'
                      : `Còn ${formatCompactNumber(Math.max(0, realm.stageEndXp - realm.currentXp))} Tu vi`}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="author-stat-grid">
          <div><FileArchive size={18} /><strong>{formatCompactNumber(stats.publishedModCount)}</strong><span>Mod đã đăng</span></div>
          <div><Download size={18} /><strong>{formatCompactNumber(stats.totalDownloads)}</strong><span>Lượt tải</span></div>
          <div><Star size={18} /><strong>{stats.averageRating.toFixed(1)}</strong><span>Điểm luận đạo</span></div>
          <div><UsersRound size={18} /><strong>{formatCompactNumber(stats.totalReviews)}</strong><span>Luận đạo</span></div>
          <div><MessageCircle size={18} /><strong>{formatCompactNumber(stats.totalComments)}</strong><span>Luận bàn</span></div>
        </div>

        <div className="author-content-grid">
          <aside className="author-sidebar">
            <section className="author-panel">
              <div className="author-panel__heading">
                <Sparkles size={17} />
                <div>
                  <h2>Thân phận</h2>
                </div>
              </div>

              <div
                className={`identity-summary identity-summary--${avatarRank.slug}`}
                style={getAvatarRankStyle(avatarRank)}
              >
                <span className="identity-summary__crest identity-summary__crest--asset">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarRank.icon.asset.src}
                    alt={`Ấn ký ${avatarRank.displayName}`}
                  />
                </span>

                <div className="identity-summary__content">
                  <small>Thân phận hiện tại</small>
                  <strong>{avatarRank.displayName}</strong>
                  <span>{realm.name} · {realm.phaseName}</span>
                </div>
              </div>
            </section>

            <section className="author-panel">
              <div className="author-panel__heading">
                <Globe2 size={17} />
                <div>
                  <h2>Liên kết công khai</h2>
                  <p>Kênh chính thức của tác giả.</p>
                </div>
              </div>

              <div className="author-socials">
                {socialLinks.map(({ href, label, icon: Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer">
                    <Icon size={15} /><span>{label}</span><ExternalLink size={12} />
                  </a>
                ))}

                {discord && (
                  <span className="author-discord">
                    <MessageCircle size={15} />
                    Discord: {discord}
                  </span>
                )}

                {socialLinks.length === 0 && !discord && (
                  <p className="author-muted">Tác giả chưa thêm liên kết công khai.</p>
                )}
              </div>
            </section>
          </aside>

          <section className="author-mods">
            <header>
              <div>
                <p className="iv2-kicker">{isPublicProfile ? 'Đạo tịch tác giả' : 'Kho tác phẩm'}</p>
                <h2>{isPublicProfile ? 'Dấu ấn trong cộng đồng' : 'Mod của tác giả'}</h2>
              </div>

              {isOwner && (user.role === 'MODDER' || user.role === 'ADMIN') && (
                <Link href="/admin/upload" className="iv2-submit">
                  Đăng mod mới
                </Link>
              )}
            </header>

            {isPublicProfile ? (
              <AuthorProfileTabs
                works={mods}
                worksCount={stats.publishedModCount}
                about={
                  <div className="author-about-panel">
                    <div>
                      <span>Danh xưng</span>
                      <strong>{displayName}</strong>
                    </div>
                    <div>
                      <span>Thân phận</span>
                      <strong>{avatarRank.displayName}</strong>
                    </div>
                    <div>
                      <span>Cảnh giới</span>
                      <strong>{realm.name} · {realm.phaseName}</strong>
                    </div>
                    <div className="author-about-panel__bio">
                      <span>Tiểu sử</span>
                      <p>{profile?.bio?.trim() || 'Tác giả chưa cập nhật phần giới thiệu cá nhân.'}</p>
                    </div>
                  </div>
                }
              />
            ) : (
              mods
            )}
          </section>
        </div>
      </section>
    </main>
  );
}