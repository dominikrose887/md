import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface EditorProps {
  value: string;
  onChange: (value: string, cursorPosition: { line: number; col: number }) => void;
  onCursorPositionChange?: (cursorPosition: { line: number; col: number }) => void;
  showLineNumbers?: boolean;
  resetScrollToken?: number;
  /** When set, clicking the editor reports the caret byte offset for split-pane preview sync. */
  splitPaneSync?: boolean;
  onSplitPaneSourceNavigate?: (sourceOffset: number) => void;
  findOpen?: boolean;
  searchQuery?: string;
  searchOptions?: FindOptions;
  currentMatchIndex?: number;
  /** Pre-computed matches from the search worker (avoids main-thread regex scan for highlights). */
  workerMatches?: Array<{ index: number; length: number }>;
}

export interface FindOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
  wholeWord?: boolean;
}

export interface EditorHandle {
  findFirst: (query: string, options?: FindOptions) => boolean;
  findNext: (query: string, options?: FindOptions) => boolean;
  findPrevious: (query: string, options?: FindOptions) => boolean;
  replaceCurrent: (query: string, replaceWith: string, options?: FindOptions) => boolean;
  replaceAll: (query: string, replaceWith: string, options?: FindOptions) => number;
  getCurrentMatchIndex: (query: string, options?: FindOptions) => number;
  countMatches: (query: string, options?: FindOptions) => number;
  scrollToSourceOffset: (offset: number) => void;
}

