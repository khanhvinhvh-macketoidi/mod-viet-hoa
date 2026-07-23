'use client';

import {
  Plus,
  X,
} from 'lucide-react';
import {
  KeyboardEvent,
  useState,
} from 'react';

export default function TagEditor({
  initialTags,
}: {
  initialTags: string[];
}) {
  const [tags, setTags] =
    useState(initialTags);
  const [value, setValue] = useState('');

  function addTag() {
    const next = value.trim();

    if (
      !next ||
      tags.some(
        (tag) =>
          tag.toLocaleLowerCase('vi') ===
          next.toLocaleLowerCase('vi'),
      ) ||
      tags.length >= 12
    ) {
      return;
    }

    setTags((current) => [
      ...current,
      next,
    ]);
    setValue('');
  }

  function onKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === 'Enter' ||
      event.key === ','
    ) {
      event.preventDefault();
      addTag();
    }

    if (
      event.key === 'Backspace' &&
      !value &&
      tags.length > 0
    ) {
      setTags((current) =>
        current.slice(0, -1),
      );
    }
  }

  return (
    <div>
      {tags.map((tag) => (
        <input
          key={tag}
          type="hidden"
          name="tags"
          value={tag}
        />
      ))}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950 p-3">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-sm text-amber-200"
          >
            {tag}
            <button
              type="button"
              onClick={() =>
                setTags((current) =>
                  current.filter(
                    (item) => item !== tag,
                  ),
                )
              }
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        <div className="flex min-w-48 flex-1 items-center gap-2">
          <input
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            onKeyDown={onKeyDown}
            placeholder="Thêm tag..."
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-slate-100 outline-none"
          />

          <button
            type="button"
            onClick={addTag}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-amber-300"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Tối đa 12 tag. Nhấn Enter hoặc dấu phẩy để thêm.
      </p>
    </div>
  );
}
