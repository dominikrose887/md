import { describe, expect, it } from 'vitest';
import { findElementForSourceOffset, sourceOffsetContentToPrepared, sourceOffsetPreparedToContent } from './sourceOffsetSync';

function el(tag: string, start: string, end?: string) {
  const e = document.createElement(tag);
  e.setAttribute('data-md-start', start);
  if (end !== undefined) {
    e.setAttribute('data-md-end', end);
  }
  return e;
}

describe('findElementForSourceOffset', () => {
  it('returns innermost containing element', () => {
    const root = document.createElement('div');
    const p = el('p', '0', '100');
    const strong = el('strong', '10', '25');
    p.appendChild(strong);
    root.appendChild(p);
    expect(findElementForSourceOffset(root, 15)).toBe(strong);
  });

  it('falls back to nearest preceding block when offset is outside ranges', () => {
    const root = document.createElement('div');
    const h1 = el('h1', '0', '10');
    const p = el('p', '50', '80');
    root.appendChild(h1);
    root.appendChild(p);
    expect(findElementForSourceOffset(root, 40)).toBe(h1);
  });
});

describe('content ↔ prepared offset mapping', () => {
  it('maps through removed style blocks', () => {
    const full = 'AB<style>x</style>CD';
    const prep = full.replace(/<style[\s\S]*?<\/style>/gi, '');
    expect(prep).toBe('ABCD');
    expect(sourceOffsetContentToPrepared(full, 0)).toBe(0);
    expect(sourceOffsetContentToPrepared(full, 2)).toBe(2);
    expect(sourceOffsetContentToPrepared(full, 5)).toBe(2);
    expect(sourceOffsetContentToPrepared(full, full.length)).toBe(4);
    const cIndexInPrep = 2;
    expect(sourceOffsetPreparedToContent(full, cIndexInPrep)).toBe(full.indexOf('C'));
    expect(sourceOffsetPreparedToContent(full, 3)).toBe(full.indexOf('D'));
  });
});
