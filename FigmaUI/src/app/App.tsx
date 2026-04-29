import { useState, useEffect, useRef, useDeferredValue, useMemo, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Toolbar } from './components/Toolbar';
import { Editor, type EditorHandle, type FindOptions } from './components/Editor';
import { Preview, type PreviewHandle } from './components/Preview';
import { StatusBar } from './components/StatusBar';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { SAMPLE_MARKDOWN } from './components/SampleContent';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { suggestedPdfFileName } from '@/utils/pdf';
import { X } from 'lucide-react';
import { useSearchWorker } from './hooks/useSearchWorker';

type FsHandle = FileSystemFileHandle | null;
const THEME_STORAGE_KEY = 'mdstudio:theme';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('preview');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedContent, setSavedContent] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [showError, setShowError] = useState(false);
  const [lineEnding, setLineEnding] = useState<'LF' | 'CRLF'>('LF');
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitiveFind, setCaseSensitiveFind] = useState(false);
  const [useRegexFind, setUseRegexFind] = useState(false);
  const [wholeWordFind, setWholeWordFind] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [findFocusToken, setFindFocusToken] = useState(0);
  const [resetScrollToken, setResetScrollToken] = useState(0);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const fileHandleRef = useRef<FsHandle>(null);
  const nativeFilePathRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const deferredContent = useDeferredValue(content);
  const findOptions: FindOptions = useMemo(
    () => ({
      caseSensitive: caseSensitiveFind,
      useRegex: useRegexFind,
      wholeWord: wholeWordFind
    }),
    [caseSensitiveFind, useRegexFind, wholeWordFind]
  );
  const searchState = useSearchWorker(content, findQuery, findOptions, findOpen);

  const totalMatches = searchState.totalCount;

  useEffect(() => {
    if (!findOpen || !findQuery.trim() || searchState.totalCount === 0) {
      setCurrentMatchIndex(-1);
      return;
    }
    if (!editorRef.current) {
      return;
    }
    setCurrentMatchIndex(editorRef.current.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
  }, [searchState.totalCount, findOpen, findOptions, findQuery]);

  useEffect(() => {
    if (!findOpen || !findQuery.trim() || currentMatchIndex < 0) {
      return;
    }
    previewRef.current?.scrollToSearchMatch(currentMatchIndex);
  }, [currentMatchIndex, findOpen, findQuery]);

  useEffect(() => {
    if (!findOpen) {
      return;
    }
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, [findOpen, findFocusToken]);

  useEffect(() => {
    if (!findOpen || !fileName || viewMode !== 'preview') {
      return;
    }
    setFindOpen(false);
  }, [fileName, findOpen, viewMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setHasUnsavedChanges(content !== savedContent);
  }, [content, savedContent]);

  useEffect(() => {
    if (window.mdStudio) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi) {
      return;
    }

    const loadFilePath = async (filePath: string) => {
      try {
        const result = await mdStudioApi.readFile(filePath);
        if (!result.canceled && result.path && result.name && result.content != null) {
          nativeFilePathRef.current = result.path;
          applyOpenedFile(result.name, result.path, result.content);
        }
      } catch {
        setShowError(true);
        setErrorMessage('Failed to open external file');
      }
    };

    void mdStudioApi.getLaunchFile().then((launchPath) => {
      if (launchPath) {
        void loadFilePath(launchPath);
      }
    });

    const unsubscribe = mdStudioApi.onOpenFilePath((filePath) => {
      void loadFilePath(filePath);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const detectLineEnding = (text: string): 'LF' | 'CRLF' => (text.includes('\r\n') ? 'CRLF' : 'LF');

  const normalizeToLf = (text: string): string => text.replace(/\r\n/g, '\n');

  const applyOpenedFile = (name: string, fullPath: string, text: string, handle: FsHandle = null) => {
    const normalized = normalizeToLf(text);
    fileHandleRef.current = handle;
    if (!handle && window.mdStudio) {
      nativeFilePathRef.current = fullPath;
    }
    setFileName(name);
    setFilePath(fullPath);
    setLineEnding(detectLineEnding(text));
    setContent(normalized);
    setSavedContent(normalized);
    setShowError(false);
    setHasUnsavedChanges(false);
    setResetScrollToken((prev) => prev + 1);
    toast.success('File opened successfully');
  };

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleViewModeChange = (nextMode: 'split' | 'editor' | 'preview') => {
    const currentPreviewTop = previewRef.current?.getScrollTop() ?? 0;
    if (nextMode === 'preview' && findOpen) {
      setFindOpen(false);
    }
    setViewMode(nextMode);
    if (nextMode === 'preview') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          previewRef.current?.setScrollTop(currentPreviewTop);
        });
      });
    }
  };

  const handleOpen = async () => {
    setShowError(false);
    setErrorMessage('');

    try {
      const mdStudioApi = window.mdStudio;
      if (mdStudioApi) {
        const result = await mdStudioApi.openFileDialog();
        if (!result.canceled && result.path && result.name && result.content != null) {
          nativeFilePathRef.current = result.path;
          applyOpenedFile(result.name, result.path, result.content);
        }
        return;
      }

      if ('showOpenFilePicker' in window) {
        const pickerWindow = window as Window & {
          showOpenFilePicker: (options: {
            multiple: boolean;
            excludeAcceptAllOption: boolean;
            types: Array<{ description: string; accept: Record<string, string[]> }>;
          }) => Promise<FileSystemFileHandle[]>;
        };

        const [handle] = await pickerWindow.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: false,
          types: [
            {
              description: 'Markdown files',
              accept: { 'text/markdown': ['.md', '.markdown', '.mdown'] }
            }
          ]
        });

        if (!handle) {
          return;
        }

        const file = await handle.getFile();
        const text = await file.text();
        applyOpenedFile(file.name, handle.name, text, handle);
        return;
      }

      fileInputRef.current?.click();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      setShowError(true);
      setErrorMessage('Failed to open file');
      toast.error('Failed to open file');
    }
  };

  const serializeForSave = () => {
    if (lineEnding === 'CRLF') {
      return content.replace(/\n/g, '\r\n');
    }
    return content;
  };

  const handleSave = async (): Promise<boolean> => {
    if (!fileName) {
      toast.error('No file to save');
      return false;
    }

    try {
      const data = serializeForSave();
      const mdStudioApi = window.mdStudio;

      if (mdStudioApi) {
        const result = await mdStudioApi.saveFile({
          path: nativeFilePathRef.current,
          suggestedName: fileName || 'document.md',
          content: data
        });
        if (!result.canceled && result.path && result.name) {
          nativeFilePathRef.current = result.path;
          setFilePath(result.path);
          setFileName(result.name);
          setSavedContent(content);
          setHasUnsavedChanges(false);
          toast.success('File saved successfully');
          return true;
        }
        return false;
      }

      if (fileHandleRef.current) {
        const writable = await fileHandleRef.current.createWritable();
        await writable.write(data);
        await writable.close();
        setSavedContent(content);
        setHasUnsavedChanges(false);
        toast.success('File saved successfully');
        return true;
      }

      const blob = new Blob([data], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setSavedContent(content);
      setHasUnsavedChanges(false);
      toast.success('File downloaded (browser fallback)');
      return true;
    } catch {
      setShowError(true);
      setErrorMessage('Failed to save file');
      toast.error('Failed to save file');
      return false;
    }
  };

  const handleSaveAs = async (): Promise<boolean> => {
    try {
      const data = serializeForSave();
      const mdStudioApi = window.mdStudio;

      if (mdStudioApi) {
        const result = await mdStudioApi.saveFile({
          path: null,
          suggestedName: fileName || 'document.md',
          content: data
        });
        if (!result.canceled && result.path && result.name) {
          nativeFilePathRef.current = result.path;
          setFilePath(result.path);
          setFileName(result.name);
          setSavedContent(content);
          setHasUnsavedChanges(false);
          toast.success(`Saved as ${result.name}`);
          return true;
        }
        return false;
      }

      if ('showSaveFilePicker' in window) {
        const pickerWindow = window as Window & {
          showSaveFilePicker: (options: {
            suggestedName: string;
            types: Array<{ description: string; accept: Record<string, string[]> }>;
          }) => Promise<FileSystemFileHandle>;
        };

        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName: fileName || 'document.md',
          types: [
            {
              description: 'Markdown files',
              accept: { 'text/markdown': ['.md', '.markdown', '.mdown'] }
            }
          ]
        });

        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();

        fileHandleRef.current = handle;
        setFileName(handle.name);
        setFilePath(handle.name);
        setSavedContent(content);
        setHasUnsavedChanges(false);
        toast.success(`Saved as ${handle.name}`);
        return true;
      }

      const fallbackName = fileName || 'document.md';
      const blob = new Blob([data], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setFileName(fallbackName);
      setFilePath(fallbackName);
      setSavedContent(content);
      setHasUnsavedChanges(false);
      toast.success(`Downloaded as ${fallbackName}`);
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return false;
      }
      setShowError(true);
      setErrorMessage('Failed to save file');
      toast.error('Failed to save file');
      return false;
    }
  };

  const handleContentChange = useCallback((newContent: string, nextCursorPosition: { line: number; col: number }) => {
    setContent(newContent);
    setCursorPosition(nextCursorPosition);
  }, []);

  const handleEditorSourceNavigate = useCallback((offset: number) => {
    previewRef.current?.scrollToSourceOffset(offset);
  }, []);

  const ensureEditorForSearch = () => {
    if (editorRef.current) {
      return true;
    }
    if (fileName && viewMode === 'preview') {
      setViewMode('split');
      return false;
    }
    return false;
  };

  const handleFindNext = () => {
    if (!findQuery.trim()) {
      return;
    }
    if (!ensureEditorForSearch()) {
      return;
    }
    const found = editorRef.current?.findNext(findQuery, findOptions);
    if (!found) {
      toast.info('No further matches found');
      setCurrentMatchIndex(-1);
      return;
    }
    setCurrentMatchIndex(editorRef.current?.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
  };

  const handleFindPrev = () => {
    if (!findQuery.trim()) {
      return;
    }
    if (!ensureEditorForSearch()) {
      return;
    }
    const found = editorRef.current?.findPrevious(findQuery, findOptions);
    if (!found) {
      toast.info('No previous matches found');
      setCurrentMatchIndex(-1);
      return;
    }
    setCurrentMatchIndex(editorRef.current?.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
  };

  const handleReplaceOne = () => {
    if (!findQuery.trim()) {
      return;
    }
    const replaced = editorRef.current?.replaceCurrent(findQuery, replaceQuery, findOptions);
    if (!replaced) {
      const found = editorRef.current?.findNext(findQuery, findOptions);
      if (!found) {
        toast.info('No matches to replace');
      }
      return;
    }
    void editorRef.current?.findNext(findQuery, findOptions);
    setCurrentMatchIndex(editorRef.current?.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
  };

  const handleReplaceAll = () => {
    if (!findQuery.trim()) {
      return;
    }
    const replacedCount = editorRef.current?.replaceAll(findQuery, replaceQuery, findOptions) ?? 0;
    if (replacedCount === 0) {
      toast.info('No matches to replace');
      return;
    }
    toast.success(`Replaced ${replacedCount} occurrence(s)`);
    setCurrentMatchIndex(-1);
  };

  const handleOpenSample = () => {
    nativeFilePathRef.current = null;
    applyOpenedFile('sample-document.md', 'sample-document.md', SAMPLE_MARKDOWN);
  };

  const handleExportPdf = async () => {
    if (!fileName) {
      toast.error('Open a document before exporting to PDF');
      return;
    }

    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi?.exportPdf || !mdStudioApi.confirmSaveBeforePdf) {
      toast.error('PDF export is available in the desktop app');
      return;
    }

    if (hasUnsavedChanges) {
      const response = await mdStudioApi.confirmSaveBeforePdf();
      if (response === 2) {
        return;
      }
      if (response === 0) {
        const saved = await handleSave();
        if (!saved) {
          toast.info('PDF export canceled');
          return;
        }
      }
    }

    setIsPdfExporting(true);
    document.documentElement.classList.add('md-studio-printing-pdf');
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    try {
      const suggested = suggestedPdfFileName(fileName);
      const result = await mdStudioApi.exportPdf({ suggestedFileName: suggested });
      if (result.canceled) {
        if (result.error) {
          toast.error(result.error);
        }
        return;
      }
      if (result.path) {
        toast.success(`PDF exported: ${result.path}`);
      }
    } finally {
      document.documentElement.classList.remove('md-studio-printing-pdf');
      setIsPdfExporting(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      nativeFilePathRef.current = null;
      applyOpenedFile(file.name, file.name, text);
    } catch {
      setShowError(true);
      setErrorMessage('Failed to read selected file');
      toast.error('Failed to read selected file');
    } finally {
      event.target.value = '';
    }
  };

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi?.setCloseState) {
      return;
    }
    mdStudioApi.setCloseState({
      hasUnsavedChanges,
      fileName,
      canOverwrite: Boolean(fileHandleRef.current || nativeFilePathRef.current)
    });
  }, [fileName, hasUnsavedChanges]);

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi?.onCloseSaveRequest || !mdStudioApi.reportCloseSaveResult) {
      return;
    }
    const unsubscribe = mdStudioApi.onCloseSaveRequest(async ({ requestId, mode }) => {
      const success = mode === 'saveAs' ? await handleSaveAs() : await handleSave();
      mdStudioApi.reportCloseSaveResult({ requestId, success });
    });
    return () => {
      unsubscribe();
    };
  }, [handleSave, handleSaveAs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (!fileName) {
          return;
        }
        setFindOpen(true);
        setFindFocusToken((prev) => prev + 1);
        return;
      }

      if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void handleOpen();
        return;
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (event.shiftKey) {
          void handleSaveAs();
          return;
        }
        void handleSave();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fileName, handleOpen, handleSave, handleSaveAs]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.mdown,text/markdown,text/plain"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <Toolbar
        theme={theme}
        onThemeToggle={handleThemeToggle}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportPdf={handleExportPdf}
        hasUnsavedChanges={hasUnsavedChanges}
        fileName={fileName}
        findOpen={findOpen}
        onToggleFind={() =>
          setFindOpen((prev) => {
            const next = !prev;
            if (next) {
              setFindFocusToken((token) => token + 1);
            }
            return next;
          })
        }
      />

      {findOpen && (
        <div className="border-b border-border bg-background px-2 sm:px-3 py-2 flex items-center gap-2 flex-wrap">
          <input
            ref={findInputRef}
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  handleFindPrev();
                } else {
                  handleFindNext();
                }
              }
            }}
            placeholder="Find"
            className="h-8 w-36 sm:w-44 px-2 text-sm rounded border border-border bg-background"
          />
          <span className="text-xs text-muted-foreground w-16 text-center">
            {searchState.isSearching ? '...' : totalMatches === 0 ? '0' : `${currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0}/${totalMatches}`}
          </span>
          <input
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  handleFindPrev();
                } else {
                  handleFindNext();
                }
              }
            }}
            placeholder="Replace"
            className="h-8 w-36 sm:w-44 px-2 text-sm rounded border border-border bg-background"
          />
          <button onClick={handleFindPrev} className="h-8 px-2 text-sm rounded hover:bg-accent">Prev</button>
          <button onClick={handleFindNext} className="h-8 px-2 text-sm rounded hover:bg-accent">Next</button>
          <button onClick={handleReplaceOne} className="h-8 px-2 text-sm rounded hover:bg-accent">Replace</button>
          <button onClick={handleReplaceAll} className="h-8 px-2 text-sm rounded hover:bg-accent">Replace All</button>
          <label className="ml-2 text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={caseSensitiveFind}
              onChange={(e) => setCaseSensitiveFind(e.target.checked)}
            />
            Case sensitive
          </label>
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={wholeWordFind}
              onChange={(e) => setWholeWordFind(e.target.checked)}
            />
            Whole word
          </label>
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={useRegexFind}
              onChange={(e) => setUseRegexFind(e.target.checked)}
            />
            Regex
          </label>
          <button
            type="button"
            aria-label="Close search"
            title="Close search"
            onClick={() => setFindOpen(false)}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {showError ? (
          <ErrorState
            onRetry={() => {
              setShowError(false);
              setErrorMessage('');
            }}
            errorMessage={errorMessage}
          />
        ) : !fileName ? (
          <EmptyState onOpen={handleOpen} onOpenSample={handleOpenSample} />
        ) : (
          <PanelGroup direction="horizontal" className="h-full min-h-0">
            {(viewMode === 'split' || viewMode === 'editor') && (
              <>
                <Panel defaultSize={50} minSize={30} className="h-full min-h-0">
                  <Editor
                    ref={editorRef}
                    value={content}
                    onChange={handleContentChange}
                    onCursorPositionChange={setCursorPosition}
                    showLineNumbers={true}
                    resetScrollToken={resetScrollToken}
                    splitPaneSync={viewMode === 'split'}
                    onSplitPaneSourceNavigate={handleEditorSourceNavigate}
                    findOpen={findOpen}
                    searchQuery={findQuery}
                    searchOptions={findOptions}
                    currentMatchIndex={currentMatchIndex}
                    workerMatches={searchState.matches}
                  />
                </Panel>
                {viewMode === 'split' && (
                  <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
                )}
              </>
            )}

            {(viewMode === 'split' || viewMode === 'preview') && (
              <Panel defaultSize={50} minSize={30} className="h-full min-h-0">
                <Preview
                  ref={previewRef}
                  content={deferredContent}
                  theme={theme}
                  filePath={filePath}
                  resetScrollToken={resetScrollToken}
                  assignPdfPrintRootId
                  splitPaneSync={viewMode === 'split'}
                  onSplitPanePreviewNavigate={(offset) => editorRef.current?.scrollToSourceOffset(offset)}
                  findOpen={findOpen}
                  searchQuery={findQuery}
                  searchOptions={findOptions}
                  currentMatchIndex={currentMatchIndex}
                />
              </Panel>
            )}
          </PanelGroup>
        )}

        {fileName && viewMode === 'editor' && isPdfExporting && (
          <div
            className="fixed -left-[10000px] top-0 h-[1200px] w-[1024px] overflow-hidden opacity-0 pointer-events-none"
            aria-hidden
          >
            <Preview
              content={deferredContent}
              theme={theme}
              filePath={filePath}
              resetScrollToken={resetScrollToken}
              assignPdfPrintRootId
              findOpen={false}
              searchQuery=""
              searchOptions={findOptions}
              currentMatchIndex={-1}
            />
          </div>
        )}
      </div>

      <StatusBar
        filePath={filePath}
        hasUnsavedChanges={hasUnsavedChanges}
        lineNumber={cursorPosition.line}
        columnNumber={cursorPosition.col}
        encoding="UTF-8"
        lineEnding={lineEnding}
      />

      <Toaster theme={theme} />
    </div>
  );
}