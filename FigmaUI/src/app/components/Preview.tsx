import { memo, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PreviewProps {
  content: string;
  theme: 'light' | 'dark';
  filePath?: string;
  resetScrollToken?: number;
}

export const Preview = memo(function Preview({ content, theme, filePath, resetScrollToken }: PreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useMemo(() => resetScrollToken, [resetScrollToken]);

  const sanitizeSchema = useMemo(
    () => ({
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        a: [...(defaultSchema.attributes?.a ?? []), 'id', 'name', 'target', 'rel']
      }
    }),
    []
  );

  const resolveLanguage = (className?: string) => {
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
  };

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
  const hasRawHtml = useMemo(() => /<[/a-zA-Z][^>]*>/.test(preparedContent), [preparedContent]);
  const rehypePlugins = useMemo(
    () => (hasRawHtml ? [[rehypeRaw], [rehypeSanitize, sanitizeSchema]] : [[rehypeSanitize, sanitizeSchema]]),
    [hasRawHtml, sanitizeSchema]
  );

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
            onClick={(event) => {
              event.preventDefault();
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
        const language = resolveLanguage(className);
        return !inline && language ? (
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
          </SyntaxHighlighter>
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
    <div ref={previewContainerRef} className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="markdown-body p-8 max-w-4xl mx-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={rehypePlugins as any}
          components={markdownComponents}
        >
          {preparedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
});
