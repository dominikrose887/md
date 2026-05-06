import { useState, useEffect, useRef, useDeferredValue, useMemo, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Toolbar } from './components/Toolbar';
import { Editor, type EditorHandle, type FindOptions } from './components/Editor';
import { Preview, type PreviewHandle } from './components/Preview';
import { FindBar } from './components/FindBar';
import { StatusBar } from './components/StatusBar';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { TabStrip, type TabItem } from './components/TabStrip';
import { SAMPLE_MARKDOWN } from './components/SampleContent';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { suggestedPdfFileName } from '@/utils/pdf';
import { useSearchWorker } from './hooks/useSearchWorker';

type FsHandle = FileSystemFileHandle | null;
const THEME_STORAGE_KEY = 'mdstudio:theme';
type LineEnding = 'LF' | 'CRLF';

interface OpenTab {
  id: string;
  fileName: string;
  filePath: string;
  displayName: string;
  content: string;
  savedContent: string;
  lineEnding: LineEnding;
  cursorPosition: { line: number; col: number };
  fileHandle: FsHandle;
  nativeFilePath: string | null;
  diskVersion: string | null;
  syncState: 'clean' | 'externallyChanged' | 'conflict';
  externalContent?: string;
}

const detectLineEnding = (text: string): LineEnding => (text.includes('\r\n') ? 'CRLF' : 'LF');
const normalizeToLf = (text: string): string => text.replace(/\r\n/g, '\n');
const makeTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('preview');
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const watchedPathsRef = useRef<Set<string>>(new Set());
  const tabsRef = useRef<OpenTab[]>([]);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [tabs, activeTabId]);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  const deferredContent = useDeferredValue(activeTab?.content ?? '');
  const hasUnsavedChanges = activeTab ? activeTab.content !== activeTab.savedContent : false;
  const hasAnyUnsaved = tabs.some((tab) => tab.content !== tab.savedContent);
  const fileName = activeTab?.fileName ?? '';
  const filePath = activeTab?.filePath ?? '';
  const cursorPosition = activeTab?.cursorPosition ?? { line: 1, col: 1 };
  const lineEnding: LineEnding = activeTab?.lineEnding ?? 'LF';

  const findOptions: FindOptions = useMemo(
    () => ({ caseSensitive: caseSensitiveFind, useRegex: useRegexFind, wholeWord: wholeWordFind }),
    [caseSensitiveFind, useRegexFind, wholeWordFind]
  );
  const searchState = useSearchWorker(activeTab?.content ?? '', findQuery, findOptions, findOpen);
  const totalMatches = searchState.totalCount;

  const tabItems: TabItem[] = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        title: tab.displayName || tab.fileName || 'Untitled',
        path: tab.filePath,
        unsaved: tab.content !== tab.savedContent,
        conflict: tab.syncState === 'conflict'
      })),
    [tabs]
  );

  const updateTab = useCallback((tabId: string, updater: (tab: OpenTab) => OpenTab) => {
    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? updater(tab) : tab)));
  }, []);

  const upsertOpenedFile = useCallback(
    (
      name: string,
      fullPath: string,
      text: string,
      handle: FsHandle = null,
      nativePath: string | null = null,
      version: string | null = null
    ) => {
      const normalized = normalizeToLf(text);
      const resolvedPath = fullPath || name;
      let activatedTabId: string | null = null;

      setTabs((prev) => {
        const existing = prev.find((tab) => tab.filePath === resolvedPath);
        if (existing) {
          activatedTabId = existing.id;
          return prev.map((tab) =>
            tab.id === existing.id
              ? {
                  ...tab,
                  fileName: name,
                  filePath: resolvedPath,
                  content: normalized,
                  savedContent: normalized,
                  lineEnding: detectLineEnding(text),
                  fileHandle: handle,
                  nativeFilePath: nativePath,
                  diskVersion: version,
                  syncState: 'clean',
                  externalContent: undefined
                }
              : tab
          );
        }
        const nextTab: OpenTab = {
          id: makeTabId(),
          fileName: name,
          filePath: resolvedPath,
          displayName: name,
          content: normalized,
          savedContent: normalized,
          lineEnding: detectLineEnding(text),
          cursorPosition: { line: 1, col: 1 },
          fileHandle: handle,
          nativeFilePath: nativePath,
          diskVersion: version,
          syncState: 'clean'
        };
        activatedTabId = nextTab.id;
        return [...prev, nextTab];
      });

      if (activatedTabId) {
        setActiveTabId(activatedTabId);
      }
      setShowError(false);
      setResetScrollToken((prev) => prev + 1);
      toast.success('File opened successfully');
    },
    []
  );

  const serializeForSave = useCallback((tab: OpenTab) => {
    return tab.lineEnding === 'CRLF' ? tab.content.replace(/\n/g, '\r\n') : tab.content;
  }, []);

  const handleSave = useCallback(
    async (tabId = activeTabId): Promise<boolean> => {
      if (!tabId) return false;
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return false;
      try {
        const data = serializeForSave(tab);
        const mdStudioApi = window.mdStudio;
        if (mdStudioApi) {
          const result = await mdStudioApi.saveFile({
            path: tab.nativeFilePath,
            suggestedName: tab.fileName || 'document.md',
            content: data,
            expectedVersion: tab.diskVersion
          });
          if (result.conflict) {
            updateTab(tab.id, (current) => ({
              ...current,
              syncState: 'conflict',
              externalContent: result.content ?? current.externalContent,
              diskVersion: result.version ?? current.diskVersion
            }));
            const reloadFromDisk = window.confirm(
              `The file "${tab.displayName}" changed on disk.\n\nPress OK to reload external changes.\nPress Cancel to keep your local edits.`
            );
            if (reloadFromDisk) {
              const incoming = normalizeToLf(result.content ?? '');
              updateTab(tab.id, (current) => ({
                ...current,
                content: incoming,
                savedContent: incoming,
                lineEnding: detectLineEnding(result.content ?? ''),
                syncState: 'clean',
                externalContent: undefined,
                diskVersion: result.version ?? current.diskVersion
              }));
              toast.info('Reloaded changed file from disk');
            } else {
              toast.warning('Save canceled due to external conflict');
            }
            return false;
          }
          if (!result.canceled && result.path && result.name) {
            updateTab(tab.id, (current) => ({
              ...current,
              nativeFilePath: result.path ?? current.nativeFilePath,
              fileName: result.name ?? current.fileName,
              filePath: result.path ?? current.filePath,
              displayName: result.name ?? current.displayName,
              savedContent: current.content,
              diskVersion: result.version ?? current.diskVersion,
              syncState: 'clean',
              externalContent: undefined
            }));
            toast.success('File saved successfully');
            return true;
          }
          return false;
        }

        if (tab.fileHandle) {
          const writable = await tab.fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
          updateTab(tab.id, (current) => ({
            ...current,
            savedContent: current.content,
            syncState: 'clean',
            externalContent: undefined
          }));
          toast.success('File saved successfully');
          return true;
        }

        const blob = new Blob([data], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = tab.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        updateTab(tab.id, (current) => ({
          ...current,
          savedContent: current.content,
          syncState: 'clean',
          externalContent: undefined
        }));
        toast.success('File downloaded (browser fallback)');
        return true;
      } catch {
        setShowError(true);
        setErrorMessage('Failed to save file');
        toast.error('Failed to save file');
        return false;
      }
    },
    [activeTabId, serializeForSave, tabs, updateTab]
  );

  const handleSaveAs = useCallback(
    async (tabId = activeTabId): Promise<boolean> => {
      if (!tabId) return false;
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return false;
      try {
        const data = serializeForSave(tab);
        const mdStudioApi = window.mdStudio;
        if (mdStudioApi) {
          const result = await mdStudioApi.saveFile({ path: null, suggestedName: tab.fileName || 'document.md', content: data });
          if (!result.canceled && result.path && result.name) {
            updateTab(tab.id, (current) => ({
              ...current,
              nativeFilePath: result.path,
              fileName: result.name,
              filePath: result.path,
              displayName: result.name,
              savedContent: current.content,
              diskVersion: result.version ?? current.diskVersion,
              syncState: 'clean',
              externalContent: undefined
            }));
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
            suggestedName: tab.fileName || 'document.md',
            types: [{ description: 'Markdown files', accept: { 'text/markdown': ['.md', '.markdown', '.mdown'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(data);
          await writable.close();
          updateTab(tab.id, (current) => ({
            ...current,
            fileHandle: handle,
            fileName: handle.name,
            filePath: handle.name,
            displayName: handle.name,
            savedContent: current.content,
            diskVersion: null,
            syncState: 'clean',
            externalContent: undefined
          }));
          toast.success(`Saved as ${handle.name}`);
          return true;
        }

        const fallbackName = tab.fileName || 'document.md';
        const blob = new Blob([data], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fallbackName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        updateTab(tab.id, (current) => ({
          ...current,
          fileName: fallbackName,
          filePath: fallbackName,
          displayName: fallbackName,
          savedContent: current.content,
          diskVersion: null,
          syncState: 'clean',
          externalContent: undefined
        }));
        toast.success(`Downloaded as ${fallbackName}`);
        return true;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return false;
        setShowError(true);
        setErrorMessage('Failed to save file');
        toast.error('Failed to save file');
        return false;
      }
    },
    [activeTabId, serializeForSave, tabs, updateTab]
  );

  const resolveCloseUnsavedTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab || tab.content === tab.savedContent) {
        return true;
      }
      const wantsSave = window.confirm(`"${tab.displayName}" has unsaved changes.\n\nPress OK to Save before closing.\nPress Cancel for more options.`);
      if (wantsSave) {
        return handleSave(tabId);
      }
      const wantsDiscard = window.confirm(`Discard unsaved changes for "${tab.displayName}" and close this tab?\n\nPress Cancel to keep the tab open.`);
      return wantsDiscard;
    },
    [handleSave, tabs]
  );

  const closeTabById = useCallback(
    async (tabId: string) => {
      const canClose = await resolveCloseUnsavedTab(tabId);
      if (!canClose) return;
      setTabs((prev) => {
        const idx = prev.findIndex((tab) => tab.id === tabId);
        if (idx < 0) return prev;
        const next = prev.filter((tab) => tab.id !== tabId);
        if (activeTabId === tabId) {
          const nextActive = next[idx] ?? next[idx - 1] ?? null;
          setActiveTabId(nextActive?.id ?? null);
        }
        return next;
      });
      setCurrentMatchIndex(-1);
    },
    [activeTabId, resolveCloseUnsavedTab]
  );

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleViewModeChange = (nextMode: 'split' | 'editor' | 'preview') => {
    const currentPreviewTop = previewRef.current?.getScrollTop() ?? 0;
    if (nextMode === 'preview' && findOpen) setFindOpen(false);
    setViewMode(nextMode);
    if (nextMode === 'preview') {
      requestAnimationFrame(() => requestAnimationFrame(() => previewRef.current?.setScrollTop(currentPreviewTop)));
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
          upsertOpenedFile(result.name, result.path, result.content, null, result.path, result.version ?? null);
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
          types: [{ description: 'Markdown files', accept: { 'text/markdown': ['.md', '.markdown', '.mdown'] } }]
        });
        if (!handle) return;
        const file = await handle.getFile();
        const text = await file.text();
        upsertOpenedFile(file.name, handle.name, text, handle, null, null);
        return;
      }
      fileInputRef.current?.click();
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setShowError(true);
      setErrorMessage('Failed to open file');
      toast.error('Failed to open file');
    }
  };

  const handleContentChange = useCallback(
    (newContent: string, nextCursorPosition: { line: number; col: number }) => {
      if (!activeTabId) return;
      updateTab(activeTabId, (tab) => ({ ...tab, content: newContent, cursorPosition: nextCursorPosition }));
    },
    [activeTabId, updateTab]
  );

  const handleEditorSourceNavigate = useCallback((offset: number) => {
    previewRef.current?.scrollToSourceOffset(offset);
  }, []);

  const handlePreviewSourceNavigate = useCallback((offset: number) => {
    editorRef.current?.scrollToSourceOffset(offset);
  }, []);

  const ensureEditorForSearch = () => {
    if (editorRef.current) return true;
    if (activeTab && viewMode === 'preview') {
      setViewMode('split');
      return false;
    }
    return false;
  };

  const handleCloseFindBar = useCallback(() => {
    setFindOpen(false);
    setFindQuery('');
  }, []);

  const handleFindNext = () => {
    if (!findQuery.trim()) return;
    if (!ensureEditorForSearch()) return;
    const found = editorRef.current?.findNext(findQuery, findOptions);
    if (!found) {
      toast.info('No further matches found');
      setCurrentMatchIndex(-1);
      return;
    }
    setCurrentMatchIndex(editorRef.current?.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
  };

  const handleFindPrev = () => {
    if (!findQuery.trim()) return;
    if (!ensureEditorForSearch()) return;
    const found = editorRef.current?.findPrevious(findQuery, findOptions);
    if (!found) {
      toast.info('No previous matches found');
      setCurrentMatchIndex(-1);
      return;
    }
    setCurrentMatchIndex(editorRef.current?.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
  };

  const handleReplaceOne = () => {
    if (!findQuery.trim()) return;
    const replaced = editorRef.current?.replaceCurrent(findQuery, replaceQuery, findOptions);
    if (!replaced) {
      const found = editorRef.current?.findNext(findQuery, findOptions);
      if (!found) toast.info('No matches to replace');
      return;
    }
    void editorRef.current?.findNext(findQuery, findOptions);
    setCurrentMatchIndex(editorRef.current?.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
  };

  const handleReplaceAll = () => {
    if (!findQuery.trim()) return;
    const replacedCount = editorRef.current?.replaceAll(findQuery, replaceQuery, findOptions) ?? 0;
    if (replacedCount === 0) {
      toast.info('No matches to replace');
      return;
    }
    toast.success(`Replaced ${replacedCount} occurrence(s)`);
    setCurrentMatchIndex(-1);
  };

  const handleOpenSample = () => {
    upsertOpenedFile('sample-document.md', 'sample-document.md', SAMPLE_MARKDOWN);
  };

  const handleExportPdf = async () => {
    if (!activeTab) {
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
      if (response === 2) return;
      if (response === 0) {
        const saved = await handleSave(activeTab.id);
        if (!saved) {
          toast.info('PDF export canceled');
          return;
        }
      }
    }
    setIsPdfExporting(true);
    document.documentElement.classList.add('md-studio-printing-pdf');
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const suggested = suggestedPdfFileName(activeTab.fileName);
      const result = await mdStudioApi.exportPdf({ suggestedFileName: suggested });
      if (result.canceled) {
        if (result.error) toast.error(result.error);
        return;
      }
      if (result.path) toast.success(`PDF exported: ${result.path}`);
    } finally {
      document.documentElement.classList.remove('md-studio-printing-pdf');
      setIsPdfExporting(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      upsertOpenedFile(file.name, file.name, text);
    } catch {
      setShowError(true);
      setErrorMessage('Failed to read selected file');
      toast.error('Failed to read selected file');
    } finally {
      event.target.value = '';
    }
  };

  const applyIncomingDiskVersion = useCallback(
    (tabId: string, diskText: string, version: string | null) => {
      const incoming = normalizeToLf(diskText);
      updateTab(tabId, (tab) => {
        const dirty = tab.content !== tab.savedContent;
        if (!dirty) {
          if (incoming === tab.savedContent) {
            return { ...tab, diskVersion: version };
          }
          return {
            ...tab,
            content: incoming,
            savedContent: incoming,
            lineEnding: detectLineEnding(diskText),
            diskVersion: version,
            syncState: 'clean',
            externalContent: undefined
          };
        }

        if (incoming === tab.savedContent) {
          return { ...tab, diskVersion: version };
        }

        return {
          ...tab,
          diskVersion: version,
          syncState: 'conflict',
          externalContent: incoming
        };
      });
    },
    [updateTab]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (window.mdStudio) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasAnyUnsaved) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyUnsaved]);

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi) return;
    const loadFilePath = async (filePathArg: string) => {
      try {
        const result = await mdStudioApi.readFile(filePathArg);
        if (!result.canceled && result.path && result.name && result.content != null) {
          upsertOpenedFile(result.name, result.path, result.content, null, result.path, result.version ?? null);
        }
      } catch {
        setShowError(true);
        setErrorMessage('Failed to open external file');
      }
    };
    void mdStudioApi.getLaunchFile().then((launchPath) => {
      if (launchPath) void loadFilePath(launchPath);
    });
    const unsubscribe = mdStudioApi.onOpenFilePath((pathArg) => {
      void loadFilePath(pathArg);
    });
    return () => unsubscribe();
  }, [upsertOpenedFile]);

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi?.watchFile || !mdStudioApi?.unwatchFile) {
      return;
    }
    const nextPaths = new Set(
      tabs
        .map((tab) => tab.nativeFilePath)
        .filter((value): value is string => Boolean(value))
    );
    const prevPaths = watchedPathsRef.current;

    for (const path of nextPaths) {
      if (!prevPaths.has(path)) {
        void mdStudioApi.watchFile(path);
      }
    }
    for (const path of prevPaths) {
      if (!nextPaths.has(path)) {
        void mdStudioApi.unwatchFile(path);
      }
    }
    watchedPathsRef.current = nextPaths;
  }, [tabs]);

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi?.onFileChanged) {
      return;
    }
    const unsubscribe = mdStudioApi.onFileChanged(({ path }) => {
      const targetTab = tabsRef.current.find((tab) => tab.nativeFilePath === path);
      if (!targetTab) {
        return;
      }
      void mdStudioApi.readFile(path).then((result) => {
        if (result.canceled || result.content == null) {
          return;
        }
        const before = tabsRef.current.find((tab) => tab.id === targetTab.id);
        applyIncomingDiskVersion(targetTab.id, result.content, result.version ?? null);
        if (!before) {
          return;
        }
        const wasDirty = before.content !== before.savedContent;
        const normalizedIncoming = normalizeToLf(result.content);
        if (!wasDirty && normalizedIncoming !== before.savedContent) {
          toast.info(`Reloaded "${before.displayName}" from disk`);
        }
        if (wasDirty && normalizedIncoming !== before.savedContent) {
          toast.warning(`Conflict detected in "${before.displayName}"`);
        }
      });
    });
    return () => unsubscribe();
  }, [applyIncomingDiskVersion]);

  useEffect(() => {
    return () => {
      const mdStudioApi = window.mdStudio;
      if (!mdStudioApi?.unwatchFile) {
        return;
      }
      for (const watchedPath of watchedPathsRef.current) {
        void mdStudioApi.unwatchFile(watchedPath);
      }
      watchedPathsRef.current = new Set();
    };
  }, []);

  useEffect(() => {
    setCurrentMatchIndex(-1);
    setResetScrollToken((prev) => prev + 1);
  }, [activeTabId]);

  useEffect(() => {
    if (!findOpen || !findQuery.trim() || searchState.totalCount === 0) {
      setCurrentMatchIndex(-1);
      previewRef.current?.updateSearchHighlights(findQuery, findOptions, findOpen);
      return;
    }
    if (!editorRef.current) return;
    setCurrentMatchIndex(editorRef.current.getCurrentMatchIndex(findQuery, findOptions) ?? -1);
    previewRef.current?.updateSearchHighlights(findQuery, findOptions, findOpen);
  }, [searchState.totalCount, findOpen, findOptions, findQuery, activeTabId]);

  useEffect(() => {
    if (!findOpen || !findQuery.trim() || currentMatchIndex < 0) return;
    previewRef.current?.scrollToSearchMatch(currentMatchIndex);
    previewRef.current?.syncActiveHighlight(currentMatchIndex);
  }, [currentMatchIndex, findOpen, findQuery]);

  useEffect(() => {
    if (!findOpen || !fileName || viewMode !== 'preview') return;
    setFindOpen(false);
  }, [fileName, findOpen, viewMode]);

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi?.setCloseState) return;
    mdStudioApi.setCloseState({
      hasUnsavedChanges: hasAnyUnsaved,
      fileName: fileName || 'Multiple tabs',
      canOverwrite: Boolean(activeTab?.fileHandle || activeTab?.nativeFilePath)
    });
  }, [activeTab, fileName, hasAnyUnsaved]);

  useEffect(() => {
    const mdStudioApi = window.mdStudio;
    if (!mdStudioApi?.onCloseSaveRequest || !mdStudioApi.reportCloseSaveResult) return;
    const unsubscribe = mdStudioApi.onCloseSaveRequest(async ({ requestId, mode }) => {
      const success = mode === 'saveAs' ? await handleSaveAs() : await handleSave();
      mdStudioApi.reportCloseSaveResult({ requestId, success });
    });
    return () => unsubscribe();
  }, [handleSave, handleSaveAs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (!activeTab) return;
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
  }, [activeTab, handleSave, handleSaveAs]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <input ref={fileInputRef} type="file" accept=".md,.markdown,.mdown,text/markdown,text/plain" className="hidden" onChange={handleFileInputChange} />
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
            if (next) setFindFocusToken((token) => token + 1);
            return next;
          })
        }
      />
      <TabStrip
        tabs={tabItems}
        activeTabId={activeTabId}
        onActivateTab={setActiveTabId}
        onCloseTab={(tabId) => void closeTabById(tabId)}
        onCloseOthers={(tabId) => {
          const keep = tabs.find((t) => t.id === tabId);
          if (!keep) return;
          const others = tabs.filter((t) => t.id !== tabId);
          const closeSequential = async () => {
            for (const tab of others) {
              const canClose = await resolveCloseUnsavedTab(tab.id);
              if (!canClose) return;
            }
            setTabs([keep]);
            setActiveTabId(tabId);
          };
          void closeSequential();
        }}
        onCloseRight={(tabId) => {
          const index = tabs.findIndex((t) => t.id === tabId);
          if (index < 0) return;
          const rightTabs = tabs.slice(index + 1);
          const closeSequential = async () => {
            for (const tab of rightTabs) {
              const canClose = await resolveCloseUnsavedTab(tab.id);
              if (!canClose) return;
            }
            setTabs((prev) => prev.filter((_, i) => i <= index));
          };
          void closeSequential();
        }}
        onRenameTab={(tabId) => {
          const tab = tabs.find((item) => item.id === tabId);
          if (!tab) return;
          const nextTitle = window.prompt('Rename tab', tab.displayName)?.trim();
          if (!nextTitle) return;
          updateTab(tabId, (current) => ({ ...current, displayName: nextTitle }));
        }}
        onReorderTabs={(fromTabId, toTabId) => {
          if (fromTabId === toTabId) return;
          setTabs((prev) => {
            const fromIndex = prev.findIndex((tab) => tab.id === fromTabId);
            const toIndex = prev.findIndex((tab) => tab.id === toTabId);
            if (fromIndex < 0 || toIndex < 0) return prev;
            const copy = [...prev];
            const [moved] = copy.splice(fromIndex, 1);
            copy.splice(toIndex, 0, moved);
            return copy;
          });
        }}
      />
      <FindBar
        findOpen={findOpen}
        focusToken={findFocusToken}
        totalMatches={totalMatches}
        currentMatchIndex={currentMatchIndex}
        isSearching={searchState.isSearching}
        onQueryChange={setFindQuery}
        onReplaceQueryChange={setReplaceQuery}
        onFindNext={handleFindNext}
        onFindPrev={handleFindPrev}
        onReplaceOne={handleReplaceOne}
        onReplaceAll={handleReplaceAll}
        onClose={handleCloseFindBar}
        onCaseSensitiveChange={setCaseSensitiveFind}
        onWholeWordChange={setWholeWordFind}
        onRegexChange={setUseRegexFind}
        caseSensitive={caseSensitiveFind}
        wholeWord={wholeWordFind}
        useRegex={useRegexFind}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {showError ? (
          <ErrorState onRetry={() => { setShowError(false); setErrorMessage(''); }} errorMessage={errorMessage} />
        ) : !activeTab ? (
          <EmptyState onOpen={handleOpen} onOpenSample={handleOpenSample} />
        ) : (
          <PanelGroup direction="horizontal" className="h-full min-h-0">
            {(viewMode === 'split' || viewMode === 'editor') && (
              <>
                <Panel defaultSize={50} minSize={30} className="h-full min-h-0">
                  <Editor
                    ref={editorRef}
                    documentId={activeTab.id}
                    value={activeTab.content}
                    onChange={handleContentChange}
                    onCursorPositionChange={(pos) => updateTab(activeTab.id, (tab) => ({ ...tab, cursorPosition: pos }))}
                    showLineNumbers={true}
                    resetScrollToken={resetScrollToken}
                    splitPaneSync={viewMode === 'split'}
                    onSplitPaneSourceNavigate={handleEditorSourceNavigate}
                    findOpen={findOpen}
                    searchOptions={findOptions}
                    currentMatchIndex={currentMatchIndex}
                    workerMatches={searchState.matches}
                  />
                </Panel>
                {viewMode === 'split' && <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />}
              </>
            )}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <Panel defaultSize={50} minSize={30} className="h-full min-h-0">
                <Preview
                  ref={previewRef}
                  content={deferredContent}
                  theme={theme}
                  filePath={activeTab.filePath}
                  resetScrollToken={resetScrollToken}
                  assignPdfPrintRootId
                  splitPaneSync={viewMode === 'split'}
                  onSplitPanePreviewNavigate={handlePreviewSourceNavigate}
                  findOpen={findOpen}
                  searchQuery={findQuery}
                  searchOptions={findOptions}
                  currentMatchIndex={currentMatchIndex}
                />
              </Panel>
            )}
          </PanelGroup>
        )}
        {activeTab && viewMode === 'editor' && isPdfExporting && (
          <div className="fixed -left-[10000px] top-0 h-[1200px] w-[1024px] overflow-hidden opacity-0 pointer-events-none" aria-hidden>
            <Preview
              content={deferredContent}
              theme={theme}
              filePath={activeTab.filePath}
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
      <StatusBar filePath={filePath} hasUnsavedChanges={hasUnsavedChanges} lineNumber={cursorPosition.line} columnNumber={cursorPosition.col} encoding="UTF-8" lineEnding={lineEnding} />
      <Toaster theme={theme} />
    </div>
  );
}