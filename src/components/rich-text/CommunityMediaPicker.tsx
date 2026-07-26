'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon, SmilePlus, Sparkles, X } from 'lucide-react';

import {
  DEFAULT_COMMUNITY_MEDIA_ASSETS,
  getCommunityMediaAsset,
  loadCommunityMediaAssets,
  type CommunityMediaAsset,
  type CommunityMediaKind,
} from '@/lib/community-media';

type Props = {
  value?: string;
  onChange: (value: string) => void;
};

export default function CommunityMediaPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CommunityMediaKind>('ICON');
  const [assets, setAssets] = useState<readonly CommunityMediaAsset[]>(
    DEFAULT_COMMUNITY_MEDIA_ASSETS,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void loadCommunityMediaAssets().then((nextAssets) => {
      if (!active) return;
      setAssets(nextAssets);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const selected = getCommunityMediaAsset(value, assets);
  const filteredAssets = useMemo(
    () => assets.filter((asset) => asset.kind === tab),
    [assets, tab],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
      >
        <SmilePlus className="h-4 w-4 text-violet-300" />
        Sticker / GIF
      </button>

      {selected && (
        <div className="mt-3 flex max-w-xs items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.src}
            alt={selected.label}
            className="h-16 w-20 rounded-lg bg-slate-950/70 object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-200">
              {selected.label}
            </p>
            <p className="text-xs text-slate-500">
              {selected.kind === 'GIF' ? 'Ảnh động' : 'Icon tĩnh'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-red-300"
            aria-label="Bỏ media"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[min(92vw,520px)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/50">
          <div className="flex gap-2 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setTab('ICON')}
              className={tab === 'ICON'
                ? 'inline-flex items-center gap-2 rounded-xl bg-sky-400/15 px-3 py-2 text-xs font-bold text-sky-200'
                : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5'}
            >
              <ImageIcon className="h-4 w-4" />
              Icon tĩnh
            </button>
            <button
              type="button"
              onClick={() => setTab('GIF')}
              className={tab === 'GIF'
                ? 'inline-flex items-center gap-2 rounded-xl bg-violet-400/15 px-3 py-2 text-xs font-bold text-violet-200'
                : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5'}
            >
              <Sparkles className="h-4 w-4" />
              GIF động
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-slate-500">
              Đang tải thư viện media...
            </p>
          ) : filteredAssets.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              Chưa có media trong nhóm này.
            </p>
          ) : (
            <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onChange(asset.id);
                    setOpen(false);
                  }}
                  className="rounded-xl border border-white/10 bg-slate-900/70 p-2 text-left transition hover:border-violet-400/35 hover:bg-violet-400/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.src}
                    alt={asset.label}
                    className="h-16 w-full rounded-lg object-contain"
                  />
                  <span className="mt-2 block truncate text-center text-[11px] font-semibold text-slate-300">
                    {asset.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-5 text-slate-500">
            Quản lý danh sách tại <code>public/community-media/library.json</code>.
          </p>
        </div>
      )}
    </div>
  );
}
