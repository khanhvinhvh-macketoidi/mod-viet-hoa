'use client';

import {
  KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eye,
  EyeOff,
  Italic,
  List,
  ListOrdered,
  Palette,
  Quote,
  SlidersHorizontal,
  Sparkles,
  Strikethrough,
  Underline,
  WandSparkles,
} from 'lucide-react';

import type { MentionCandidate } from '@/components/comments/MentionTextarea';
import CommunityMediaPicker from './CommunityMediaPicker';
import RichTextRenderer from './RichTextRenderer';

type Props = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  mentionCandidates?: MentionCandidate[];
  allowMedia?: boolean;
  mediaAssetId?: string;
  onMediaAssetChange?: (value: string) => void;
};

type MentionContext = {
  start: number;
  end: number;
  query: string;
};

const EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤔', '😮', '😭', '😡',
  '👍', '👏', '🙏', '❤️', '🔥', '✨', '🎉', '🐛',
  '⚔️', '🗡️', '📜', '🎮', '✅', '❌', '💡', '🚀',
];

function findMentionContext(
  value: string,
  caret: number,
): MentionContext | null {
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(
    /(?:^|\s)@([A-Za-zÀ-ỹ0-9_.-]*)$/,
  );

  if (!match) return null;

  const query = match[1] ?? '';
  return {
    start: beforeCaret.length - query.length - 1,
    end: caret,
    query,
  };
}

