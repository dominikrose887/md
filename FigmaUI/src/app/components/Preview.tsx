import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { createKatexSanitizeSchema } from '../../utils/katexSanitizeSchema';
import { rehypeSourceOffsets } from '../../utils/rehypeSourceOffsets';
import {
  findElementForSourceOffset,
  readDataMdStart,
  sourceOffsetContentToPrepared,
  sourceOffsetPreparedToContent
} from '../../utils/sourceOffsetSync';
import type { FindOptions } from './Editor';

const KATEX_REHYPE_OPTIONS = { output: 'html' as const, throwOnError: false };

function resolveFenceLanguage(className?: string) {
  const match = /language-([\w#+-]+)/i.exec(className || '');
  if (!match) {
    return undefined;
  }
  const raw = match[1].toLowerCase();
  const aliases: Record<string, string> = {
    py: 'python',
    python3: 'python',
    js: 'javascript',
    ts: 'typescript',
    csharp: 'csharp',
    'c#': 'csharp',
    'c++': 'cpp',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml'
  };
  return aliases[raw] ?? raw;
}

function mdOffsetsFromProps(props: Record<string, unknown>): { start: number; end?: number } | null {
  const asNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  let start = asNum(props.dataMdStart);
  let end = asNum(props.dataMdEnd);
  const node = props.node as { position?: { start?: { offset?: number }; end?: { offset?: number } } } | undefined;
  if (start === null && node?.position?.start?.offset !== undefined) {
    start = node.position.start.offset;
  }
  if (end === null && node?.position?.end?.offset !== undefined) {
    end = node.position.end.offset;
  }
  if (start === null) {
    return null;
  }
  return { start, end: end ?? undefined };
}

function wrapFenceForSourceSync(inner: ReactNode, props: Record<string, unknown>) {
  const o = mdOffsetsFromProps(props);
  if (!o) {
    return inner;
  }
  return (
    <div data-md-start={o.start} data-md-end={o.end ?? o.start}>
      {inner}
    </div>
  );
}

function CodeBlockCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded border border-border/70 bg-background/95 px-2 py-1 text-xs text-foreground shadow-sm transition-colors hover:bg-accent"
      title={copied ? 'Copied' : 'Copy code'}
      aria-label={copied ? 'Code copied' : 'Copy code block'}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export interface PreviewHandle {
  scrollToSourceOffset: (offset: number) => void;
  scrollToSearchMatch: (index: number) => void;
  getScrollTop: () => number;
  setScrollTop: (value: number) => void;
}

export interface PreviewProps {
  content: string;
  theme: 'light' | 'dark';
  filePath?: string;
  resetScrollToken?: number;
  /** When true, outer scroll container gets id used for Electron printToPDF capture. */
  assignPdfPrintRootId?: boolean;
  /** Split view: clicking preview maps back to the raw editor by source offset. */
  splitPaneSync?: boolean;
  onSplitPanePreviewNavigate?: (sourceOffset: number) => void;
  findOpen?: boolean;
  searchQuery?: string;
  searchOptions?: FindOptions;
  currentMatchIndex?: number;
}

const PreviewInner = forwardRef<PreviewHandle, PreviewProps>(function PreviewInner(
  {
    content,
    theme,
    filePath,
    resetScrollToken,
    assignPdfPrintRootId,
    splitPaneSync,
    onSplitPanePreviewNavigate,
    findOpen = false,
    searchQuery = '',
    searchOptions,
    currentMatchIndex = -1
  },
  ref
) {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const highlightedMatchesRef = useRef<HTMLElement[]>([]);

  const sanitizeSchema = useMemo(() => {
    const base = createKatexSanitizeSchema();
    return {
      ...base,
      attributes: {
        ...base.attributes,
        a: [...(base.attributes?.a ?? []), 'id', 'name', 'target', 'rel']
      }
    };
  }, []);

  const normalizeSlash = (value: string) => value.replace(/\\/g, '/');

  const toFileUrl = (absolutePath: string) => {
    const normalized = normalizeSlash(absolutePath);
    return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
  };

  /** GitHub-style sanitize prefixes `id` / `name` (see hast-util-sanitize clobberPrefix). */
  const SANITIZE_ID_PREFIX = 'user-content-';

  const findElementForHashFragment = (root: HTMLElement, fragment: string): Element | null => {
    const decoded = decodeURIComponent(fragment).trim();
    if (!decoded) {
      return null;
    }
    const idsToTry = decoded.startsWith(SANITIZE_ID_PREFIX)
      ? [decoded]
      : [decoded, `${SANITIZE_ID_PREFIX}${decoded}`];

    for (const id of idsToTry) {
      try {
        const byId = root.querySelector(`#${window.CSS?.escape ? window.CSS.escape(id) : id}`);
        if (byId) {
          return byId;
        }
      } catch {
        /* invalid selector */
      }
    }

    const named = root.querySelectorAll('[name]');
    for (const id of idsToTry) {
      for (const el of named) {
        if (el.getAttribute('name') === id) {
          return el;
        }
      }
    }

    return null;
  };

  const resolveRelativePath = (baseFilePath: string, relativePath: string) => {
    const normalizedBase = normalizeSlash(baseFilePath);
    const baseDir = normalizedBase.slice(0, normalizedBase.lastIndexOf('/'));
    const baseParts = baseDir.split('/').filter(Boolean);
    const relativeParts = normalizeSlash(relativePath).split('/');
    const output = [...baseParts];
    for (const part of relativeParts) {
      if (!part || part === '.') {
        continue;
      }
      if (part === '..') {
        output.pop();
        continue;
      }
      output.push(part);
    }
    return output.join('/');
  };

  const resolveImageSrc = (src: string) => {
    if (!src || /^(https?:|data:|blob:|file:)/i.test(src)) {
      return src;
    }
    if (!filePath) {
      return src;
    }
    const absolute = resolveRelativePath(filePath, src);
    return toFileUrl(absolute);
  };

  const preparedContent = useMemo(
    () =>
      content
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, ''),
    [content]
  );

  useEffect(() => {
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollTop = 0;
    }
  }, [resetScrollToken]);

  const buildSearchRegex = (query: string, options?: FindOptions): RegExp | null => {
    if (!query.trim()) {
      return null;
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const source = options?.useRegex ? query : escaped;
    const pattern = options?.wholeWord ? `\\b${source}\\b` : source;
    const flags = options?.caseSensitive ? 'g' : 'gi';
    try {
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  };

  const clearSearchHighlights = () => {
    const root = previewContainerRef.current?.querySelector('.markdown-body');
    if (!root) {
      highlightedMatchesRef.current = [];
      return;
    }
    const marks = root.querySelectorAll('mark[data-md-search-highlight="1"]');
    for (const mark of marks) {
      const parent = mark.parentNode;
      if (!parent) {
        continue;
      }
      parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
      parent.normalize();
    }
    highlightedMatchesRef.current = [];
  };

  const syncActiveSearchHighlight = (activeIndex: number) => {
    const all = highlightedMatchesRef.current;
    for (let i = 0; i < all.length; i += 1) {
      const el = all[i];
      if (i === activeIndex) {
        el.className = 'rounded bg-orange-300/70 dark:bg-orange-500/45';
      } else {
        el.className = 'rounded bg-yellow-300/65 dark:bg-yellow-500/35';
      }
    }
  };

  const applySearchHighlights = () => {
    clearSearchHighlights();
    if (!findOpen || !searchQuery.trim()) {
      return;
    }
    const root = previewContainerRef.current?.querySelector('.markdown-body');
    if (!root) {
      return;
    }
    const regex = buildSearchRegex(searchQuery, searchOptions);
    if (!regex) {
      return;
    }

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = (node as Text).parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('pre, code, script, style, textarea, input, button')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    let globalIndex = 0;
    const matchElements: HTMLElement[] = [];
    for (const node of textNodes) {
      const text = node.nodeValue || '';
      regex.lastIndex = 0;
      let last = 0;
      let matched = false;
      const fragment = document.createDocumentFragment();
      let result = regex.exec(text);
      while (result) {
        const matchText = result[0] || '';
        const start = result.index;
        const end = start + matchText.length;
        if (start > last) {
          fragment.appendChild(document.createTextNode(text.slice(last, start)));
        }
        const mark = document.createElement('mark');
        mark.dataset.mdSearchHighlight = '1';
        mark.dataset.matchIndex = String(globalIndex);
        mark.textContent = matchText;
        fragment.appendChild(mark);
        matchElements.push(mark);
        globalIndex += 1;
        matched = true;
        last = end;
        if (matchText.length === 0) {
          regex.lastIndex += 1;
        }
        result = regex.exec(text);
      }
      if (!matched) {
        continue;
      }
      if (last < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(last)));
      }
      node.parentNode?.replaceChild(fragment, node);
    }

    highlightedMatchesRef.current = matchElements;
    syncActiveSearchHighlight(currentMatchIndex);
  };

  useImperativeHandle(
    ref,
    () => ({
      scrollToSourceOffset(offset: number) {
        const root = previewContainerRef.current;
        if (!root) {
          return;
        }
        const preparedOffset = sourceOffsetContentToPrepared(content, offset);
        const el = findElementForSourceOffset(root, preparedOffset);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
      scrollToSearchMatch(index: number) {
        if (index < 0) {
          return;
        }
        const target = highlightedMatchesRef.current[index];
        if (!target) {
          return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      getScrollTop() {
        return previewContainerRef.current?.scrollTop ?? 0;
      },
      setScrollTop(value: number) {
        const root = previewContainerRef.current;
        if (!root) {
          return;
        }
        root.scrollTop = Math.max(0, value);
      }
    }),
    [content]
  );

  useEffect(() => {
    applySearchHighlights();
  }, [content, currentMatchIndex, findOpen, searchOptions, searchQuery]);

  useEffect(() => {
    syncActiveSearchHighlight(currentMatchIndex);
  }, [currentMatchIndex]);

  const hasRawHtml = useMemo(() => /<[/a-zA-Z][^>]*>/.test(preparedContent), [preparedContent]);
  const rehypePlugins = useMemo(
    () =>
      hasRawHtml
        ? [
            [rehypeRaw],
            [rehypeKatex, KATEX_REHYPE_OPTIONS],
            rehypeSourceOffsets,
            [rehypeSanitize, sanitizeSchema]
          ]
        : [[rehypeKatex, KATEX_REHYPE_OPTIONS], rehypeSourceOffsets, [rehypeSanitize, sanitizeSchema]],
    [hasRawHtml, sanitizeSchema]
  );

  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);

  const handleMarkdownBodyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!splitPaneSync || !onSplitPanePreviewNavigate) {
      return;
    }
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (target.closest('input, button')) {
      return;
    }
    const link = target.closest('a[href]') as HTMLAnchorElement | null;
    if (link) {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) {
        return;
      }
    }
    let el: HTMLElement | null = target;
    const stop = event.currentTarget;
    while (el && el !== stop) {
      const start = readDataMdStart(el);
      if (start !== null) {
        onSplitPanePreviewNavigate(sourceOffsetPreparedToContent(content, start));
        return;
      }
      el = el.parentElement;
    }
  };

  const markdownComponents = useMemo(
    () => ({
      h1({ children, ...props }: any) {
        return <h1 {...props}>{children}</h1>;
      },
      h2({ children, ...props }: any) {
        return <h2 {...props}>{children}</h2>;
      },
      h3({ children, ...props }: any) {
        return <h3 {...props}>{children}</h3>;
      },
      h4({ children, ...props }: any) {
        return <h4 {...props}>{children}</h4>;
      },
      p({ children, ...props }: any) {
        return <p {...props}>{children}</p>;
      },
      blockquote({ children, ...props }: any) {
        return <blockquote {...props}>{children}</blockquote>;
      },
      li({ children, ...props }: any) {
        return <li {...props}>{children}</li>;
      },
      img({ ...props }: any) {
        const resolvedSrc = props.src ? resolveImageSrc(String(props.src)) : props.src;
        return <img {...props} src={resolvedSrc} loading="lazy" decoding="async" />;
      },
      a({ href, children, ...props }: any) {
        if (!href) {
          return <a {...props}>{children}</a>;
        }

        const isHashLink = href.startsWith('#');
        if (!isHashLink) {
          return (
            <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
              {children}
            </a>
          );
        }

        return (
          <a
            href={href}
            {...props}
            onClick={(clickEvent) => {
              clickEvent.preventDefault();
              const container = previewContainerRef.current;
              if (!container) {
                return;
              }
              const fragment = href.slice(1);
              const targetElement = findElementForHashFragment(container, fragment);
              if (!targetElement) {
                return;
              }
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {children}
          </a>
        );
      },
      code({ inline, className, children, ...props }: any) {
        const language = resolveFenceLanguage(className);
        const codeText = String(children).replace(/\n$/, '');
        if (!inline && (language === 'math' || language === 'latex' || language === 'tex')) {
          const html = katex.renderToString(codeText, {
            displayMode: true,
            throwOnError: false,
            output: 'html'
          });
          return wrapFenceForSourceSync(
            <div className="katex-display overflow-x-auto my-4" dangerouslySetInnerHTML={{ __html: html }} />,
            props
          );
        }
        return !inline && language ? (
          wrapFenceForSourceSync(
            <div className="relative">
              <CodeBlockCopyButton text={codeText} />
              <SyntaxHighlighter
                style={theme === 'dark' ? oneDark : oneLight}
                language={language}
                PreTag="pre"
                className="rounded-md"
                customStyle={{
                  marginBottom: '16px',
                  padding: '16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  lineHeight: 1.45
                }}
                {...props}
              >
                {codeText}
              </SyntaxHighlighter>
            </div>,
            props
          )
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
    }),
    [theme, filePath]
  );

  return (
    <div
      ref={previewContainerRef}
      id={assignPdfPrintRootId ? 'md-studio-pdf-print-root' : undefined}
      className="h-full min-h-0 overflow-y-auto bg-background"
    >
      <div
        className="markdown-body p-8 max-w-4xl mx-auto"
        onClick={handleMarkdownBodyClick}
        role="presentation"
      >
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins as any} components={markdownComponents}>
          {preparedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
});

export const Preview = memo(PreviewInner);
