'use client';

import { useState } from 'react';
import RichTextComposer from './RichTextComposer';

type Props = {
  name: string;
  initialValue?: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
};

export default function RichTextField({
  name,
  initialValue = '',
  label,
  placeholder,
  rows = 6,
  maxLength = 12_000,
  required = false,
}: Props) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="grid gap-2">
      {label && (
        <label htmlFor={`rich-${name}`} className="text-sm font-bold text-slate-200">
          {label}
        </label>
      )}
      <RichTextComposer
        name={name}
        value={value}
        onChange={setValue}
        maxLength={maxLength}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
      />
    </div>
  );
}
