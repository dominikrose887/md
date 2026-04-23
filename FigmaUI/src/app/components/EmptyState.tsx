import { FileText, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  onOpen: () => void | Promise<void>;
  onOpenSample: () => void;
}

export function EmptyState({ onOpen, onOpenSample }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-8">
        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="mb-2 text-foreground">No file open</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Open a Markdown file to start editing and previewing
        </p>
        <div className="inline-flex gap-2">
          <button
            onClick={() => void onOpen()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Open File
          </button>
          <button
            onClick={onOpenSample}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/80 transition-colors"
          >
            Open Sample
          </button>
        </div>
        <div className="mt-8 text-xs text-muted-foreground">
          <p>Or use keyboard shortcuts:</p>
          <p className="mt-1">
            <kbd className="px-2 py-1 bg-muted rounded text-foreground">Ctrl+O</kbd> to open
          </p>
        </div>
      </div>
    </div>
  );
}
