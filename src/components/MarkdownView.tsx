import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse markdown blocks
  const parseBlocks = (text: string) => {
    const blocks: Array<{ type: 'code' | 'text' | 'table'; language?: string; content: string }> = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: text.substring(lastIndex, match.index),
        });
      }
      blocks.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    return blocks;
  };

  const renderInlineFormatted = (line: string, keyPrefix: string) => {
    // Bold: **text**
    // Italic: *text*
    // Inline code: `text`
    // Links: [text](url)
    const parts: React.ReactNode[] = [];
    let current = line;
    let partIndex = 0;

    // Split by inline tokens
    const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/;

    while (current.length > 0) {
      const match = current.match(inlineRegex);
      if (!match || match.index === undefined) {
        parts.push(current);
        break;
      }

      if (match.index > 0) {
        parts.push(current.substring(0, match.index));
      }

      const token = match[0];
      const partKey = `${keyPrefix}-${partIndex++}`;

      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={partKey} className="font-semibold text-zinc-100">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={partKey} className="italic text-zinc-200">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={partKey}
            className="px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-teal-300 font-mono border border-zinc-700/60"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
        const titleMatch = token.match(/\[(.*?)\]/);
        const urlMatch = token.match(/\((.*?)\)/);
        const linkTitle = titleMatch ? titleMatch[1] : 'Link';
        const linkUrl = urlMatch ? urlMatch[1] : '#';
        parts.push(
          <a
            key={partKey}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-400 hover:text-teal-300 underline underline-offset-2 break-all"
          >
            {linkTitle}
          </a>
        );
      } else {
        parts.push(token);
      }

      current = current.substring(match.index + token.length);
    }

    return parts;
  };

  const renderTextBlock = (text: string, blockIdx: number) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];
    let isOrderedList = false;

    const flushList = () => {
      if (inList) {
        if (isOrderedList) {
          elements.push(
            <ol key={`ol-${elements.length}`} className="list-decimal pl-6 space-y-1 my-2 text-zinc-200">
              {listItems}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-1 my-2 text-zinc-200">
              {listItems}
            </ul>
          );
        }
        inList = false;
        listItems = [];
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      const lineKey = `b${blockIdx}-l${lineIdx}`;

      if (!trimmed) {
        flushList();
        elements.push(<div key={lineKey} className="h-2" />);
        return;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={lineKey} className="text-base font-semibold text-zinc-100 mt-4 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-teal-500 rounded-sm inline-block"></span>
            {renderInlineFormatted(trimmed.slice(4), lineKey)}
          </h3>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={lineKey} className="text-lg font-bold text-white mt-5 mb-2 pb-1 border-b border-zinc-800">
            {renderInlineFormatted(trimmed.slice(3), lineKey)}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={lineKey} className="text-xl font-extrabold text-white mt-6 mb-3">
            {renderInlineFormatted(trimmed.slice(2), lineKey)}
          </h1>
        );
      }
      // Unordered list: - or *
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList || isOrderedList) {
          flushList();
          inList = true;
          isOrderedList = false;
        }
        listItems.push(
          <li key={lineKey} className="leading-relaxed">
            {renderInlineFormatted(trimmed.slice(2), lineKey)}
          </li>
        );
      }
      // Ordered list: 1. or 2.
      else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || !isOrderedList) {
          flushList();
          inList = true;
          isOrderedList = true;
        }
        const itemContent = trimmed.replace(/^\d+\.\s/, '');
        listItems.push(
          <li key={lineKey} className="leading-relaxed">
            {renderInlineFormatted(itemContent, lineKey)}
          </li>
        );
      }
      // Blockquote: >
      else if (trimmed.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote
            key={lineKey}
            className="pl-4 py-1.5 my-2 border-l-2 border-teal-500 bg-teal-950/20 text-zinc-300 italic rounded-r text-sm"
          >
            {renderInlineFormatted(trimmed.slice(2), lineKey)}
          </blockquote>
        );
      }
      // Regular paragraph
      else {
        flushList();
        elements.push(
          <p key={lineKey} className="leading-relaxed text-zinc-200 my-1 text-sm md:text-base">
            {renderInlineFormatted(line, lineKey)}
          </p>
        );
      }
    });

    flushList();
    return <div key={`block-${blockIdx}`}>{elements}</div>;
  };

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 font-sans text-sm md:text-base selection:bg-teal-500/30 selection:text-white">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <div
              key={`code-${idx}`}
              className="my-3 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
                <span className="font-mono text-zinc-300 uppercase tracking-wider font-medium text-[11px]">
                  {block.language || 'code'}
                </span>
                <button
                  onClick={() => handleCopyCode(block.content, idx)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-[11px]"
                  title="Copy code"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-xs md:text-sm font-mono text-emerald-300 bg-zinc-950/90 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700">
                <code>{block.content.trim()}</code>
              </pre>
            </div>
          );
        }

        return renderTextBlock(block.content, idx);
      })}
    </div>
  );
};
