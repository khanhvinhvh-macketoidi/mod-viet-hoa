import type { CSSProperties, ReactNode } from 'react';

import MentionText from '@/components/comments/MentionText';
import {
  parseRichText,
  safeRichTextColor,
  safeRichTextSize,
  type RichTextNode,
} from '@/lib/rich-text';

type Props = {
  content: string;
  enableMentions?: boolean;
  className?: string;
};

function renderText(
  value: string,
  enableMentions: boolean,
  key: string,
): ReactNode {
  if (!enableMentions) return value;
  return <MentionText key={key} content={value} />;
}

function renderNodes(
  nodes: RichTextNode[],
  enableMentions: boolean,
  path = 'root',
): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${path}-${index}`;

    if (node.type === 'text') {
      return renderText(node.value, enableMentions, key);
    }

    const children = renderNodes(
      node.children,
      enableMentions,
      key,
    );

    switch (node.name) {
      case 'b':
        return <strong key={key}>{children}</strong>;
      case 'i':
        return <em key={key}>{children}</em>;
      case 'u':
        return <u key={key}>{children}</u>;
      case 's':
        return <s key={key}>{children}</s>;
      case 'code':
        return (
          <code key={key} className="mvh-rich-code">
            {children}
          </code>
        );
      case 'quote':
        return (
          <blockquote key={key} className="mvh-rich-quote">
            {children}
          </blockquote>
        );
      case 'spoiler':
        return (
          <span key={key} className="mvh-rich-spoiler" tabIndex={0}>
            {children}
          </span>
        );
      case 'color': {
        const color = safeRichTextColor(node.value);
        return (
          <span key={key} style={color ? { color } : undefined}>
            {children}
          </span>
        );
      }
      case 'size': {
        const fontSize = safeRichTextSize(node.value);
        return (
          <span key={key} style={fontSize ? { fontSize } : undefined}>
            {children}
          </span>
        );
      }
      case 'glow': {
        const color = safeRichTextColor(node.value) ?? '#38bdf8';
        const style: CSSProperties = {
          color,
          textShadow: `0 0 8px ${color}, 0 0 18px ${color}`,
        };
        return (
          <span key={key} style={style}>
            {children}
          </span>
        );
      }
      case 'shadow':
        return (
          <span key={key} className="mvh-rich-shadow">
            {children}
          </span>
        );
      case 'rainbow':
        return (
          <span key={key} className="mvh-rich-rainbow">
            {children}
          </span>
        );
      case 'pulse':
        return (
          <span key={key} className="mvh-rich-pulse">
            {children}
          </span>
        );
      case 'shake':
        return (
          <span key={key} className="mvh-rich-shake">
            {children}
          </span>
        );
      case 'left':
        return (
          <div key={key} className="mvh-rich-align-left">
            {children}
          </div>
        );
      case 'center':
        return (
          <div key={key} className="mvh-rich-align-center">
            {children}
          </div>
        );
      case 'right':
        return (
          <div key={key} className="mvh-rich-align-right">
            {children}
          </div>
        );
      case 'justify':
        return (
          <div key={key} className="mvh-rich-align-justify">
            {children}
          </div>
        );
      case 'ul':
        return (
          <ul key={key} className="mvh-rich-list mvh-rich-list-unordered">
            {children}
          </ul>
        );
      case 'ol':
        return (
          <ol key={key} className="mvh-rich-list mvh-rich-list-ordered">
            {children}
          </ol>
        );
      case 'li':
        return <li key={key}>{children}</li>;
    }
  });
}

export default function RichTextRenderer({
  content,
  enableMentions = false,
  className = '',
}: Props) {
  return (
    <div className={`mvh-rich-text ${className}`.trim()}>
      {renderNodes(parseRichText(content), enableMentions)}
    </div>
  );
}
