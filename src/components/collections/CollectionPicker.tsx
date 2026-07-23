'use client';

import {
  Check,
  FolderPlus,
  Plus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

type CollectionOption = {
  id: string;
  title: string;
  visibility: 'PUBLIC' | 'PRIVATE';
};

type Props = {
  modId: string;
  collections: CollectionOption[];
  initialCollectionIds: string[];
  isLoggedIn: boolean;
};

export default function CollectionPicker({
  modId,
  collections,
  initialCollectionIds,
  isLoggedIn,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] =
    useState(new Set(initialCollectionIds));
  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  async function toggleCollection(
    collectionId: string,
  ) {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const wasSelected = selected.has(collectionId);
    setSelected((current) => {
      const next = new Set(current);
      if (wasSelected) next.delete(collectionId);
      else next.add(collectionId);
      return next;
    });
    setLoadingId(collectionId);

    try {
      const response = await fetch(
        `/api/collections/${collectionId}/items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ modId }),
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        added?: boolean;
      };

      if (!response.ok || !data.ok) {
        setSelected((current) => {
          const next = new Set(current);
          if (wasSelected) next.add(collectionId);
          else next.delete(collectionId);
          return next;
        });
        return;
      }
      setSelected((current) => {
        const next = new Set(current);
        if (data.added) next.add(collectionId);
        else next.delete(collectionId);
        return next;
      });
    } catch {
      setSelected((current) => {
        const next = new Set(current);
        if (wasSelected) next.add(collectionId);
        else next.delete(collectionId);
        return next;
      });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-slate-300 hover:bg-white/10"
      >
        <FolderPlus className="h-5 w-5" />
        Thêm vào Tàng Kinh Các
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <strong className="text-sm text-slate-100">
              Tàng Kinh Các của đạo hữu
            </strong>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {collections.length > 0 ? (
            <div className="max-h-80 overflow-y-auto p-2">
              {collections.map((collection) => {
                const active = selected.has(
                  collection.id,
                );

                return (
                  <button
                    key={collection.id}
                    type="button"
                    disabled={
                      loadingId === collection.id
                    }
                    onClick={() =>
                      void toggleCollection(
                        collection.id,
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5 disabled:opacity-50"
                  >
                    <span>
                      <strong className="block text-sm text-slate-100">
                        {collection.title}
                      </strong>
                      <span className="text-xs text-slate-500">
                        {collection.visibility ===
                        'PUBLIC'
                          ? 'Công khai'
                          : 'Riêng tư'}
                      </span>
                    </span>

                    {active ? (
                      <Check className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Plus className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-sm text-slate-400">
              Đạo hữu chưa có Tàng Kinh Các nào.
            </div>
          )}

          <Link
            href={`/profile/collections/new?modId=${encodeURIComponent(modId)}&returnTo=${encodeURIComponent(pathname)}`}
            className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-semibold text-amber-300 hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            Tạo Tàng Kinh Các mới
          </Link>
        </div>
      )}
    </div>
  );
}
