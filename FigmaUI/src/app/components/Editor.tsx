import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState, StateField, StateEffect, Compartment } from '@codemirror/state';
import {
  EditorView,
  Decoration,
  type DecorationSet,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
  drawSelection,
  highlightActiveLine
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { indentUnit } from '@codemirror/language';

interface EditorProps {
  documentId?: string;
  value: string;
  onChange: (value: string, cursorPosition: { line: number; col: number }) => void;
  onCursorPositionChange?: (cursorPosition: { line: number; col: number }) => void;
  showLineNumbers?: boolean;
  resetScrollToken?: number;
  splitPaneSync?: boolean;
  onSplitPaneSourceNavigate?: (sourceOffset: number) => void;
  findOpen?: boolean;
  searchOptions?: FindOptions;
  currentMatchIndex?: number;
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

const MATCH_INACTIVE_DECO = Decoration.mark({ class: 'cm-search-match' });
const MATCH_ACTIVE_DECO = Decoration.mark({ class: 'cm-search-match-active' });

const setHighlightsEffect = StateEffect.define<{
  matches: Array<{ index: number; length: number }>;
  active: number;
}>();

const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setHighlightsEffect)) {
        const { matches, active } = e.value;
        if (!matches.length) return Decoration.none;
        const docLen = tr.state.doc.length;
        const ranges = [];
        for (let i = 0; i < matches.length; i++) {
          const m = matches[i];
          const from = Math.min(m.index, docLen);
          const to = Math.min(m.index + m.length, docLen);
          if (from >= to) continue;
          ranges.push(
            (i === active ? MATCH_ACTIVE_DECO : MATCH_INACTIVE_DECO).range(from, to)
          );
        }
        return Decoration.set(ranges, true);
      }
    }
    if (tr.docChanged) return deco.map(tr.changes);
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f)
});

const editorBaseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    backgroundColor: 'var(--background)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    lineHeight: '1.5'
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: 'var(--foreground)',
    color: 'var(--foreground)',
  },
  '.cm-line': {
    padding: '0 16px'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--foreground)'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--accent) !important'
  },
  '.cm-gutters': {
    backgroundColor: 'color-mix(in srgb, var(--muted) 30%, transparent)',
    borderRight: '1px solid var(--border)',
    color: 'var(--muted-foreground)',
    minWidth: '48px'
  },
  '.cm-gutter.cm-lineNumbers .cm-gutterElement': {
    padding: '0 12px 0 0',
    textAlign: 'right',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent'
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent'
  },
  '.cm-search-match': {
    backgroundColor: 'rgb(253 224 71 / 0.65)',
    borderRadius: '2px'
  },
  '.cm-search-match-active': {
    backgroundColor: 'rgb(253 186 116 / 0.7)',
    borderRadius: '2px'
  }
});

const editorDarkOverrides = EditorView.theme(
  {
    '.cm-search-match': {
      backgroundColor: 'rgb(234 179 8 / 0.35)'
    },
    '.cm-search-match-active': {
      backgroundColor: 'rgb(249 115 22 / 0.45)'
    }
  },
  { dark: true }
);

const lineNumbersCompartment = new Compartment();
const darkCompartment = new Compartment();

