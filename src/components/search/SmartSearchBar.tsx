'use client';

import Link from 'next/link';
import {
  Search,
  Tag,
  X,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  id: string;
  title: string;
  slug: string;
  game: string;
  category: string;
  tags: string[];
};

export default function SmartSearchBar({
  initialQuery = '',
}: {
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] =
    useState(initialQuery);
  const [suggestions, setSuggestions] =
    useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] =
    useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      return;
    }

    const timeout = window.setTimeout(
      async () => {
        const currentRequest =
          requestId.current + 1;
        requestId.current = currentRequest;

        try {
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(
              trimmed,
            )}`,
          );

          const data = (await response.json()) as {
            results?: Suggestion[];
          };

          if (
            currentRequest !==
            requestId.current
          ) {
            return;
          }

          setSuggestions(
            data.results ?? [],
          );
          setActiveIndex(0);
          setOpen(true);
        } catch {
          setSuggestions([]);
        }
      },
      260,
    );

    return () =>
      window.clearTimeout(timeout);
  }, [query]);

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const trimmed = query.trim();

    router.push(
      trimmed
        ? `/mods?q=${encodeURIComponent(
            trimmed,
          )}`
        : '/mods',
    );
    setOpen(false);
  }

  return (
    <form
      onSubmit={submit}
      className="relative"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-500"
        />

        <input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);

            if (nextQuery.trim().length < 2) {
              requestId.current += 1;
              setSuggestions([]);
              setOpen(false);
              setActiveIndex(0);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (!open || suggestions.length === 0) {
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((value) =>
                Math.min(
                  suggestions.length - 1,
                  value + 1,
                ),
              );
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((value) =>
                Math.max(0, value - 1),
              );
            }

            if (event.key === 'Enter') {
              const selected =
                suggestions[activeIndex];

              if (selected) {
                event.preventDefault();
                router.push(
                  `/mods/${selected.slug}`,
                );
                setOpen(false);
              }
            }

            if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Tìm mod, game, tác giả, tag..."
          className="library-search-input block w-full rounded-2xl border border-white/10 bg-slate-950/80 py-4 pr-12 text-slate-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none focus:ring-0"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setOpen(false);
            }}
            aria-label="Xóa từ khóa tìm kiếm"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <style jsx>{`
          .library-search-input {
            margin: 0 !important;
            padding-left: 3.25rem !important;
          }
        `}</style>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
          {suggestions.length > 0 ? (
            <>
              {suggestions.map(
                (item, index) => (
                  <Link
                    key={item.id}
                    href={`/mods/${item.slug}`}
                    onMouseEnter={() =>
                      setActiveIndex(index)
                    }
                    className={
                      index === activeIndex
                        ? 'block bg-amber-400/10 px-4 py-3'
                        : 'block px-4 py-3 hover:bg-white/5'
                    }
                  >
                    <strong className="block text-sm text-slate-100">
                      {item.title}
                    </strong>

                    <span className="mt-1 block text-xs text-slate-500">
                      {item.game} ·{' '}
                      {item.category}
                    </span>

                    {item.tags.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags
                          .slice(0, 3)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-400"
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                      </span>
                    )}
                  </Link>
                ),
              )}

              <button
                type="submit"
                className="w-full border-t border-white/10 px-4 py-3 text-left text-sm font-semibold text-amber-300 hover:bg-white/5"
              >
                Xem tất cả kết quả cho “{query}”
              </button>
            </>
          ) : (
            <div className="px-4 py-5 text-sm text-slate-500">
              Thiên cơ chưa hiển lộ gợi ý phù hợp.
            </div>
          )}
        </div>
      )}
    </form>
  );
}
