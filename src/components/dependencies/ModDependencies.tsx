import Link from 'next/link';
import {
  CircleCheckBig,
  CircleDashed,
  ExternalLink,
  Puzzle,
} from 'lucide-react';
import type {
  ModDependency,
  ModItem,
} from '@/lib/types';

type Props = {
  dependencies: ModDependency[];
  modsById: Map<string, ModItem>;
};

export default function ModDependencies({
  dependencies,
  modsById,
}: Props) {
  if (dependencies.length === 0) {
    return null;
  }

  const required = dependencies.filter(
    (item) => item.type === 'REQUIRED',
  );
  const optional = dependencies.filter(
    (item) => item.type === 'OPTIONAL',
  );

  function renderItem(
    item: ModDependency,
  ) {
    const internalMod = item.dependencyModId
      ? modsById.get(item.dependencyModId)
      : undefined;

    const title =
      internalMod?.title ||
      item.externalName ||
      'Phụ thuộc không xác định';

    const href = internalMod
      ? `/mods/${internalMod.slug}`
      : item.externalUrl;

    return (
      <li
        key={item.id}
        className="rounded-xl border border-white/10 bg-slate-950/50 p-4"
      >
        <div className="flex items-start gap-3">
          <Puzzle className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />

          <div className="min-w-0 flex-1">
            {href ? (
              internalMod ? (
                <Link
                  href={href}
                  className="font-bold text-slate-100 hover:text-amber-200"
                >
                  {title}
                </Link>
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-slate-100 hover:text-amber-200"
                >
                  {title}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )
            ) : (
              <strong className="text-slate-100">
                {title}
              </strong>
            )}

            {item.note && (
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {item.note}
              </p>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">
        Mod phụ thuộc
      </h2>

      {required.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-300">
            <CircleCheckBig className="h-4 w-4" />
            Bắt buộc
          </h3>

          <ul className="mt-3 space-y-3">
            {required.map(renderItem)}
          </ul>
        </div>
      )}

      {optional.length > 0 && (
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            <CircleDashed className="h-4 w-4" />
            Tùy chọn
          </h3>

          <ul className="mt-3 space-y-3">
            {optional.map(renderItem)}
          </ul>
        </div>
      )}
    </section>
  );
}