const CONTENT_SYNC_DELAY = 200;
const SPLIT_SYNC_DELAY = 150;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex(query: string, options?: FindOptions): RegExp | null {
  if (!query) return null;
  const source = options?.useRegex ? query : escapeRegex(query);
  const pattern = options?.wholeWord ? `\\b${source}\\b` : source;
  const flags = options?.caseSensitive ? 'g' : 'gi';
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

export const Editor = memo(
  forwardRef<EditorHandle, EditorProps>(function EditorInner(
    {
      documentId,
      value,
      onChange,
      onCursorPositionChange,
      showLineNumbers: showLN = true,
      resetScrollToken,
      splitPaneSync,
      onSplitPaneSourceNavigate,
      findOpen = false,
      currentMatchIndex = -1,
      workerMatches
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const onCursorRef = useRef(onCursorPositionChange);
    const splitSyncRef = useRef(splitPaneSync);
    const onSplitNavRef = useRef(onSplitPaneSourceNavigate);
    const suppressExternalRef = useRef(false);
    const contentSyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>();
    const splitSyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>();
    const documentIdRef = useRef(documentId ?? '');
    onChangeRef.current = onChange;
    onCursorRef.current = onCursorPositionChange;
    splitSyncRef.current = splitPaneSync;
    onSplitNavRef.current = onSplitPaneSourceNavigate;
    documentIdRef.current = documentId ?? '';

    const findOpenRef = useRef(findOpen);
    const workerMatchesRef = useRef(workerMatches);
    const currentMatchIndexRef = useRef(currentMatchIndex);
    findOpenRef.current = findOpen;
    workerMatchesRef.current = workerMatches;
    currentMatchIndexRef.current = currentMatchIndex;

    const matchCacheRef = useRef<{
      key: string;
      matches: Array<{ index: number; length: number }>;
    } | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      const isDark = document.documentElement.classList.contains('dark');

      const state = EditorState.create({
        doc: value,
        extensions: [
          lineNumbersCompartment.of(showLN ? lineNumbers() : []),
          darkCompartment.of(isDark ? editorDarkOverrides : []),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          indentUnit.of('  '),
          markdown(),
          highlightField,
          editorBaseTheme,
          drawSelection(),
          highlightActiveLine(),
          cmPlaceholder('Start typing your markdown here...'),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              suppressExternalRef.current = true;
              const pos = update.state.selection.main.head;
              const line = update.state.doc.lineAt(pos);
              onCursorRef.current?.({
                line: line.number,
                col: pos - line.from + 1
              });
              clearTimeout(contentSyncTimer.current);
              const changeDocumentId = documentIdRef.current;
              contentSyncTimer.current = setTimeout(() => {
                if (changeDocumentId !== documentIdRef.current) {
                  return;
                }
                const v = viewRef.current;
                if (!v) return;
                const doc = v.state.doc.toString();
                const p = v.state.selection.main.head;
                const l = v.state.doc.lineAt(p);
                onChangeRef.current(doc, {
                  line: l.number,
                  col: p - l.from + 1
                });
              }, CONTENT_SYNC_DELAY);
            } else if (update.selectionSet || update.focusChanged) {
              const pos = update.state.selection.main.head;
              const line = update.state.doc.lineAt(pos);
              onCursorRef.current?.({
                line: line.number,
                col: pos - line.from + 1
              });
              if (splitSyncRef.current && onSplitNavRef.current && update.selectionSet) {
                clearTimeout(splitSyncTimer.current);
                splitSyncTimer.current = setTimeout(() => {
                  const v = viewRef.current;
                  if (!v) return;
                  onSplitNavRef.current?.(v.state.selection.main.head);
                }, SPLIT_SYNC_DELAY);
              }
            }
          })
        ]
      });

      const view = new EditorView({ state, parent: containerRef.current });
      viewRef.current = view;

      const observer = new MutationObserver(() => {
        const nowDark = document.documentElement.classList.contains('dark');
        view.dispatch({
          effects: darkCompartment.reconfigure(nowDark ? editorDarkOverrides : [])
        });
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });

      return () => {
        clearTimeout(contentSyncTimer.current);
        clearTimeout(splitSyncTimer.current);
        observer.disconnect();
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      clearTimeout(contentSyncTimer.current);
      suppressExternalRef.current = false;
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value }
        });
      }
    }, [documentId]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      if (suppressExternalRef.current) {
        suppressExternalRef.current = false;
        return;
      }
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value }
        });
      }
    }, [value]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: lineNumbersCompartment.reconfigure(showLN ? lineNumbers() : [])
      });
    }, [showLN]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const fo = findOpenRef.current;
      const wm = workerMatchesRef.current;
      const cm = currentMatchIndexRef.current;
      if (!fo || !wm?.length) {
        view.dispatch({
          effects: setHighlightsEffect.of({ matches: [], active: -1 })
        });
        return;
      }
      view.dispatch({
        effects: setHighlightsEffect.of({
          matches: wm,
          active: cm
        })
      });
    }, [workerMatches, findOpen, currentMatchIndex]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.scrollDOM.scrollTo(0, 0);
    }, [resetScrollToken]);

    const findAllMatches = (query: string, options?: FindOptions) => {
      const view = viewRef.current;
      if (!view) return [];
      const regex = buildRegex(query, options);
      if (!regex) return [];
      const content = view.state.doc.toString();
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
        const len = result[0]?.length ?? 0;
        if (len <= 0) {
          regex.lastIndex += 1;
          continue;
        }
        matches.push({ index: result.index, length: len });
      }
      matchCacheRef.current = { key: cacheKey, matches };
      return matches;
    };

    const getCursorPos = (doc: ReturnType<typeof EditorState.create>['doc'], pos: number) => {
      const line = doc.lineAt(pos);
      return { line: line.number, col: pos - line.from + 1 };
    };

    const selectAndScroll = (view: EditorView, from: number, to: number) => {
      view.dispatch({
        selection: { anchor: from, head: to },
        scrollIntoView: true
      });
      view.focus();
      const line = view.state.doc.lineAt(from);
      onCursorRef.current?.({ line: line.number, col: from - line.from + 1 });
    };

    useImperativeHandle(
      ref,
      () => ({
        findFirst(query: string, options?: FindOptions) {
          const view = viewRef.current;
          if (!view || !query) return false;
          const matches = findAllMatches(query, options);
          if (!matches.length) return false;
          const m = matches[0];
          selectAndScroll(view, m.index, m.index + m.length);
          return true;
        },

        findNext(query: string, options?: FindOptions) {
          const view = viewRef.current;
          if (!view || !query) return false;
          const matches = findAllMatches(query, options);
          if (!matches.length) return false;
          const fromIndex = view.state.selection.main.to;
          const next = matches.find((m) => m.index >= fromIndex) ?? matches[0];
          selectAndScroll(view, next.index, next.index + next.length);
          return true;
        },

        findPrevious(query: string, options?: FindOptions) {
          const view = viewRef.current;
          if (!view || !query) return false;
          const matches = findAllMatches(query, options);
          if (!matches.length) return false;
          const fromIndex = Math.max(0, view.state.selection.main.from - 1);
          let prev = matches[matches.length - 1];
          for (let i = matches.length - 1; i >= 0; i--) {
            if (matches[i].index <= fromIndex) {
              prev = matches[i];
              break;
            }
          }
          selectAndScroll(view, prev.index, prev.index + prev.length);
          return true;
        },

        replaceCurrent(query: string, replaceWith: string, options?: FindOptions) {
          const view = viewRef.current;
          if (!view || !query) return false;
          const { from, to } = view.state.selection.main;
          const selectedText = view.state.sliceDoc(from, to);
          const selectedRegex = buildRegex(query, options);
          if (!selectedRegex) return false;
          const exactRegex = new RegExp(
            `^(?:${selectedRegex.source})$`,
            options?.caseSensitive ? '' : 'i'
          );
          if (!exactRegex.test(selectedText)) return false;
          view.dispatch({
            changes: { from, to, insert: replaceWith },
            selection: { anchor: from, head: from + replaceWith.length }
          });
          clearTimeout(contentSyncTimer.current);
          const newDoc = view.state.doc.toString();
          const cursorPos = getCursorPos(view.state.doc, from);
          onChangeRef.current(newDoc, cursorPos);
          view.focus();
          return true;
        },

        replaceAll(query: string, replaceWith: string, options?: FindOptions) {
          const view = viewRef.current;
          if (!view || !query) return 0;
          const regex = buildRegex(query, options);
          if (!regex) return 0;
          const source = view.state.doc.toString();
          const allMatches = source.match(regex);
          const count = allMatches ? allMatches.length : 0;
          if (!count) return 0;
          const nextValue = source.replace(regex, replaceWith);
          view.dispatch({
            changes: { from: 0, to: source.length, insert: nextValue },
            selection: { anchor: 0 }
          });
          clearTimeout(contentSyncTimer.current);
          const cursorPos = getCursorPos(view.state.doc, 0);
          onChangeRef.current(nextValue, cursorPos);
          view.focus();
          return count;
        },

        getCurrentMatchIndex(query: string, options?: FindOptions) {
          const view = viewRef.current;
          if (!view || !query) return -1;
          const matches = findAllMatches(query, options);
          if (!matches.length) return -1;
          const { from, to } = view.state.selection.main;
          return matches.findIndex(
            (m) => m.index === from && m.index + m.length === to
          );
        },

        countMatches(query: string, options?: FindOptions) {
          return findAllMatches(query, options).length;
        },

        scrollToSourceOffset(offset: number) {
          const view = viewRef.current;
          if (!view) return;
          const safe = Math.max(0, Math.min(offset, view.state.doc.length));
          selectAndScroll(view, safe, safe);
        }
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        className="h-full min-h-0 flex-1 overflow-hidden bg-background"
      />
    );
  }),
  (prev, next) => {
    if (prev.documentId !== next.documentId) return false;
    if (prev.value !== next.value) return false;
    if (prev.onChange !== next.onChange) return false;
    if (prev.showLineNumbers !== next.showLineNumbers) return false;
    if (prev.resetScrollToken !== next.resetScrollToken) return false;
    return true;
  }
);
