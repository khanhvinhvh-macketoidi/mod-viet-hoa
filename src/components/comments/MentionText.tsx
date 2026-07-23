import Link from 'next/link';

type Props = {
  content: string;
};

const MENTION_PATTERN =
  /(^|\s)@([A-Za-zÀ-ỹ0-9_.-]{2,40})/g;

export default function MentionText({
  content,
}: Props) {
  const parts: Array<
    | { type: 'text'; value: string }
    | { type: 'mention'; value: string }
  > = [];

  let cursor = 0;

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    const prefix = match[1] ?? '';
    const username = match[2];

    const mentionStart = index + prefix.length;

    if (mentionStart > cursor) {
      parts.push({
        type: 'text',
        value: content.slice(cursor, mentionStart),
      });
    }

    parts.push({
      type: 'mention',
      value: username,
    });

    cursor = mentionStart + username.length + 1;
  }

  if (cursor < content.length) {
    parts.push({
      type: 'text',
      value: content.slice(cursor),
    });
  }

  return (
    <>
      {parts.map((part, index) =>
        part.type === 'mention' ? (
          <Link
            key={`${part.value}-${index}`}
            href={`/authors/${encodeURIComponent(
              part.value,
            )}`}
            className="font-semibold text-sky-300 hover:text-sky-200"
          >
            @{part.value}
          </Link>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </>
  );
}
