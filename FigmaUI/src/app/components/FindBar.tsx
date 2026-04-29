import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface FindBarProps {
  findOpen: boolean;
  focusToken: number;
  totalMatches: number;
  currentMatchIndex: number;
  isSearching: boolean;
  onQueryChange: (query: string) => void;
  onReplaceQueryChange: (query: string) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
  onCaseSensitiveChange: (value: boolean) => void;
  onWholeWordChange: (value: boolean) => void;
  onRegexChange: (value: boolean) => void;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

const DEBOUNCE_MS = 150;

export const FindBar = memo(function FindBar({
  findOpen,
  focusToken,
  totalMatches,
  currentMatchIndex,
  isSearching,
  onQueryChange,
  onReplaceQueryChange,
  onFindNext,
  onFindPrev,
  onReplaceOne,
  onReplaceAll,
  onClose,
  onCaseSensitiveChange,
  onWholeWordChange,
  onRegexChange,
  caseSensitive,
  wholeWord,
  useRegex,
}: FindBarProps) {
  const [localQuery, setLocalQuery] = useState('');
  const [localReplace, setLocalReplace] = useState('');
  const findInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (findOpen) {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }
  }, [findOpen, focusToken]);

  useEffect(() => {
    if (!findOpen) {
      setLocalQuery('');
      setLocalReplace('');
      onQueryChange('');
    }
  }, [findOpen, onQueryChange]);

  const handleQueryInput = useCallback((value: string) => {
    setLocalQuery(value);
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onQueryChange(value);
    }, DEBOUNCE_MS);
  }, [onQueryChange]);

  const handleReplaceInput = useCallback((value: string) => {
    setLocalReplace(value);
    onReplaceQueryChange(value);
  }, [onReplaceQueryChange]);

  const handleFindKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        onQueryChange(localQuery);
      }
      if (e.shiftKey) {
        onFindPrev();
      } else {
        onFindNext();
      }
    }
  }, [localQuery, onFindNext, onFindPrev, onQueryChange]);

  const handleReplaceKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFindPrev();
      } else {
        onFindNext();
      }
    }
  }, [onFindNext, onFindPrev]);

  if (!findOpen) return null;

  return (
    <div className="border-b border-border bg-background px-2 sm:px-3 py-2 flex items-center gap-2 flex-wrap">
      <input
        ref={findInputRef}
        value={localQuery}
        onChange={(e) => handleQueryInput(e.target.value)}
        onKeyDown={handleFindKeyDown}
        placeholder="Find"
        className="h-8 w-36 sm:w-44 px-2 text-sm rounded border border-border bg-background"
      />
      <span className="text-xs text-muted-foreground w-16 text-center">
        {isSearching ? '...' : totalMatches === 0 ? '0' : `${currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0}/${totalMatches}`}
      </span>
      <input
        value={localReplace}
        onChange={(e) => handleReplaceInput(e.target.value)}
        onKeyDown={handleReplaceKeyDown}
        placeholder="Replace"
        className="h-8 w-36 sm:w-44 px-2 text-sm rounded border border-border bg-background"
      />
      <button onClick={onFindPrev} className="h-8 px-2 text-sm rounded hover:bg-accent">Prev</button>
      <button onClick={onFindNext} className="h-8 px-2 text-sm rounded hover:bg-accent">Next</button>
      <button onClick={onReplaceOne} className="h-8 px-2 text-sm rounded hover:bg-accent">Replace</button>
      <button onClick={onReplaceAll} className="h-8 px-2 text-sm rounded hover:bg-accent">Replace All</button>
      <label className="ml-2 text-xs flex items-center gap-1">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(e) => onCaseSensitiveChange(e.target.checked)}
        />
        Case sensitive
      </label>
      <label className="text-xs flex items-center gap-1">
        <input
          type="checkbox"
          checked={wholeWord}
          onChange={(e) => onWholeWordChange(e.target.checked)}
        />
        Whole word
      </label>
      <label className="text-xs flex items-center gap-1">
        <input
          type="checkbox"
          checked={useRegex}
          onChange={(e) => onRegexChange(e.target.checked)}
        />
        Regex
      </label>
      <button
        type="button"
        aria-label="Close search"
        title="Close search"
        onClick={onClose}
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});
