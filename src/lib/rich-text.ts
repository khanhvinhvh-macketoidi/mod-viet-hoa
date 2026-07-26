export type RichTextNode =
  | { type: 'text'; value: string }
  | {
      type: 'tag';
      name: RichTextTagName;
      value?: string;
      children: RichTextNode[];
    };

export type RichTextTagName =
  | 'b'
  | 'i'
  | 'u'
  | 's'
  | 'code'
  | 'quote'
  | 'spoiler'
  | 'color'
  | 'size'
  | 'glow'
  | 'shadow'
  | 'rainbow'
  | 'pulse'
  | 'shake'
  | 'left'
  | 'center'
  | 'right'
  | 'justify'
  | 'ul'
  | 'ol'
  | 'li';

const TAG_ALIASES: Record<string, RichTextTagName> = {
  b: 'b',
  strong: 'b',
  i: 'i',
  em: 'i',
  u: 'u',
  s: 's',
  strike: 's',
  code: 'code',
  quote: 'quote',
  spoiler: 'spoiler',
  color: 'color',
  size: 'size',
  glow: 'glow',
  shadow: 'shadow',
  rainbow: 'rainbow',
  pulse: 'pulse',
  shake: 'shake',
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
};

const TOKEN_PATTERN =
  /(<\/?[a-zA-Z]+(?:=[^<>\s]+)?>|\[\/?[a-zA-Z]+(?:=[^\]\s]+)?\])/g;
const MAX_PARSE_LENGTH = 20_000;
const MAX_DEPTH = 16;

type StackFrame = {
  name?: RichTextTagName;
  value?: string;
  children: RichTextNode[];
  rawOpen?: string;
};

function parseToken(token: string): {
  closing: boolean;
  name: RichTextTagName;
  value?: string;
} | null {
  const inner = token.slice(1, -1).trim();
  const closing = inner.startsWith('/');
  const body = closing ? inner.slice(1) : inner;
  const [rawName, ...valueParts] = body.split('=');
  const name = TAG_ALIASES[rawName.toLowerCase()];

  if (!name) return null;

  return {
    closing,
    name,
    value: valueParts.length > 0
      ? valueParts.join('=').trim()
      : undefined,
  };
}

function appendText(frame: StackFrame, value: string): void {
  if (!value) return;

  const previous = frame.children[frame.children.length - 1];

  if (previous?.type === 'text') {
    previous.value += value;
  } else {
    frame.children.push({ type: 'text', value });
  }
}

export function parseRichText(input: string): RichTextNode[] {
  const source = String(input ?? '').slice(0, MAX_PARSE_LENGTH);
  const root: StackFrame = { children: [] };
  const stack: StackFrame[] = [root];
  let cursor = 0;

  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    const rawToken = match[0];
    appendText(stack[stack.length - 1], source.slice(cursor, index));
    cursor = index + rawToken.length;

    const parsed = parseToken(rawToken);

    if (!parsed) {
      appendText(stack[stack.length - 1], rawToken);
      continue;
    }

    if (!parsed.closing) {
      if (stack.length > MAX_DEPTH) {
        appendText(stack[stack.length - 1], rawToken);
        continue;
      }

      stack.push({
        name: parsed.name,
        value: parsed.value,
        children: [],
        rawOpen: rawToken,
      });
      continue;
    }

    const top = stack[stack.length - 1];

    if (stack.length === 1 || top.name !== parsed.name) {
      appendText(top, rawToken);
      continue;
    }

    stack.pop();
    stack[stack.length - 1].children.push({
      type: 'tag',
      name: top.name,
      value: top.value,
      children: top.children,
    });
  }

  appendText(stack[stack.length - 1], source.slice(cursor));

  while (stack.length > 1) {
    const unclosed = stack.pop()!;
    appendText(
      stack[stack.length - 1],
      `${unclosed.rawOpen ?? ''}${flattenRichText(unclosed.children)}`,
    );
  }

  return root.children;
}

export function flattenRichText(nodes: RichTextNode[]): string {
  return nodes
    .map((node) =>
      node.type === 'text'
        ? node.value
        : flattenRichText(node.children),
    )
    .join('');
}

export function richTextToPlainText(input: string): string {
  return flattenRichText(parseRichText(input));
}

export function safeRichTextColor(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(normalized)) {
    return normalized;
  }

  if (
    /^(?:amber|sky|cyan|emerald|rose|violet|slate|white)$/.test(
      normalized,
    )
  ) {
    const colors: Record<string, string> = {
      amber: '#fbbf24',
      sky: '#38bdf8',
      cyan: '#22d3ee',
      emerald: '#34d399',
      rose: '#fb7185',
      violet: '#a78bfa',
      slate: '#cbd5e1',
      white: '#ffffff',
    };
    return colors[normalized];
  }

  return undefined;
}

export function safeRichTextSize(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  const number = Number(value.replace(/(?:px|rem)$/i, ''));

  if (!Number.isFinite(number)) return undefined;

  if (/rem$/i.test(value)) {
    return `${Math.min(2, Math.max(0.75, number))}rem`;
  }

  return `${Math.min(32, Math.max(12, number))}px`;
}
