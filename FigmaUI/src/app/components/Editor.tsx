import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface EditorProps {
  value: string;
  onChange: (value: string, cursorPosition: { line: number; col: number }) => void;
  onCursorPositionChange?: (cursorPosition: { line: number; col: number }) => void;
  showLineNumbers?: boolean;
  resetScrollToken?: number;
  /** When set, clicking the editor reports the caret byte offset for split-pane preview sync. */
  splitPaneSync?: boolean;
  onSplitPaneSourceNavigate?: (sourceOffset: number) => void;
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

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({
  value,
  onChange,
  onCursorPositionChange,
  showLineNumbers = true,
  resetScrollToken,
  splitPaneSync,
  onSplitPaneSourceNavigate
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
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
    }
  };

  const getCursorPosition = (text: string, selectionStart: number) => {
    const beforeCursor = text.slice(0, selectionStart);
    const lines = beforeCursor.split('\n');
    return {
      line: lines.length,
      col: (lines[lines.length - 1]?.length ?? 0) + 1
    };
  };

  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

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
    const matches: Array<{ index: number; length: number }> = [];
    const content = textarea.value;
    let result: RegExpExecArray | null;
    while ((result = regex.exec(content)) !== null) {
      const length = result[0]?.length ?? 0;
      if (length <= 0) {
        regex.lastIndex += 1;
        continue;
      }
      matches.push({ index: result.index, length });
    }
    return matches;
  };

  const moveViewportToSelection = (start: number) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const style = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(style.lineHeight) || 21;
    const before = textarea.value.slice(0, start);
    const lineIndex = Math.max(0, before.split('\n').length - 1);
    const targetTop = lineIndex * lineHeight - (textarea.clientHeight * 0.35);
    const maxTop = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
    textarea.scrollTop = Math.max(0, Math.min(maxTop, targetTop));
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
      textarea.focus();
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

      textarea.focus();
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
      const previous = [...matches].reverse().find((match) => match.index <= fromIndex) ?? matches[matches.length - 1];

      textarea.focus();
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
    <div className="h-full min-h-0 flex-1 flex overflow-hidden bg-background">
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
          {lineNumbers.map(num => (
            <div key={num} style={{ height: '21px' }}>
              {num}
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onMouseDown={(e) => {
          const target = e.currentTarget;
          const styles = window.getComputedStyle(target);
          const lineHeight = Number.parseFloat(styles.lineHeight) || 21;
          const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
          const contentHeight = value.split('\n').length * lineHeight + paddingTop;
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
        className="h-full min-h-0 flex-1 overflow-y-auto p-4 bg-background text-foreground outline-none resize-none"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          tabSize: 2
        }}
        spellCheck={false}
        placeholder="Start typing your markdown here..."
      />
    </div>
  );
});
