'use client';

import {
  Check,
  FolderPlus,
  Search,
  X,
} from 'lucide-react';
import {
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

type ModOption = {
  id: string;
  title: string;
  slug: string;
  game: string;
  category: string;
  coverUrl: string;
  version: string;
};

type Props = {
  collectionId: string;
  collectionTitle: string;
  mods: ModOption[];
  initialModIds: string[];
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();
}

export default function CollectionManager({
  collectionId,
  collectionTitle,
  mods,
  initialModIds,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] =
    useState(new Set(initialModIds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const filteredMods = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return mods;
    }

    return mods.filter((mod) =>
      normalize(
        [
          mod.title,
          mod.game,
          mod.category,
          mod.version,
        ].join(' '),
      ).includes(normalizedQuery),
    );
  }, [mods, query]);

  function toggleMod(modId: string) {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }

      return next;
    });
  }

  function close() {
    if (saving) return;

    setSelected(new Set(initialModIds));
    setQuery('');
    setMessage('');
    setOpen(false);
  }

  async function save() {
    if (saving) return;

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(
        `/api/collections/${collectionId}/items/bulk`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modIds: [...selected],
          }),
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        addedCount?: number;
        removedCount?: number;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            'Không thể cập nhật Tàng Kinh Các.',
        );
      }

      setMessage(
        `Đã thêm ${data.addedCount ?? 0} và xóa ${
          data.removedCount ?? 0
        } mod.`,
      );

      router.refresh();

      window.setTimeout(() => {
        setOpen(false);
        setMessage('');
      }, 700);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật Tàng Kinh Các.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          inline-flex items-center gap-2
          rounded-xl bg-amber-400
          px-4 py-2 font-bold
          text-slate-950
          transition hover:bg-amber-300
        "
      >
        <FolderPlus className="h-4 w-4" />
        Thêm mod
      </button>

      {open && (
        <div
          className="
            fixed inset-0 z-[120]
            flex items-center justify-center
            bg-black/75 p-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Quản lý ${collectionTitle}`}
            className="
              flex max-h-[88vh] w-full
              max-w-4xl flex-col
              overflow-hidden rounded-3xl
              border border-white/10
              bg-slate-950
              shadow-2xl shadow-black/60
            "
          >
            <header
              className="
                flex items-start justify-between
                gap-4 border-b
                border-white/10 p-5
              "
            >
              <div>
                <p
                  className="
                    text-xs font-bold uppercase
                    tracking-wider text-amber-400
                  "
                >
                  Collection Manager
                </p>

                <h2
                  className="
                    mt-1 text-2xl
                    font-black text-slate-100
                  "
                >
                  {collectionTitle}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Chọn nhiều mod rồi lưu một lần.
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                className="
                  rounded-xl p-2
                  text-slate-500
                  transition hover:bg-white/5
                  hover:text-slate-200
                "
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="border-b border-white/10 p-4">
              <div
                className="
                  flex min-w-0 items-center gap-2
                  rounded-2xl border
                  border-white/10
                  bg-slate-900 px-4
                  focus-within:border-amber-400/40
                "
              >
                <span className="grid h-9 w-7 shrink-0 place-items-center text-slate-500">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </span>

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Tìm tên mod, game, danh mục..."
                  className="
                    min-w-0 flex-1
                    border-0 bg-transparent
                    py-3 pl-1 text-slate-100
                    outline-none ring-0
                  "
                />
              </div>

              <div
                className="
                  mt-3 flex flex-wrap
                  items-center justify-between
                  gap-3 text-sm
                "
              >
                <span className="text-slate-500">
                  Đã chọn{' '}
                  <strong className="text-amber-300">
                    {selected.size}
                  </strong>{' '}
                  / {mods.length} mod
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        new Set(
                          filteredMods.map(
                            (mod) => mod.id,
                          ),
                        ),
                      )
                    }
                    className="
                      rounded-lg border
                      border-white/10
                      px-3 py-1.5
                      text-xs font-semibold
                      text-slate-300
                    "
                  >
                    Chọn kết quả hiện tại
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelected(new Set())
                    }
                    className="
                      rounded-lg border
                      border-white/10
                      px-3 py-1.5
                      text-xs font-semibold
                      text-slate-300
                    "
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>
            </div>

            <div
              className="
                grid flex-1 gap-3
                overflow-y-auto p-4
                sm:grid-cols-2
              "
            >
              {filteredMods.map((mod) => {
                const active = selected.has(
                  mod.id,
                );

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() =>
                      toggleMod(mod.id)
                    }
                    className={
                      active
                        ? `
                          flex items-center gap-3
                          rounded-2xl border
                          border-amber-400/50
                          bg-amber-400/10 p-3
                          text-left
                        `
                        : `
                          flex items-center gap-3
                          rounded-2xl border
                          border-white/10
                          bg-slate-900/60 p-3
                          text-left transition
                          hover:border-white/20
                          hover:bg-slate-900
                        `
                    }
                  >
                    <div
                      className="
                        h-20 w-28 shrink-0
                        overflow-hidden rounded-xl
                        bg-slate-900
                      "
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mod.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <span className="min-w-0 flex-1">
                      <strong
                        className="
                          line-clamp-2 block
                          text-sm text-slate-100
                        "
                      >
                        {mod.title}
                      </strong>

                      <span
                        className="
                          mt-1 block truncate
                          text-xs text-slate-500
                        "
                      >
                        {mod.game} · {mod.category}
                      </span>

                      <span
                        className="
                          mt-1 block text-xs
                          text-slate-600
                        "
                      >
                        v{mod.version}
                      </span>
                    </span>

                    <span
                      className={
                        active
                          ? `
                            flex h-7 w-7
                            shrink-0 items-center
                            justify-center
                            rounded-full
                            bg-amber-400
                            text-slate-950
                          `
                          : `
                            h-7 w-7 shrink-0
                            rounded-full border
                            border-white/15
                          `
                      }
                    >
                      {active && (
                        <Check className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                );
              })}

              {filteredMods.length === 0 && (
                <div
                  className="
                    col-span-full py-14
                    text-center text-sm
                    text-slate-500
                  "
                >
                  Không tìm thấy bí tịch phù hợp.
                </div>
              )}
            </div>

            <footer
              className="
                flex flex-wrap items-center
                justify-between gap-3
                border-t border-white/10
                bg-slate-950 p-4
              "
            >
              <p
                className={
                  message.includes('Không')
                    ? 'text-sm text-red-300'
                    : 'text-sm text-emerald-300'
                }
              >
                {message}
              </p>

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="
                    rounded-xl border
                    border-white/10
                    px-4 py-2
                    font-semibold text-slate-300
                    disabled:opacity-50
                  "
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="
                    rounded-xl bg-amber-400
                    px-5 py-2 font-bold
                    text-slate-950
                    hover:bg-amber-300
                    disabled:opacity-50
                  "
                >
                  {saving
                    ? 'Đang lưu...'
                    : 'Lưu thay đổi'}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
