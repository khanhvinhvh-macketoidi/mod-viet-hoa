import type { LucideIcon } from 'lucide-react';

interface CreatorStatCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

export default function CreatorStatCard({
  label,
  value,
  helper,
  icon: Icon,
}: CreatorStatCardProps) {
  return (
    <article className="group rounded-3xl border border-white/10 bg-slate-900/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-amber-300/25 hover:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-white">{value}</p>
        </div>
        <span className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3 text-amber-300 transition group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500">{helper}</p>
    </article>
  );
}
