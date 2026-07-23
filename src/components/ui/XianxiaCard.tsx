import type { HTMLAttributes, ReactNode } from 'react';
type Props = HTMLAttributes<HTMLElement> & {
  children:ReactNode; as?:'article'|'section'|'div'; interactive?:boolean; ornament?:boolean; padding?:'none'|'sm'|'md'|'lg';
};
const pads={none:'',sm:'p-4',md:'p-5 sm:p-6',lg:'p-6 sm:p-8'};
export default function XianxiaCard({ children, as='article', interactive=false, ornament=false, padding='md', className='', ...props }:Props) {
  const Tag=as;
  return <Tag className={['xianxia-panel',interactive?'xianxia-card-hover':'',ornament?'xianxia-ornament-corner':'',pads[padding],className].join(' ')} {...props}>{children}</Tag>;
}
