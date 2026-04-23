import {
  FolderOpen,
  Save,
  Moon,
  Sun,
  Columns2,
  FileEdit,
  Eye,
  Search,
  Minimize2,
  Maximize2,
  X
} from 'lucide-react';

interface ToolbarProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  viewMode: 'split' | 'editor' | 'preview';
  onViewModeChange: (mode: 'split' | 'editor' | 'preview') => void;
  onOpen: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onSaveAs: () => void | Promise<void>;
  hasUnsavedChanges: boolean;
  fileName: string;
  findOpen: boolean;
  onToggleFind: () => void;
}

export function Toolbar({
  theme,
  onThemeToggle,
  viewMode,
  onViewModeChange,
  onOpen,
  onSave,
  onSaveAs,
  hasUnsavedChanges,
  fileName,
  findOpen,
  onToggleFind
}: ToolbarProps) {
  return (
    <div className="h-12 border-b border-border bg-background flex items-center justify-between px-2 sm:px-4 gap-2 sm:gap-4 overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-primary" />
          <span className="font-semibold hidden sm:inline">MD Studio</span>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => void onOpen()}
            className="px-3 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2"
            title="Open file (Ctrl+O)"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="text-sm hidden lg:inline">Open</span>
          </button>
          <button
            onClick={() => void onSave()}
            className="px-3 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50"
            disabled={!hasUnsavedChanges}
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm hidden lg:inline">Save</span>
          </button>
          <button
            onClick={() => void onSaveAs()}
            className="px-2 sm:px-3 py-1.5 rounded hover:bg-accent transition-colors text-sm hidden sm:inline"
            title="Save As (Ctrl+Shift+S)"
          >
            Save As
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-4 min-w-0">
        <div className="flex items-center gap-1 bg-muted rounded p-1">
          <button
            onClick={() => onViewModeChange('split')}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              viewMode === 'split' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            }`}
            title="Split view"
          >
            <Columns2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('editor')}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              viewMode === 'editor' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            }`}
            title="Editor only"
          >
            <FileEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('preview')}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              viewMode === 'preview' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            }`}
            title="Preview only"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onThemeToggle}
          className="p-2 rounded hover:bg-accent transition-colors"
          title="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onToggleFind}
          className={`p-2 rounded transition-colors ${findOpen ? 'bg-accent' : 'hover:bg-accent'}`}
          title="Find and replace"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-border" />

        <div className="text-sm text-muted-foreground max-w-36 lg:max-w-48 truncate hidden md:block" title={fileName}>
          {fileName || 'No file open'}
        </div>

        <div className="h-6 w-px bg-border hidden md:block" />

        <div className="hidden md:flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-accent transition-colors" title="Minimize">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-accent transition-colors" title="Maximize">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
