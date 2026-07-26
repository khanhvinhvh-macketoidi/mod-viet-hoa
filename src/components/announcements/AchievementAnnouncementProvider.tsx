'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Award, Flame, Sparkles, Swords, X } from 'lucide-react';
import {
  compareAchievementAnnouncements,
  type AchievementAnnouncement,
} from '@/lib/achievement-announcements';

const numberFormatter = new Intl.NumberFormat('vi-VN');

export default function AchievementAnnouncementProvider() {
  const [queue, setQueue] = useState<AchievementAnnouncement[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const current = queue[0];

  const loadPending = useCallback(async () => {
    try {
      const response = await fetch('/api/me/achievement-announcements', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) return;

      const payload = await response.json();
      if (!Array.isArray(payload?.announcements)) return;

      setQueue((items) => {
        const knownIds = new Set(items.map((item) => item.id));
        const additions = payload.announcements.filter(
          (item: AchievementAnnouncement) => !knownIds.has(item.id),
        );

        if (additions.length === 0) return items;
        if (items.length === 0) {
          return [...additions].sort(compareAchievementAnnouncements);
        }

        const [active, ...pending] = items;
        return [
          active,
          ...[...pending, ...additions].sort(compareAchievementAnnouncements),
        ];
      });
    } catch {
      // Popup is a progressive enhancement; network failures stay silent.
    }
  }, []);

  useEffect(() => {
    void loadPending();

    const onFocus = () => void loadPending();
    const intervalId = window.setInterval(() => void loadPending(), 30_000);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadPending]);

  useEffect(() => {
    if (!current) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [current]);

  const closeCurrent = useCallback(async () => {
    if (!current || isClosing) return;
    setIsClosing(true);
    setCloseError('');

    try {
      const response = await fetch(
        `/api/me/achievement-announcements/${current.id}/seen`,
        {
          method: 'POST',
          credentials: 'same-origin',
        },
      );

      if (!response.ok) {
        throw new Error(`Không thể ghi nhận popup (${response.status}).`);
      }

      setQueue((items) => items.slice(1));
    } catch {
      setCloseError(
        'Chưa thể ghi nhận thông báo. Vui lòng kiểm tra kết nối và thử lại.',
      );
    } finally {
      setIsClosing(false);
    }
  }, [current, isClosing]);

  useEffect(() => {
    if (!current) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void closeCurrent();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeCurrent, current]);

  if (!current) return null;

  const isDemotion =
    current.type === 'CULTIVATION_REALM_DEMOTED' ||
    current.type === 'REPUTATION_TIER_DEMOTED';
  const style = isDemotion
    ? ({
        '--announcement-color': '#8f887c',
      } as CSSProperties)
    : current.current.color
      ? ({
          '--announcement-color': current.current.color,
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={`achievement-announcement ${
        isDemotion ? 'achievement-announcement--demotion' : ''
      }`}
      role="presentation"
    >
      <button
        type="button"
        className="achievement-announcement__backdrop"
        aria-label="Đóng thông báo"
        onClick={() => void closeCurrent()}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-announcement-title"
        className={`achievement-announcement__modal ${current.current.className ?? ''} ${
          isDemotion ? 'achievement-announcement__modal--demotion' : ''
        }`}
        style={style}
      >
        <div className="achievement-announcement__aura" aria-hidden="true" />
        <div className="achievement-announcement__runes" aria-hidden="true" />
        <button
          type="button"
          className="achievement-announcement__close"
          onClick={() => void closeCurrent()}
          aria-label="Đóng"
          disabled={isClosing}
        >
          <X size={19} />
        </button>

        <AnnouncementContent announcement={current} />

        {closeError && (
          <p className="achievement-announcement__error" role="alert">
            {closeError}
          </p>
        )}

        <button
          type="button"
          className="achievement-announcement__confirm"
          onClick={() => void closeCurrent()}
          disabled={isClosing}
        >
          {isClosing ? 'Đang ghi nhận...' : 'Đã rõ'}
        </button>

        {queue.length > 1 && (
          <small className="achievement-announcement__queue">
            Còn {numberFormatter.format(queue.length - 1)} thông báo
          </small>
        )}
      </section>
    </div>
  );
}

function AnnouncementContent({
  announcement,
}: {
  announcement: AchievementAnnouncement;
}) {
  if (announcement.type === 'CULTIVATION_REALM_PROMOTED') {
    return (
      <>
        <p className="achievement-announcement__kicker">
          <Swords size={16} /> Tu vi
        </p>
        <h2 id="achievement-announcement-title">
          Chúc mừng đạo hữu đã thành công phá cảnh
        </h2>
        <p className="achievement-announcement__label">Cảnh giới hiện tại</p>
        <div className="achievement-announcement__current">
          <Flame size={31} />
          <strong>{announcement.current.name}</strong>
          {announcement.current.subtitle && (
            <span>{announcement.current.subtitle}</span>
          )}
        </div>
      </>
    );
  }

  if (announcement.type === 'CULTIVATION_REALM_DEMOTED') {
    return (
      <>
        <p className="achievement-announcement__kicker">
          <Swords size={16} /> Tu vi suy giảm
        </p>
        <h2 id="achievement-announcement-title">
          Đạo hữu căn cơ chưa vững, tu vi đột nhiên thất thoát không ngừng
        </h2>
        <p className="achievement-announcement__label">
          Cảnh giới đã giảm đến
        </p>
        <div className="achievement-announcement__current achievement-announcement__current--somber">
          <Flame size={31} />
          <strong>{announcement.current.name}</strong>
          {announcement.current.subtitle && (
            <span>{announcement.current.subtitle}</span>
          )}
        </div>
      </>
    );
  }

  if (announcement.type === 'REPUTATION_TIER_PROMOTED') {
    return (
      <>
        <p className="achievement-announcement__kicker">
          <Award size={16} /> Danh vọng
        </p>
        <h2 id="achievement-announcement-title">
          Chúc mừng đạo hữu đã nhận được danh hiệu
        </h2>
        <div className="achievement-announcement__current achievement-announcement__current--title">
          <Sparkles size={29} />
          <strong>{announcement.current.name}</strong>
        </div>

        {announcement.previous && (
          <div
            className={`achievement-announcement__previous ${announcement.previous.className ?? ''}`}
            style={
              announcement.previous.color
                ? ({
                    '--previous-color': announcement.previous.color,
                  } as CSSProperties)
                : undefined
            }
          >
            <small>Danh hiệu trước đó</small>
            <strong>{announcement.previous.name}</strong>
            <span>đã mất hiệu lực</span>
          </div>
        )}
      </>
    );
  }

  if (announcement.type === 'REPUTATION_TIER_DEMOTED') {
    return (
      <>
        <p className="achievement-announcement__kicker">
          <Award size={16} /> Danh vọng suy giảm
        </p>
        <h2 id="achievement-announcement-title">
          Thiên địa có mắt, việc làm sai trái của đạo hữu đã bị phát giác
        </h2>

        {announcement.previous && (
          <>
            <p className="achievement-announcement__label">
              Đã mất đi danh hiệu
            </p>
            <div
              className={`achievement-announcement__current achievement-announcement__current--title achievement-announcement__current--vanishing ${announcement.previous.className ?? ''}`}
              style={
                announcement.previous.color
                  ? ({
                      '--announcement-color': announcement.previous.color,
                    } as CSSProperties)
                  : undefined
              }
            >
              <Sparkles size={29} />
              <strong>{announcement.previous.name}</strong>
            </div>
          </>
        )}

        <p className="achievement-announcement__label">
          Danh hiệu hiện tại:
        </p>
        <div className="achievement-announcement__current achievement-announcement__current--title achievement-announcement__current--somber">
          <Award size={29} />
          <strong>{announcement.current.name}</strong>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="achievement-announcement__kicker">
        <Sparkles size={16} /> Thân phận
      </p>
      <h2 id="achievement-announcement-title">
        Chúc mừng đạo hữu đã đạt được thân phận mới
      </h2>
      <div className="achievement-announcement__current achievement-announcement__current--identity">
        <div
          className="achievement-announcement__identity-stage"
          aria-label={`Thân phận mới: ${announcement.current.name}`}
        >
          <span
            className="achievement-announcement__spirit-thread achievement-announcement__spirit-thread--one"
            aria-hidden="true"
          />
          <span
            className="achievement-announcement__spirit-thread achievement-announcement__spirit-thread--two"
            aria-hidden="true"
          />
          <span
            className="achievement-announcement__spirit-thread achievement-announcement__spirit-thread--three"
            aria-hidden="true"
          />
          {announcement.current.assetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="achievement-announcement__identity-badge"
              src={announcement.current.assetUrl}
              alt={`Huy hiệu ${announcement.current.name}`}
            />
          ) : (
            <Award size={62} />
          )}
        </div>
      </div>
    </>
  );
}
