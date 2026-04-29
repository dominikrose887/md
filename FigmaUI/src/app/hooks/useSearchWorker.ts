import { useEffect, useRef, useState } from 'react';
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
const POOL_SIZE = 4;
const POOL_THRESHOLD_CHARS = 100_000;

function createWorker(): Worker {
  return new Worker(
    new URL('../../workers/search.worker.ts', import.meta.url),
    { type: 'module' }
  );
}

function splitContentIntoChunks(content: string, count: number): Array<{ text: string; offset: number }> {
  const chunkSize = Math.ceil(content.length / count);
  const chunks: Array<{ text: string; offset: number }> = [];
  for (let i = 0; i < count; i++) {
    let start = i * chunkSize;
    let end = Math.min(content.length, (i + 1) * chunkSize);
    if (i > 0) {
      const lookback = Math.min(start, 256);
      start -= lookback;
    }
    if (i < count - 1 && end < content.length) {
      const lookahead = Math.min(content.length - end, 256);
      end += lookahead;
    }
    chunks.push({ text: content.slice(start, end), offset: start });
  }
  return chunks;
}

function mergeAndDeduplicate(allMatches: SearchMatch[][]): SearchMatch[] {
  const flat: SearchMatch[] = [];
  for (const arr of allMatches) {
    for (const m of arr) flat.push(m);
  }
  flat.sort((a, b) => a.index - b.index || a.length - b.length);
  if (flat.length <= 1) return flat;
  const result: SearchMatch[] = [flat[0]];
  for (let i = 1; i < flat.length; i++) {
    const prev = result[result.length - 1];
    const cur = flat[i];
    if (cur.index === prev.index && cur.length === prev.length) continue;
    if (cur.index < prev.index + prev.length) continue;
    result.push(cur);
  }
  return result;
}

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

  const workersRef = useRef<Worker[]>([]);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevQueryRef = useRef<string>('');
  const prevMatchesRef = useRef<SearchMatch[]>([]);
  const poolResponsesRef = useRef<Map<number, SearchMatch[]>>(new Map());
  const poolExpectedRef = useRef(0);

  const setupWorkerHandler = (w: Worker) => {
    w.onmessage = (e: MessageEvent<{ id: number; matches: SearchMatch[]; totalCount: number; poolIndex?: number }>) => {
      const { id, matches, poolIndex } = e.data;
      if (id !== requestIdRef.current) return;

      if (poolIndex !== undefined && poolExpectedRef.current > 1) {
        poolResponsesRef.current.set(poolIndex, matches);
        if (poolResponsesRef.current.size >= poolExpectedRef.current) {
          const allChunkMatches: SearchMatch[][] = [];
          for (let j = 0; j < poolExpectedRef.current; j++) {
            allChunkMatches.push(poolResponsesRef.current.get(j) || []);
          }
          poolResponsesRef.current.clear();
          const merged = mergeAndDeduplicate(allChunkMatches);
          prevMatchesRef.current = merged;
          setState({ matches: merged, totalCount: merged.length, isSearching: false });
        }
      } else {
        prevMatchesRef.current = matches;
        setState({ matches, totalCount: matches.length, isSearching: false });
      }
    };
  };

  const ensureWorkers = (count: number): Worker[] => {
    const existing = workersRef.current;
    if (existing.length >= count) return existing;
    for (let i = existing.length; i < count; i++) {
      const w = createWorker();
      setupWorkerHandler(w);
      existing.push(w);
    }
    workersRef.current = existing;
    return existing;
  };

  useEffect(() => {
    return () => {
      for (const w of workersRef.current) w.terminate();
      workersRef.current = [];
    };
  }, []);

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

    setState(prev => prev.isSearching ? prev : { ...prev, isSearching: true });

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const id = ++requestIdRef.current;
      poolResponsesRef.current.clear();

      if (content.length >= POOL_THRESHOLD_CHARS && !prevMatchesRef.current.length) {
        const workers = ensureWorkers(POOL_SIZE);
        const chunks = splitContentIntoChunks(content, workers.length);
        poolExpectedRef.current = chunks.length;
        for (let i = 0; i < chunks.length; i++) {
          workers[i].postMessage({
            id,
            content: chunks[i].text,
            query,
            options,
            contentOffset: chunks[i].offset,
            poolIndex: i,
          });
        }
      } else {
        const workers = ensureWorkers(1);
        poolExpectedRef.current = 1;
        workers[0].postMessage({
          id,
          content,
          query,
          options,
          previousMatches: prevMatchesRef.current,
          previousQuery: prevQueryRef.current,
        });
      }

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
