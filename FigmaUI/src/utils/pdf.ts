/** Suggested PDF filename from the current Markdown filename. */
export function suggestedPdfFileName(markdownFileName: string): string {
  const trimmed = markdownFileName.trim();
  if (!trimmed) {
    return 'document.pdf';
  }
  const base = trimmed.replace(/\.(md|markdown|mdown)$/i, '');
  return `${base || 'document'}.pdf`;
}
