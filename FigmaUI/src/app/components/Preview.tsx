import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
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
import { createKatexSanitizeSchema } from '@/utils/katexSanitizeSchema';
import { rehypeSourceOffsets } from '@/utils/rehypeSourceOffsets';
import {
  findElementForSourceOffset,
  readDataMdStart,
  sourceOffsetContentToPrepared,
  sourceOffsetPreparedToContent
} from '@/utils/sourceOffsetSync';

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

export interface PreviewHandle {
  scrollToSourceOffset: (offset: number) => void;
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
}

const PreviewInner = forwardRef<PreviewHandle, PreviewProps>(function PreviewInner(
  {
    content,
    theme,
    filePath,
    resetScrollToken,
    assignPdfPrintRootId,
    splitPaneSync,
    onSplitPanePreviewNavigate
  },
  ref
) {
  const previewContainerRef = useRef<HTMLDivElement>(null);

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
      }
    }),
    [content]
  );

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
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (target.closest('input')) {
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
              const targetId = decodeURIComponent(href.slice(1));
              if (!targetId) {
                return;
              }
              const escapedId = window.CSS?.escape ? window.CSS.escape(targetId) : targetId;
              const targetElement = container.querySelector(`[id="${escapedId}"], [name="${escapedId}"]`);
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
        if (!inline && (language === 'math' || language === 'latex' || language === 'tex')) {
          const text = String(children).replace(/\n$/, '');
          const html = katex.renderToString(text, {
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
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>,
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
