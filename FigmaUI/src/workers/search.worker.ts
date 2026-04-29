interface SearchRequest {
  id: number;
  content: string;
  query: string;
  options: {
    caseSensitive?: boolean;
    useRegex?: boolean;
    wholeWord?: boolean;
  };
  previousMatches?: Array<{ index: number; length: number }>;
  previousQuery?: string;
  /** Byte offset of this chunk within the full document (for worker-pool mode). */
  contentOffset?: number;
  /** Worker index within the pool (echoed back in response). */
  poolIndex?: number;
}

interface SearchResponse {
  id: number;
  matches: Array<{ index: number; length: number }>;
  totalCount: number;
  poolIndex?: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex(query: string, options: SearchRequest['options']): RegExp | null {
  if (!query) return null;
  const source = options.useRegex ? query : escapeRegex(query);
  const pattern = options.wholeWord ? `\\b${source}\\b` : source;
  const flags = options.caseSensitive ? 'g' : 'gi';
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function canUseIncremental(
  prevQuery: string | undefined,
  newQuery: string,
  options: SearchRequest['options']
): boolean {
  if (!prevQuery || !newQuery) return false;
  if (options.useRegex) return false;
  const normalize = options.caseSensitive ? (s: string) => s : (s: string) => s.toLowerCase();
  return normalize(newQuery).startsWith(normalize(prevQuery));
}

function fullSearch(content: string, regex: RegExp): Array<{ index: number; length: number }> {
  const matches: Array<{ index: number; length: number }> = [];
  let result: RegExpExecArray | null;
  while ((result = regex.exec(content)) !== null) {
    const len = result[0].length;
    if (len <= 0) {
      regex.lastIndex += 1;
      continue;
    }
    matches.push({ index: result.index, length: len });
  }
  return matches;
}

function incrementalSearch(
  content: string,
  previousMatches: Array<{ index: number; length: number }>,
  regex: RegExp
): Array<{ index: number; length: number }> {
  const matches: Array<{ index: number; length: number }> = [];
  for (const prev of previousMatches) {
    const end = Math.min(content.length, prev.index + prev.length + 256);
    const slice = content.slice(prev.index, end);
    regex.lastIndex = 0;
    const result = regex.exec(slice);
    if (result && result.index === 0) {
      matches.push({ index: prev.index, length: result[0].length });
    }
  }
  return matches;
}

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  const { id, content, query, options, previousMatches, previousQuery, contentOffset = 0, poolIndex } = e.data;

  if (!query.trim()) {
    const response: SearchResponse = { id, matches: [], totalCount: 0, poolIndex };
    self.postMessage(response);
    return;
  }

  const regex = buildRegex(query, options);
  if (!regex) {
    const response: SearchResponse = { id, matches: [], totalCount: 0, poolIndex };
    self.postMessage(response);
    return;
  }

  let matches: Array<{ index: number; length: number }>;

  if (
    previousMatches &&
    previousMatches.length > 0 &&
    canUseIncremental(previousQuery, query, options)
  ) {
    matches = incrementalSearch(content, previousMatches, regex);
  } else {
    matches = fullSearch(content, regex);
  }

  if (contentOffset > 0) {
    for (let i = 0; i < matches.length; i++) {
      matches[i] = { index: matches[i].index + contentOffset, length: matches[i].length };
    }
  }

  const response: SearchResponse = { id, matches, totalCount: matches.length, poolIndex };
  self.postMessage(response);
};
