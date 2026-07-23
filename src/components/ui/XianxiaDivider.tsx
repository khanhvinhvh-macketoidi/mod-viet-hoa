export default function XianxiaDivider({ className='' }:{ className?:string }) {
  return <div className={`xianxia-divider ${className}`} aria-hidden="true"><span>◆</span></div>;
}
