import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  onRetry: () => void;
  errorMessage?: string;
}

export function ErrorState({ onRetry, errorMessage = 'Failed to load file' }: ErrorStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-8">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h2 className="mb-2 text-foreground">Error</h2>
        <p className="text-sm text-muted-foreground mb-2">
          {errorMessage}
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          The file may be locked, corrupted, or you may not have permission to access it.
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <div className="mt-6 text-xs text-muted-foreground">
          <p className="font-mono bg-muted px-3 py-2 rounded">
            Error: EACCES: permission denied
          </p>
        </div>
      </div>
    </div>
  );
}
