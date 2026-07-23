'use client';

import {
  ChevronLeft,
  ChevronRight,
  Expand,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

type Props = {
  coverUrl: string;
  galleryUrls: string[];
  modTitle: string;
  game: string;
  category: string;
  accessLabel: string;
  accessIcon: string;
  coverPositionX?: number;
  coverPositionY?: number;
};

export default function ModMediaShowcase({
  coverUrl,
  galleryUrls,
  modTitle,
  game,
  category,
  accessLabel,
  accessIcon,
  coverPositionX = 50,
  coverPositionY = 50,
}: Props) {
  const media = useMemo(
    () =>
      [coverUrl, ...galleryUrls].filter(
        (
          value,
          index,
          array,
        ): value is string =>
          Boolean(value) &&
          array.indexOf(value) === index,
      ),
    [coverUrl, galleryUrls],
  );

  const hasGallery = media.length > 1;
  const [activeIndex, setActiveIndex] =
    useState(0);
  const [fullscreen, setFullscreen] =
    useState(false);

  useEffect(() => {
    if (!fullscreen) return;

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === 'Escape') {
        setFullscreen(false);
      }

      if (event.key === 'ArrowRight') {
        goNext();
      }

      if (event.key === 'ArrowLeft') {
        goPrevious();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  });

  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(0, media.length - 1),
  );

  const activeUrl =
    media[safeActiveIndex] ?? coverUrl;

  const objectPosition =
    safeActiveIndex === 0
      ? `${coverPositionX}% ${coverPositionY}%`
      : '50% 50%';

  const mediaHeightClass =
    'h-[360px] sm:h-[420px] lg:h-[500px] xl:h-[540px]';

  function goPrevious() {
    setActiveIndex((current) =>
      current === 0
        ? media.length - 1
        : current - 1,
    );
  }

  function goNext() {
    setActiveIndex((current) =>
      current === media.length - 1
        ? 0
        : current + 1,
    );
  }

  return (
    <>
      <div
        className={
          hasGallery
            ? 'grid w-full gap-3 lg:grid-cols-[minmax(0,1fr)_190px]'
            : 'w-full'
        }
      >
        <div
          className={`
            group relative w-full
            overflow-hidden rounded-2xl
            bg-slate-950
            ${mediaHeightClass}
          `}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt={`${modTitle} - ảnh ${
              safeActiveIndex + 1
            }`}
            className="
              h-full w-full object-cover
              transition duration-500
              group-hover:scale-[1.01]
            "
            style={{ objectPosition }}
          />

          <div
            className="
              pointer-events-none
              absolute inset-0
              bg-gradient-to-t
              from-slate-950/95
              via-slate-950/10
              to-black/10
            "
          />

          <button
            type="button"
            onClick={() =>
              setFullscreen(true)
            }
            className="
              absolute right-4 top-4
              rounded-full border
              border-white/10
              bg-black/60 p-2.5
              text-white backdrop-blur
              transition hover:bg-black/80
            "
            aria-label="Xem ảnh toàn màn hình"
          >
            <Expand className="h-4 w-4" />
          </button>

          {hasGallery && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  rounded-full border
                  border-white/20
                  bg-black/55 p-3
                  text-white backdrop-blur
                  transition
                  hover:scale-105
                  hover:bg-black/75
                "
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={goNext}
                className="
                  absolute right-4 top-1/2
                  -translate-y-1/2
                  rounded-full border
                  border-white/20
                  bg-black/55 p-3
                  text-white backdrop-blur
                  transition
                  hover:scale-105
                  hover:bg-black/75
                "
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div
            className="
              absolute bottom-4
              left-4 right-4
              sm:bottom-5
              sm:left-5 sm:right-5
            "
          >
            <h1
              className="
                max-w-4xl text-2xl
                font-black leading-tight
                text-white drop-shadow-lg
                sm:text-3xl lg:text-4xl
              "
            >
              {modTitle}
            </h1>

            <div
              className="
                mt-3 flex items-end
                justify-between gap-4
              "
            >
              <div className="flex flex-wrap gap-2">
                <span
                  className="
                    rounded-full border
                    border-amber-300/20
                    bg-amber-400/20
                    px-3 py-1 text-xs
                    font-bold text-amber-100
                    backdrop-blur-md
                  "
                >
                  🎮 {game}
                </span>

                <span
                  className="
                    rounded-full border
                    border-sky-300/20
                    bg-sky-400/20
                    px-3 py-1 text-xs
                    font-bold text-sky-100
                    backdrop-blur-md
                  "
                >
                  {category}
                </span>

                <span
                  className="
                    rounded-full border
                    border-emerald-300/20
                    bg-emerald-400/20
                    px-3 py-1 text-xs
                    font-bold text-emerald-100
                    backdrop-blur-md
                  "
                >
                  {accessIcon} {accessLabel}
                </span>
              </div>

              <span
                className="
                  shrink-0 text-sm
                  font-bold text-white/90
                  drop-shadow-md
                "
              >
                {activeIndex + 1} / {media.length}
              </span>
            </div>
          </div>
        </div>

        {hasGallery && (
          <div
            className={`
              grid grid-cols-3 gap-3
              overflow-y-auto pr-1
              lg:grid-cols-1
              lg:auto-rows-max
              ${mediaHeightClass}
            `}
          >
            {media.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() =>
                  setActiveIndex(index)
                }
                className={
                  index === safeActiveIndex
                    ? `
                      relative aspect-video
                      overflow-hidden rounded-xl
                      border-2 border-amber-400
                      bg-slate-950
                    `
                    : `
                      relative aspect-video
                      overflow-hidden rounded-xl
                      border border-white/10
                      bg-slate-950 opacity-75
                      transition
                      hover:border-white/30
                      hover:opacity-100
                    `
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Ảnh thu nhỏ ${
                    index + 1
                  } của ${modTitle}`}
                  className="
                    h-full w-full
                    object-cover
                  "
                  style={{
                    objectPosition:
                      index === 0
                        ? `${coverPositionX}% ${coverPositionY}%`
                        : '50% 50%',
                  }}
                />

                <span
                  className="
                    absolute bottom-2 left-2
                    rounded-full bg-black/70
                    px-2 py-0.5
                    text-[10px]
                    font-semibold text-white
                  "
                >
                  {index === 0
                    ? 'Ảnh bìa'
                    : `Ảnh ${index + 1}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-center justify-center
            bg-black/95 p-4
          "
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh toàn màn hình"
          onClick={() =>
            setFullscreen(false)
          }
        >
          <button
            type="button"
            onClick={() =>
              setFullscreen(false)
            }
            className="
              absolute right-5 top-5
              rounded-full bg-white/10
              p-3 text-white
              hover:bg-white/20
            "
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          {hasGallery && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrevious();
                }}
                className="
                  absolute left-5 top-1/2
                  -translate-y-1/2
                  rounded-full bg-white/10
                  p-4 text-white
                  hover:bg-white/20
                "
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                className="
                  absolute right-5 top-1/2
                  -translate-y-1/2
                  rounded-full bg-white/10
                  p-4 text-white
                  hover:bg-white/20
                "
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt={`${modTitle} - toàn màn hình`}
            className="
              max-h-[92vh] max-w-[96vw]
              object-contain
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
    </>
  );
}
