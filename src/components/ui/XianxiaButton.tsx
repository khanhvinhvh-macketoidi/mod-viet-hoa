import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'gold' | 'jade' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#caa665]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09110f] disabled:pointer-events-none disabled:opacity-50';
const variants: Record<Variant, string> = {
  gold:'border border-[#e4c987]/45 bg-gradient-to-b from-[#d9b76f] to-[#b58d4d] text-[#11140f] shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:brightness-110',
  jade:'border border-[#75b99e]/35 bg-gradient-to-b from-[#6cab91] to-[#477e6a] text-[#07100e] shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:brightness-110',
  outline:'border border-[#caa665]/35 bg-[#111d1a]/75 text-[#e4c987] hover:border-[#caa665]/65 hover:bg-[#caa665]/10',
  ghost:'border border-transparent bg-transparent text-[#b8c2bc] hover:bg-white/5 hover:text-[#f2eadc]',
  danger:'border border-[#d06d61]/35 bg-[#a84f46]/15 text-[#e99a92] hover:border-[#d06d61]/60 hover:bg-[#a84f46]/25',
};
const sizes: Record<Size, string> = { sm:'min-h-9 px-3 text-xs', md:'min-h-11 px-4 text-sm', lg:'min-h-12 px-5 text-base' };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode };
export function XianxiaButton({ variant='gold', size='md', icon, className='', children, ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{icon}{children}</button>;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href:string; variant?:Variant; size?:Size; icon?:ReactNode };
export function XianxiaButtonLink({ href, variant='gold', size='md', icon, className='', children, ...props }: LinkProps) {
  return <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{icon}{children}</Link>;
}
