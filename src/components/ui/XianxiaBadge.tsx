import type { ReactNode } from 'react';
type Props = { children:ReactNode; tone?:'gold'|'jade'|'cinnabar'|'sky'|'neutral'; icon?:ReactNode; className?:string };
const tones = {
  gold:'border-[#caa665]/35 bg-[#caa665]/12 text-[#e4c987]',
  jade:'border-[#75b99e]/30 bg-[#5a9c83]/12 text-[#9fd6c1]',
  cinnabar:'border-[#d06d61]/30 bg-[#a84f46]/14 text-[#e99a92]',
  sky:'border-[#7196a8]/30 bg-[#7196a8]/12 text-[#a9c4d1]',
  neutral:'border-white/10 bg-white/5 text-[#b8c2bc]',
};
export default function XianxiaBadge({ children, tone='neutral', icon, className='' }:Props) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${tones[tone]} ${className}`}>{icon}{children}</span>;
}
