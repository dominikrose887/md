/** Ranges removed from the editor string before parsing the preview (script/style blocks). */
export function buildStyleScriptRemovedRanges(source: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const re of [/<style[\s\S]*?<\/style>/gi, /<script[\s\S]*?<\/script>/gi]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of ranges) {
    const prev = merged[merged.length - 1];
    if (prev && r.start <= prev.end) {
      prev.end = Math.max(prev.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/** Map a byte offset in the full editor document into the preview parse string (after style/script removal). */
export function sourceOffsetContentToPrepared(fullSource: string, contentOffset: number): number {
  const ranges = buildStyleScriptRemovedRanges(fullSource);
  let delta = 0;
  for (const { start, end } of ranges) {
    const len = end - start;
    if (contentOffset <= start) {
      return Math.max(0, contentOffset - delta);
    }
    if (contentOffset < end) {
      return Math.max(0, start - delta);
    }
    delta += len;
  }
  return Math.max(0, contentOffset - delta);
}

/** Inverse of {@link sourceOffsetContentToPrepared}: map a preview-tree offset back to the editor string. */
export function sourceOffsetPreparedToContent(fullSource: string, preparedOffset: number): number {
  const ranges = buildStyleScriptRemovedRanges(fullSource);
  let prepI = 0;
  let fullI = 0;
  let rIdx = 0;
  while (true) {
    while (rIdx < ranges.length && fullI >= ranges[rIdx].end) {
      rIdx += 1;
    }
    if (rIdx < ranges.length && fullI >= ranges[rIdx].start && fullI < ranges[rIdx].end) {
      fullI = ranges[rIdx].end;
      continue;
    }
    if (prepI >= preparedOffset) {
      break;
    }
    if (fullI >= fullSource.length) {
      break;
    }
    prepI += 1;
    fullI += 1;
  }
  return Math.min(fullI, fullSource.length);
}

/** Read numeric `data-md-start` / `data-md-end` from a DOM element (React camelCase or HTML). */
export function readDataMdStart(el: Element): number | null {
  const ds = (el as HTMLElement).dataset?.mdStart;
  if (ds !== undefined && ds !== '') {
    const n = Number.parseInt(ds, 10);
    return Number.isFinite(n) ? n : null;
  }
  const attr = el.getAttribute('data-md-start');
  if (attr == null || attr === '') {
    return null;
  }
  const n = Number.parseInt(attr, 10);
  return Number.isFinite(n) ? n : null;
}

export function readDataMdEnd(el: Element): number | null {
  const ds = (el as HTMLElement).dataset?.mdEnd;
  if (ds !== undefined && ds !== '') {
    const n = Number.parseInt(ds, 10);
    return Number.isFinite(n) ? n : null;
  }
  const attr = el.getAttribute('data-md-end');
  if (attr == null || attr === '') {
    return null;
  }
  const n = Number.parseInt(attr, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Finds the rendered node that best corresponds to a byte offset in the markdown source.
 * Prefers the innermost element whose [start,end) contains `offset`, otherwise the
 * nearest preceding block (e.g. cursor inside raw HTML stripped from the preview).
 */
export function findElementForSourceOffset(root: HTMLElement, offset: number): Element | null {
  const marked = root.querySelectorAll('[data-md-start]');
  let innerBest: Element | null = null;
  let innerSpan = Infinity;
  let fallback: Element | null = null;
  let fallbackStart = -1;

  for (const el of marked) {
    const start = readDataMdStart(el);
    if (start === null) {
      continue;
    }
    const endRaw = readDataMdEnd(el);
    const end = endRaw ?? start;

    if (start <= offset && offset < end && end - start < innerSpan) {
      innerBest = el;
      innerSpan = end - start;
    }
    if (start <= offset && start >= fallbackStart) {
      fallback = el;
      fallbackStart = start;
    }
  }

  return innerBest ?? fallback;
}
