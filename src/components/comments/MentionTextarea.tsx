'use client';

import {
  KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from 'react';

export type MentionCandidate = {
  id: string;
  label: string;
  username: string;
  profileSlug?: string;
};

type Props = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  candidates: MentionCandidate[];
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

type MentionContext = {
  start: number;
  end: number;
  query: string;
};

function findMentionContext(
  value: string,
  caret: number,
): MentionContext | null {
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(
    /(?:^|\s)@([A-Za-zÀ-ỹ0-9_.-]*)$/,
  );

  if (!match) {
    return null;
  }

  const query = match[1] ?? '';
  const atOffset =
    beforeCaret.length - query.length - 1;

  return {
    start: atOffset,
    end: caret,
    query,
  };
}

export default function MentionTextarea({
  name,
  value,
  onChange,
  candidates,
  maxLength = 1000,
  rows = 3,
  placeholder,
  autoFocus,
  className,
}: Props) {
  const textareaRef =
    useRef<HTMLTextAreaElement>(null);
  const [context, setContext] =
    useState<MentionContext | null>(null);
  const [activeIndex, setActiveIndex] =
    useState(0);

  const suggestions = useMemo(() => {
    if (!context) {
      return [];
    }

    const query =
      context.query.toLocaleLowerCase('vi');

    return candidates
      .filter((candidate) => {
        const label =
          candidate.label.toLocaleLowerCase('vi');
        const username =
          candidate.username.toLocaleLowerCase('vi');

        return (
          label.includes(query) ||
          username.includes(query)
        );
      })
      .slice(0, 6);
  }, [candidates, context]);

  function refreshContext(
    nextValue: string,
    caret: number,
  ) {
    const nextContext = findMentionContext(
      nextValue,
      caret,
    );

    setContext(nextContext);
    setActiveIndex(0);
  }

  function insertMention(
    candidate: MentionCandidate,
  ) {
    if (!context) {
      return;
    }

    const mentionName =
      candidate.profileSlug ||
      candidate.username;

    const nextValue =
      value.slice(0, context.start) +
      `@${mentionName} ` +
      value.slice(context.end);

    const nextCaret =
      context.start + mentionName.length + 2;

    onChange(nextValue);
    setContext(null);

    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(
        nextCaret,
        nextCaret,
      );
    });
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(
          suggestions.length - 1,
          current + 1,
        ),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.max(0, current - 1),
      );
      return;
    }

    if (
      event.key === 'Enter' ||
      event.key === 'Tab'
    ) {
      event.preventDefault();
      insertMention(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setContext(null);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;

          onChange(nextValue);
          refreshContext(
            nextValue,
            event.target.selectionStart,
          );
        }}
        onClick={(event) => {
          refreshContext(
            value,
            event.currentTarget.selectionStart,
          );
        }}
        onKeyUp={(event) => {
          if (
            ![
              'ArrowDown',
              'ArrowUp',
              'Enter',
              'Tab',
              'Escape',
            ].includes(event.key)
          ) {
            refreshContext(
              value,
              event.currentTarget.selectionStart,
            );
          }
        }}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        rows={rows}
        required
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={className}
      />

      {context && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
          {suggestions.map(
            (candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                onMouseEnter={() => {
                  setActiveIndex(index);
                }}
                onMouseMove={() => {
                  if (activeIndex !== index) {
                    setActiveIndex(index);
                  }
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(candidate);
                }}
                className={
                  index === activeIndex
                    ? 'flex w-full items-center justify-between gap-3 bg-sky-400/10 px-4 py-3 text-left'
                    : 'flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5'
                }
              >
                <span>
                  <strong className="block text-sm text-slate-100">
                    {candidate.label}
                  </strong>
                  <span className="text-xs text-slate-500">
                    @{candidate.profileSlug ||
                      candidate.username}
                  </span>
                </span>

                <span className="text-xs text-sky-300">
                  Enter
                </span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
