'use client';

import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

type ModGalleryProps = {
  images: string[];
  modTitle: string;
};

export default function ModGallery({
  images,
  modTitle,
}: ModGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] =
    useState(false);

  const activeImage = images[activeIndex];

  function showPrevious(): void {
    setActiveIndex((current) =>
      current === 0
        ? images.length - 1
        : current - 1,
    );
  }

  function showNext(): void {
    setActiveIndex((current) =>
      current === images.length - 1
        ? 0
        : current + 1,
    );
  }

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      }

      if (event.key === 'ArrowLeft') {
        showPrevious();
      }

      if (event.key === 'ArrowRight') {
        showNext();
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  });

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <section
        className="
          rounded-2xl border border-white/10
          bg-slate-900 p-6
        "
      >
        <div
          className="
            flex items-center justify-between gap-4
          "
        >
          <div>
            <h2 className="text-xl font-bold">
              Hình ảnh preview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {images.length} ảnh minh họa
            </p>
          </div>

          <span
            className="
              rounded-full bg-white/5
              px-3 py-1 text-xs text-slate-400
            "
          >
            {activeIndex + 1}/{images.length}
          </span>
        </div>

        <div
          className="
            relative mt-5 aspect-video
            overflow-hidden rounded-2xl
            bg-slate-950
          "
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="h-full w-full cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage}
              alt={`${modTitle} - ảnh ${activeIndex + 1}`}
              className="h-full w-full object-contain"
            />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                className="
                  absolute left-3 top-1/2
                  -translate-y-1/2
                  rounded-full bg-black/70
                  p-2.5 text-white
                  backdrop-blur-sm
                  transition hover:bg-black/90
                "
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={showNext}
                className="
                  absolute right-3 top-1/2
                  -translate-y-1/2
                  rounded-full bg-black/70
                  p-2.5 text-white
                  backdrop-blur-sm
                  transition hover:bg-black/90
                "
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div
            className="
              mt-4 flex gap-3 overflow-x-auto
              pb-2
            "
          >
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`
                  h-20 w-32 shrink-0 overflow-hidden
                  rounded-xl border-2 bg-slate-950
                  transition
                  ${
                    activeIndex === index
                      ? 'border-amber-400'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }
                `}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={`Ảnh nhỏ ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {lightboxOpen && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-center justify-center
            bg-black/90 p-4
            backdrop-blur-sm
          "
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="
              absolute right-5 top-5
              rounded-full bg-white/10 p-3
              text-white transition
              hover:bg-white/20
            "
            aria-label="Đóng ảnh"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="
              relative flex h-full w-full
              max-w-7xl items-center justify-center
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage}
              alt={`${modTitle} - ảnh lớn`}
              className="
                max-h-full max-w-full
                object-contain
              "
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  className="
                    absolute left-2
                    rounded-full bg-black/60
                    p-3 text-white
                    transition hover:bg-black/90
                  "
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>

                <button
                  type="button"
                  onClick={showNext}
                  className="
                    absolute right-2
                    rounded-full bg-black/60
                    p-3 text-white
                    transition hover:bg-black/90
                  "
                  aria-label="Ảnh tiếp theo"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}