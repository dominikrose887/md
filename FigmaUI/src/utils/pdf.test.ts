import { describe, expect, it } from 'vitest';
import { suggestedPdfFileName } from './pdf';

describe('suggestedPdfFileName', () => {
  it('replaces .md with .pdf', () => {
    expect(suggestedPdfFileName('notes.md')).toBe('notes.pdf');
  });

  it('handles .markdown and .mdown', () => {
    expect(suggestedPdfFileName('a.markdown')).toBe('a.pdf');
    expect(suggestedPdfFileName('b.mdown')).toBe('b.pdf');
  });

  it('uses document.pdf for empty input', () => {
    expect(suggestedPdfFileName('')).toBe('document.pdf');
    expect(suggestedPdfFileName('   ')).toBe('document.pdf');
  });

  it('appends .pdf when no known extension', () => {
    expect(suggestedPdfFileName('readme')).toBe('readme.pdf');
  });
});