export default function RichTextComposer({
  name,
  value,
  onChange,
  maxLength,
  rows = 5,
  required = false,
  autoFocus = false,
  placeholder,
  className = '',
  mentionCandidates = [],
  allowMedia = false,
  mediaAssetId = '',
  onMediaAssetChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [customColor, setCustomColor] = useState('#38bdf8');
  const [customSize, setCustomSize] = useState('18');
  const [mentionContext, setMentionContext] =
    useState<MentionContext | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  const suggestions = useMemo(() => {
    if (!mentionContext) return [];
    const query = mentionContext.query.toLocaleLowerCase('vi');

    return mentionCandidates
      .filter((candidate) => {
        const label = candidate.label.toLocaleLowerCase('vi');
        const username = candidate.username.toLocaleLowerCase('vi');
        return label.includes(query) || username.includes(query);
      })
      .slice(0, 6);
  }, [mentionCandidates, mentionContext]);

  function syncMentionContext(nextValue: string, caret: number): void {
    setMentionContext(findMentionContext(nextValue, caret));
    setActiveMentionIndex(0);
  }

  function replaceSelection(
    prefix: string,
    suffix = '',
    fallback = 'nội dung',
  ): void {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const insertion = `${prefix}${selected}${suffix}`;
    const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;

    if (nextValue.length > maxLength) return;

    onChange(nextValue);
    window.requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      const selectionStart = start + prefix.length;
      const selectionEnd = selectionStart + selected.length;
      target.focus();
      target.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function wrapSelectionAsList(ordered: boolean): void {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || 'Mục thứ nhất\nMục thứ hai';
    const lines = selected
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const tag = ordered ? 'ol' : 'ul';
    const listItems = (lines.length > 0 ? lines : ['Mục'])
      .map((line) => `[li]${line}[/li]`)
      .join('\n');
    const insertion = `[${tag}]\n${listItems}\n[/${tag}]`;
    const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;

    if (nextValue.length > maxLength) return;

    onChange(nextValue);
    window.requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      const firstItemStart = start + tag.length + 7;
      const firstItemEnd = firstItemStart + (lines[0]?.length ?? 3);
      target.setSelectionRange(firstItemStart, firstItemEnd);
    });
  }

  function insertAtCaret(text: string): void {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;

    if (nextValue.length > maxLength) return;

    onChange(nextValue);
    window.requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      const caret = start + text.length;
      target.focus();
      target.setSelectionRange(caret, caret);
    });
  }

  function insertMention(candidate: MentionCandidate): void {
    if (!mentionContext) return;
    const mentionName = candidate.profileSlug || candidate.username;
    const replacement = `@${mentionName} `;
    const nextValue =
      value.slice(0, mentionContext.start) +
      replacement +
      value.slice(mentionContext.end);

    if (nextValue.length > maxLength) return;

    const caret = mentionContext.start + replacement.length;
    onChange(nextValue);
    setMentionContext(null);
    window.requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(caret, caret);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveMentionIndex((current) =>
        Math.min(suggestions.length - 1, current + 1),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveMentionIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      insertMention(suggestions[activeMentionIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setMentionContext(null);
    }
  }

  const toolbarButton =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white';

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-2">
        <button type="button" className={toolbarButton} title="Đậm" onClick={() => replaceSelection('[b]', '[/b]')}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Nghiêng" onClick={() => replaceSelection('[i]', '[/i]')}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Gạch chân" onClick={() => replaceSelection('[u]', '[/u]')}>
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Gạch ngang" onClick={() => replaceSelection('[s]', '[/s]')}>
          <Strikethrough className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Mã" onClick={() => replaceSelection('[code]', '[/code]', 'code')}>
          <Code2 className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Trích dẫn" onClick={() => replaceSelection('[quote]', '[/quote]')}>
          <Quote className="h-4 w-4" />
        </button>
        <span className="mx-0.5 h-6 w-px bg-white/10" aria-hidden="true" />
        <button type="button" className={toolbarButton} title="Căn trái" onClick={() => replaceSelection('[left]', '[/left]')}>
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Căn giữa" onClick={() => replaceSelection('[center]', '[/center]')}>
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Căn phải" onClick={() => replaceSelection('[right]', '[/right]')}>
          <AlignRight className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Căn đều hai bên" onClick={() => replaceSelection('[justify]', '[/justify]')}>
          <AlignJustify className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Danh sách dấu đầu dòng" onClick={() => wrapSelectionAsList(false)}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Danh sách đánh số" onClick={() => wrapSelectionAsList(true)}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButton}
          title="Tùy chỉnh màu, cỡ chữ và hiệu ứng"
          onClick={() => setShowEffects((current) => !current)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Phát sáng nhanh" onClick={() => replaceSelection(`[glow=${customColor}]`, '[/glow]')}>
          <Sparkles className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Cầu vồng" onClick={() => replaceSelection('[rainbow]', '[/rainbow]')}>
          <WandSparkles className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButton}
          onClick={() => setShowEmoji((current) => !current)}
          title="Emoji"
        >
          😀
        </button>
        <button
          type="button"
          className={toolbarButton}
          onClick={() => setShowPreview((current) => !current)}
          title="Xem trước"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showEffects && (
        <div className="mt-2 rounded-xl border border-sky-400/15 bg-slate-950/95 p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Màu chữ và ánh sáng
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-slate-300">
                  <Palette className="h-4 w-4" />
                  <input
                    type="color"
                    value={customColor}
                    onChange={(event) => setCustomColor(event.target.value)}
                    className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0 shadow-none"
                    aria-label="Chọn màu chữ"
                  />
                  <code>{customColor}</code>
                </label>
                <button
                  type="button"
                  className={toolbarButton}
                  onClick={() => replaceSelection(`[color=${customColor}]`, '[/color]')}
                >
                  Áp dụng màu
                </button>
                <button
                  type="button"
                  className={toolbarButton}
                  onClick={() => replaceSelection(`[glow=${customColor}]`, '[/glow]')}
                >
                  Phát sáng
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cỡ chữ
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={customSize}
                  onChange={(event) => setCustomSize(event.target.value)}
                  className="w-auto min-w-28 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                  aria-label="Chọn cỡ chữ"
                >
                  <option value="12">12 px</option>
                  <option value="14">14 px</option>
                  <option value="16">16 px</option>
                  <option value="18">18 px</option>
                  <option value="20">20 px</option>
                  <option value="24">24 px</option>
                  <option value="28">28 px</option>
                  <option value="32">32 px</option>
                </select>
                <button
                  type="button"
                  className={toolbarButton}
                  onClick={() => replaceSelection(`[size=${customSize}]`, '[/size]')}
                >
                  Áp dụng cỡ
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={toolbarButton} onClick={() => replaceSelection('[shadow]', '[/shadow]')}>Đổ bóng</button>
            <button type="button" className={toolbarButton} onClick={() => replaceSelection('[rainbow]', '[/rainbow]')}>Cầu vồng</button>
            <button type="button" className={toolbarButton} onClick={() => replaceSelection('[pulse]', '[/pulse]')}>Nhịp sáng</button>
            <button type="button" className={toolbarButton} onClick={() => replaceSelection('[shake]', '[/shake]')}>Rung nhẹ</button>
            <button type="button" className={toolbarButton} onClick={() => replaceSelection('[spoiler]', '[/spoiler]')}>Ẩn spoiler</button>
          </div>
        </div>
      )}

      {showEmoji && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-slate-950 p-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertAtCaret(emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <textarea
          ref={textareaRef}
          id={`rich-${name}`}
          name={name}
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            syncMentionContext(nextValue, event.target.selectionStart);
          }}
          onClick={(event) =>
            syncMentionContext(value, event.currentTarget.selectionStart)
          }
          onKeyUp={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
              syncMentionContext(value, event.currentTarget.selectionStart);
            }
          }}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          rows={rows}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={className}
        />

        {mentionContext && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
            {suggestions.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                onMouseEnter={() => setActiveMentionIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(candidate);
                }}
                className={index === activeMentionIndex
                  ? 'flex w-full items-center justify-between gap-3 bg-sky-400/10 px-4 py-3 text-left'
                  : 'flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5'}
              >
                <span>
                  <strong className="block text-sm text-slate-100">{candidate.label}</strong>
                  <span className="text-xs text-slate-500">@{candidate.profileSlug || candidate.username}</span>
                </span>
                <span className="text-xs text-sky-300">Enter</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        Hỗ trợ cú pháp <code>&lt;b&gt;...&lt;/b&gt;</code>, <code>[b]...[/b]</code>, căn lề và danh sách <code>[ul]/[ol]/[li]</code>. Thẻ lạ sẽ được hiển thị như văn bản thường.
      </p>

      {showPreview && (
        <div className="mt-3 min-h-20 whitespace-pre-wrap break-words rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 leading-7 text-slate-200">
          {value.trim() ? (
            <RichTextRenderer content={value} enableMentions />
          ) : (
            <span className="text-slate-500">Chưa có nội dung để xem trước.</span>
          )}
        </div>
      )}

      {allowMedia && onMediaAssetChange && (
        <div className="mt-3">
          <input type="hidden" name="mediaAssetId" value={mediaAssetId} />
          <CommunityMediaPicker value={mediaAssetId} onChange={onMediaAssetChange} />
        </div>
      )}
    </div>
  );
}