export const Editor = memo(forwardRef<EditorHandle, EditorProps>(function Editor({
  value,
  onChange,
  onCursorPositionChange,
  showLineNumbers = true,
  resetScrollToken,
  splitPaneSync,
  onSplitPaneSourceNavigate,
  findOpen = false,
  searchQuery = '',
  searchOptions,
  currentMatchIndex = -1,
  workerMatches
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const matchCacheRef = useRef<{
    key: string;
    matches: Array<{ index: number; length: number }>;
  } | null>(null);
  const EDITOR_LINE_HEIGHT = 21;
  const LINE_OVERSCAN = 50;

  useEffect(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const updateHeight = () => setViewportHeight(textarea.clientHeight);
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(textarea);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.scrollTop = 0;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = 0;
    }
  }, [resetScrollToken]);

  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      const textarea = textareaRef.current;
      lineNumbersRef.current.scrollTop = textarea.scrollTop;
      setScrollTop(textarea.scrollTop);
      setViewportHeight(textarea.clientHeight);
    }
  };

  const getCursorPosition = (text: string, selectionStart: number) => {
    let line = 1;
    let lastLineStart = 0;
    const end = Math.max(0, Math.min(selectionStart, text.length));
    for (let i = 0; i < end; i += 1) {
      if (text.charCodeAt(i) === 10) {
        line += 1;
        lastLineStart = i + 1;
      }
    }
    return {
      line,
      col: end - lastLineStart + 1
    };
  };

  const lineStartOffsets = useMemo(() => {
    const offsets = [0];
    for (let i = 0; i < value.length; i += 1) {
      if (value.charCodeAt(i) === 10) {
        offsets.push(i + 1);
      }
    }
    return offsets;
  }, [value]);

  const lineCount = lineStartOffsets.length;

  const virtualLineRange = useMemo(() => {
    const visibleLines = Math.max(1, Math.ceil((viewportHeight || 1) / EDITOR_LINE_HEIGHT));
    const start = Math.max(0, Math.floor(scrollTop / EDITOR_LINE_HEIGHT) - LINE_OVERSCAN);
    const end = Math.min(lineCount, start + visibleLines + (LINE_OVERSCAN * 2));
    return { start, end };
  }, [lineCount, scrollTop, viewportHeight]);

  const renderedLineNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let i = virtualLineRange.start + 1; i <= virtualLineRange.end; i += 1) {
      nums.push(i);
    }
    return nums;
  }, [virtualLineRange.end, virtualLineRange.start]);

  const searchMatches = useMemo(() => {
    if (!findOpen || !searchQuery.trim()) {
      return [] as Array<{ index: number; length: number }>;
    }
    if (workerMatches) {
      return workerMatches;
    }
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const source = searchOptions?.useRegex ? searchQuery : escaped;
    const pattern = searchOptions?.wholeWord ? `\\b${source}\\b` : source;
    const flags = searchOptions?.caseSensitive ? 'g' : 'gi';
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch {
      return [] as Array<{ index: number; length: number }>;
    }
    const matches: Array<{ index: number; length: number }> = [];
    let result: RegExpExecArray | null;
    while ((result = regex.exec(value)) !== null) {
      const length = result[0]?.length ?? 0;
      if (length <= 0) {
        regex.lastIndex += 1;
        continue;
      }
      matches.push({ index: result.index, length });
    }
    return matches;
  }, [findOpen, searchOptions, searchQuery, value, workerMatches]);

  const highlightedEditorContent = useMemo(() => {
    if (!findOpen || !searchMatches.length) {
      return value;
    }
    const out: Array<string | ReactNode> = [];
    let cursor = 0;
    for (let i = 0; i < searchMatches.length; i += 1) {
      const match = searchMatches[i];
      if (match.index > cursor) {
        out.push(value.slice(cursor, match.index));
      }
      const text = value.slice(match.index, match.index + match.length);
      out.push(
        <mark
          key={`${match.index}:${match.length}:${i}`}
          className={i === currentMatchIndex ? 'bg-orange-300/70 dark:bg-orange-500/45' : 'bg-yellow-300/65 dark:bg-yellow-500/35'}
        >
          {text}
        </mark>
      );
      cursor = match.index + match.length;
    }
    if (cursor < value.length) {
      out.push(value.slice(cursor));
    }
    return out;
  }, [currentMatchIndex, findOpen, searchMatches, value]);

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const buildRegex = (query: string, options?: FindOptions) => {
    if (!query) {
      return null;
    }
    const source = options?.useRegex ? query : escapeRegex(query);
    const pattern = options?.wholeWord ? `\\b${source}\\b` : source;
    const flags = options?.caseSensitive ? 'g' : 'gi';
    try {
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  };

  const findAllMatches = (query: string, options?: FindOptions) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return [];
    }
    const regex = buildRegex(query, options);
    if (!regex) {
      return [];
    }
    const content = textarea.value;
    const cacheKey = [
      content,
      query,
      options?.caseSensitive ? '1' : '0',
      options?.useRegex ? '1' : '0',
      options?.wholeWord ? '1' : '0'
    ].join('\u0000');
    if (matchCacheRef.current?.key === cacheKey) {
      return matchCacheRef.current.matches;
    }

    const matches: Array<{ index: number; length: number }> = [];
    let result: RegExpExecArray | null;
    while ((result = regex.exec(content)) !== null) {
      const length = result[0]?.length ?? 0;
      if (length <= 0) {
        regex.lastIndex += 1;
        continue;
      }
      matches.push({ index: result.index, length });
    }
    matchCacheRef.current = { key: cacheKey, matches };
    return matches;
  };

  const cachedLineHeightRef = useRef<number>(0);

  const moveViewportToSelection = (start: number) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    if (!cachedLineHeightRef.current) {
      const style = window.getComputedStyle(textarea);
      cachedLineHeightRef.current = Number.parseFloat(style.lineHeight) || EDITOR_LINE_HEIGHT;
    }
    const lineHeight = cachedLineHeightRef.current;
    const safeStart = Math.max(0, Math.min(start, textarea.value.length));

    let lo = 0;
    let hi = lineStartOffsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (lineStartOffsets[mid] <= safeStart) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    const lineIndex = lo;

    const targetTop = lineIndex * lineHeight - (textarea.clientHeight * 0.35);
    const maxTop = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
    textarea.scrollTop = Math.max(0, Math.min(maxTop, targetTop));
    setScrollTop(textarea.scrollTop);
    setViewportHeight(textarea.clientHeight);
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textarea.scrollTop;
    }
  };

  useImperativeHandle(ref, () => ({
    findFirst(query: string, options?: FindOptions) {
      const textarea = textareaRef.current;
      if (!textarea || !query) {
        return false;
      }
      const matches = findAllMatches(query, options);
      if (!matches.length) {
        return false;
      }
      const first = matches[0];
      textarea.setSelectionRange(first.index, first.index + first.length);
      moveViewportToSelection(first.index);
      onCursorPositionChange?.(getCursorPosition(textarea.value, first.index));
      return true;
    },

    findNext(query: string, options?: FindOptions) {
      const textarea = textareaRef.current;
      if (!textarea || !query) {
        return false;
      }
      const matches = findAllMatches(query, options);
      if (!matches.length) {
        return false;
      }
      const fromIndex = textarea.selectionEnd;
      const next = matches.find((match) => match.index >= fromIndex) ?? matches[0];

      textarea.setSelectionRange(next.index, next.index + next.length);
      moveViewportToSelection(next.index);
      onCursorPositionChange?.(getCursorPosition(textarea.value, next.index));
      return true;
    },

    findPrevious(query: string, options?: FindOptions) {
      const textarea = textareaRef.current;
      if (!textarea || !query) {
        return false;
      }
      const matches = findAllMatches(query, options);
      if (!matches.length) {
        return false;
      }
      const fromIndex = Math.max(0, textarea.selectionStart - 1);
      let previous = matches[matches.length - 1];
      for (let i = matches.length - 1; i >= 0; i -= 1) {
        if (matches[i].index <= fromIndex) {
          previous = matches[i];
          break;
        }
      }

      textarea.setSelectionRange(previous.index, previous.index + previous.length);
      moveViewportToSelection(previous.index);
      onCursorPositionChange?.(getCursorPosition(textarea.value, previous.index));
      return true;
    },

    replaceCurrent(query: string, replaceWith: string, options?: FindOptions) {
      const textarea = textareaRef.current;
      if (!textarea || !query) {
        return false;
      }

      const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
      const selectedRegex = buildRegex(query, options);
      if (!selectedRegex) {
        return false;
      }
      const exactRegex = new RegExp(`^(?:${selectedRegex.source})$`, options?.caseSensitive ? '' : 'i');
      if (!exactRegex.test(selectedText)) {
        return false;
      }

      const before = textarea.value.slice(0, textarea.selectionStart);
      const after = textarea.value.slice(textarea.selectionEnd);
      const nextValue = `${before}${replaceWith}${after}`;
      const nextStart = before.length;
      const nextEnd = nextStart + replaceWith.length;

      onChange(nextValue, getCursorPosition(nextValue, nextStart));
      requestAnimationFrame(() => {
        const active = textareaRef.current;
        if (!active) {
          return;
        }
        active.focus();
        active.setSelectionRange(nextStart, nextEnd);
      });
      return true;
    },

    replaceAll(query: string, replaceWith: string, options?: FindOptions) {
      const textarea = textareaRef.current;
      if (!textarea || !query) {
        return 0;
      }

      const source = textarea.value;
      const regex = buildRegex(query, options);
      if (!regex) {
        return 0;
      }
      const matches = source.match(regex);
      const count = matches ? matches.length : 0;
      if (!count) {
        return 0;
      }

      const nextValue = source.replace(regex, replaceWith);
      onChange(nextValue, getCursorPosition(nextValue, 0));
      requestAnimationFrame(() => {
        const active = textareaRef.current;
        if (!active) {
          return;
        }
        active.focus();
        active.setSelectionRange(0, 0);
      });
      return count;
    },

    getCurrentMatchIndex(query: string, options?: FindOptions) {
      const textarea = textareaRef.current;
      if (!textarea || !query) {
        return -1;
      }
      const matches = findAllMatches(query, options);
      if (!matches.length) {
        return -1;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const index = matches.findIndex((match) => match.index === start && (match.index + match.length) === end);
      return index;
    },

    countMatches(query: string, options?: FindOptions) {
      return findAllMatches(query, options).length;
    },

    scrollToSourceOffset(offset: number) {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      const safe = Math.max(0, Math.min(offset, textarea.value.length));
      textarea.focus();
      textarea.setSelectionRange(safe, safe);
      moveViewportToSelection(safe);
      onCursorPositionChange?.(getCursorPosition(textarea.value, safe));
    }
  }), [onChange, onCursorPositionChange]);

  return (
    <div className="relative h-full min-h-0 flex-1 flex overflow-hidden bg-background">
      {showLineNumbers && (
        <div
          ref={lineNumbersRef}
          className="w-12 bg-muted/30 border-r border-border overflow-hidden text-right pr-3 py-4 select-none"
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            color: 'var(--color-muted-foreground)'
          }}
        >
          <div style={{ height: `${lineCount * EDITOR_LINE_HEIGHT}px`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: `${virtualLineRange.start * EDITOR_LINE_HEIGHT}px`,
                left: 0,
                right: 0
              }}
            >
              {renderedLineNumbers.map((num) => (
                <div key={num} style={{ height: `${EDITOR_LINE_HEIGHT}px` }}>
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onMouseDown={(e) => {
          const target = e.currentTarget;
          if (!cachedLineHeightRef.current) {
            const styles = window.getComputedStyle(target);
            cachedLineHeightRef.current = Number.parseFloat(styles.lineHeight) || EDITOR_LINE_HEIGHT;
          }
          const lineHeight = cachedLineHeightRef.current;
          const paddingTop = 16;
          const contentHeight = lineCount * lineHeight + paddingTop;
          if (e.nativeEvent.offsetY > contentHeight) {
            e.preventDefault();
            target.focus();
            const end = target.value.length;
            target.setSelectionRange(end, end);
            onCursorPositionChange?.(getCursorPosition(target.value, end));
            if (splitPaneSync && onSplitPaneSourceNavigate) {
              onSplitPaneSourceNavigate(end);
            }
          }
        }}
        onChange={(e) => onChange(e.target.value, getCursorPosition(e.target.value, e.target.selectionStart))}
        onClick={(e) => {
          const target = e.target as HTMLTextAreaElement;
          onCursorPositionChange?.(getCursorPosition(target.value, target.selectionStart));
          if (splitPaneSync && onSplitPaneSourceNavigate) {
            onSplitPaneSourceNavigate(target.selectionStart);
          }
        }}
        onKeyUp={(e) => {
          const target = e.target as HTMLTextAreaElement;
          onCursorPositionChange?.(getCursorPosition(target.value, target.selectionStart));
        }}
        onScroll={handleScroll}
        className="relative z-10 h-full min-h-0 flex-1 overflow-y-auto p-4 bg-transparent text-foreground outline-none resize-none"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          tabSize: 2
        }}
        spellCheck={false}
        placeholder="Start typing your markdown here..."
      />
      {findOpen && searchMatches.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-0 overflow-hidden"
          style={{ left: showLineNumbers ? '48px' : '0px' }}
        >
          <pre
            className="m-0 h-full min-h-0 overflow-hidden p-4 whitespace-pre-wrap break-words"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              fontSize: '14px',
              lineHeight: '1.5',
              tabSize: 2,
              color: 'transparent',
              transform: `translateY(-${scrollTop}px)`
            }}
          >
            {highlightedEditorContent}
          </pre>
        </div>
      )}
    </div>
  );
}));
