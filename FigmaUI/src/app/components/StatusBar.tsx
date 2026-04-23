import { Circle } from 'lucide-react';

interface StatusBarProps {
  filePath: string;
  hasUnsavedChanges: boolean;
  lineNumber: number;
  columnNumber: number;
  encoding?: string;
  lineEnding?: string;
}

export function StatusBar({
  filePath,
  hasUnsavedChanges,
  lineNumber,
  columnNumber,
  encoding = 'UTF-8',
  lineEnding = 'LF'
}: StatusBarProps) {
  const truncatedPath = filePath.length > 60
    ? '...' + filePath.slice(-57)
    : filePath;

  return (
    <div className="h-7 border-t border-border bg-accent/30 flex items-center justify-between px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="font-mono">{truncatedPath || 'No file open'}</span>
        {hasUnsavedChanges && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Circle className="w-2 h-2 fill-current" />
            Unsaved changes
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span>Ln {lineNumber}, Col {columnNumber}</span>
        <span>{encoding}</span>
        <span>{lineEnding}</span>
      </div>
    </div>
  );
}
