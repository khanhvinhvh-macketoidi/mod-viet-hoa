'use client';
import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
export default function ShareCollectionButton(){
  const [copied,setCopied]=useState(false);
  async function copyLink(){ await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(()=>setCopied(false),1600); }
  return <button type="button" onClick={()=>void copyLink()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-200 hover:bg-white/5">{copied?<Check className="h-4 w-4 text-emerald-300"/>:<Share2 className="h-4 w-4"/>}{copied?'Đã thu vào ngọc giản':'Chia sẻ'}</button>;
}
