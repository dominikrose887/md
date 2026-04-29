import { useEffect, useRef, useState, useCallback } from 'react';
import type { FindOptions } from '../components/Editor';

interface SearchMatch {
  index: number;
  length: number;
}

interface SearchState {
  matches: SearchMatch[];
  totalCount: number;
  isSearching: boolean;
}

const DEBOUNCE_MS = 150;

export function useSearchWorker(
  content: string,
  query: string,
  options: FindOptions,
  findOpen: boolean
): SearchState {
  const [state, setState] = useState<SearchState>({
    matches: [],
    totalCount: 0,
    isSearching: false,
  });

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevQueryRef = useRef<string>('');
  const prevMatchesRef = useRef<SearchMatch[]>([]);
  const contentVersionRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/search.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<{ id: number; matches: SearchMatch[]; totalCount: number }>) => {
      const { id, matches, totalCount } = e.data;
      if (id === requestIdRef.current) {
        prevMatchesRef.current = matches;
        setState({ matches, totalCount, isSearching: false });
      }
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    contentVersionRef.current += 1;
  }, [content]);

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!findOpen || !query.trim()) {
      setState({ matches: [], totalCount: 0, isSearching: false });
      prevQueryRef.current = '';
      prevMatchesRef.current = [];
      return;
    }

    setState(prev => ({ ...prev, isSearching: true }));

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const id = ++requestIdRef.current;

      workerRef.current?.postMessage({
        id,
        content,
        query,
        options,
        previousMatches: prevMatchesRef.current,
        previousQuery: prevQueryRef.current,
      });

      prevQueryRef.current = query;
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [content, query, options, findOpen]);

  return state;
}

export function useContentIndex(content: string) {
  const lineStartOffsets = useRef<number[]>([0]);
  const contentRef = useRef('');

  if (content !== contentRef.current) {
    contentRef.current = content;
    const offsets = [0];
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 10) {
        offsets.push(i + 1);
      }
    }
    lineStartOffsets.current = offsets;
  }

  return {
    lineStartOffsets: lineStartOffsets.current,
    lineCount: lineStartOffsets.current.length,
    getLineForOffset(offset: number): number {
      const arr = lineStartOffsets.current;
      let lo = 0;
      let hi = arr.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1;
        if (arr[mid] <= offset) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      return lo;
    }
  };
}
