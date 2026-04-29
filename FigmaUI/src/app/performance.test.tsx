/**
 * Performance benchmark suite for MD Studio.
 *
 * Simulates opening a ~1800-line markdown document with code blocks, tables,
 * math, TOC links, etc., then measures the wall-clock time of every critical
 * user operation.
 *
 * Run: npm test -- --reporter=verbose src/app/performance.test.tsx
 */

import { describe, expect, it, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { Preview } from './components/Preview';
import { Editor, type EditorHandle } from './components/Editor';
import { generateLargeTestDocument } from './components/LargeTestDocument';
import { createRef } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockMdStudio() {
  window.mdStudio = {
    openFileDialog: vi.fn(async () => ({ canceled: true })),
    saveFile: vi.fn(async () => ({ canceled: true })),
    readFile: vi.fn(async () => ({ canceled: true })),
    getLaunchFile: vi.fn(async () => null),
    confirmSaveBeforePdf: vi.fn(async () => 2),
    exportPdf: vi.fn(async () => ({ canceled: true })),
    onOpenFilePath: vi.fn(() => () => {}),
  };
}

let LARGE_MD = '';
let LARGE_MD_LINE_COUNT = 0;

interface TimingResult {
  label: string;
  ms: number;
}
const timings: TimingResult[] = [];

function measure<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  timings.push({ label, ms });
  return result;
}

async function measureAsync(label: string, fn: () => Promise<void>): Promise<void> {
  const start = performance.now();
  await fn();
  const ms = performance.now() - start;
  timings.push({ label, ms });
}

function flushRAF(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  LARGE_MD = generateLargeTestDocument();
  LARGE_MD_LINE_COUNT = LARGE_MD.split('\n').length;
  console.log(`\n📄 Test document: ${LARGE_MD.length.toLocaleString()} chars, ${LARGE_MD_LINE_COUNT.toLocaleString()} lines\n`);
});

beforeEach(() => {
  mockMdStudio();
  timings.length = 0;
});

// ---------------------------------------------------------------------------
// 1. Preview render — the most expensive single operation
// ---------------------------------------------------------------------------

describe('Preview render performance', () => {
  it('initial render of large document', () => {
    let container!: HTMLElement;
    measure('Preview: initial render', () => {
      ({ container } = render(<Preview content={LARGE_MD} theme="light" />));
    });

    const mdBody = container.querySelector('.markdown-body');
    expect(mdBody).toBeTruthy();
    expect(mdBody!.querySelectorAll('h2').length).toBeGreaterThanOrEqual(8);

    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(5000);
  });

  it('re-render with small content change (simulates typing)', () => {
    const { rerender } = render(<Preview content={LARGE_MD} theme="light" />);

    const modified = LARGE_MD + '\n\nNew paragraph at the end.';
    measure('Preview: re-render (append paragraph)', () => {
      rerender(<Preview content={modified} theme="light" />);
    });

    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(5000);
  });

  it('theme switch (light -> dark)', () => {
    const { rerender } = render(<Preview content={LARGE_MD} theme="light" />);

    measure('Preview: theme switch light→dark', () => {
      rerender(<Preview content={LARGE_MD} theme="dark" />);
    });

    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(3000);
  });
});

// ---------------------------------------------------------------------------
// 2. Editor render performance
// ---------------------------------------------------------------------------

describe('Editor render performance', () => {
  it('initial render with large content', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();

    measure('Editor: initial render', () => {
      render(
        <Editor
          ref={ref}
          value={LARGE_MD}
          onChange={onChange}
          showLineNumbers={true}
        />
      );
    });

    expect(screen.getByRole('textbox')).toBeTruthy();
    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(2000);
  });

  it('re-render after content change (typing simulation)', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    const { rerender } = render(
      <Editor ref={ref} value={LARGE_MD} onChange={onChange} showLineNumbers={true} />
    );

    const modified = 'X' + LARGE_MD.slice(1);
    measure('Editor: re-render (1-char change)', () => {
      rerender(
        <Editor ref={ref} value={modified} onChange={onChange} showLineNumbers={true} />
      );
    });

    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// 3. Search performance (find matches)
// ---------------------------------------------------------------------------

describe('Search performance', () => {
  it('find all matches for a common word', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    render(
      <Editor ref={ref} value={LARGE_MD} onChange={onChange} showLineNumbers={true} />
    );

    let matchCount = 0;
    measure('Search: countMatches("const")', () => {
      matchCount = ref.current!.countMatches('const', { caseSensitive: false });
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms (${matchCount} matches)`);
    expect(matchCount).toBeGreaterThan(0);
    expect(timings[0].ms).toBeLessThan(200);
  });

  it('find all matches for a rare word', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    render(
      <Editor ref={ref} value={LARGE_MD} onChange={onChange} showLineNumbers={true} />
    );

    let matchCount = 0;
    measure('Search: countMatches("Kubernetes")', () => {
      matchCount = ref.current!.countMatches('Kubernetes', { caseSensitive: false });
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms (${matchCount} matches)`);
    expect(timings[0].ms).toBeLessThan(100);
  });

  it('find next / find previous navigation speed', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    render(
      <Editor ref={ref} value={LARGE_MD} onChange={onChange} showLineNumbers={true} />
    );

    const query = 'data';
    const opts = { caseSensitive: false };

    measure('Search: findFirst("data")', () => {
      ref.current!.findFirst(query, opts);
    });
    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms`);

    measure('Search: 20x findNext("data")', () => {
      for (let i = 0; i < 20; i++) {
        ref.current!.findNext(query, opts);
      }
    });
    const perCall = timings[1].ms / 20;
    console.log(`  ⏱  ${timings[1].label}: ${timings[1].ms.toFixed(1)}ms (${perCall.toFixed(1)}ms/call)`);

    measure('Search: 20x findPrevious("data")', () => {
      for (let i = 0; i < 20; i++) {
        ref.current!.findPrevious(query, opts);
      }
    });
    const perCallPrev = timings[2].ms / 20;
    console.log(`  ⏱  ${timings[2].label}: ${timings[2].ms.toFixed(1)}ms (${perCallPrev.toFixed(1)}ms/call)`);
  });

  it('regex search performance', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    render(
      <Editor ref={ref} value={LARGE_MD} onChange={onChange} showLineNumbers={true} />
    );

    let matchCount = 0;
    measure('Search: regex countMatches("\\\\bfunction\\\\w*")', () => {
      matchCount = ref.current!.countMatches('\\bfunction\\w*', {
        caseSensitive: false,
        useRegex: true,
      });
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms (${matchCount} matches)`);
    expect(timings[0].ms).toBeLessThan(200);
  });

  it('whole-word search performance', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    render(
      <Editor ref={ref} value={LARGE_MD} onChange={onChange} showLineNumbers={true} />
    );

    let matchCount = 0;
    measure('Search: wholeWord countMatches("const")', () => {
      matchCount = ref.current!.countMatches('const', {
        caseSensitive: false,
        wholeWord: true,
      });
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms (${matchCount} matches)`);
    expect(timings[0].ms).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// 4. Editor with active search highlighting
// ---------------------------------------------------------------------------

describe('Editor search highlight render performance', () => {
  it('render editor with search highlights active', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();

    measure('Editor+Highlight: render with findOpen=true, query="const"', () => {
      render(
        <Editor
          ref={ref}
          value={LARGE_MD}
          onChange={onChange}
          showLineNumbers={true}
          findOpen={true}
          searchQuery="const"
          searchOptions={{ caseSensitive: false }}
          currentMatchIndex={0}
        />
      );
    });

    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(5000);
  });

  it('re-render highlight when currentMatchIndex changes', () => {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    const { rerender } = render(
      <Editor
        ref={ref}
        value={LARGE_MD}
        onChange={onChange}
        showLineNumbers={true}
        findOpen={true}
        searchQuery="const"
        searchOptions={{ caseSensitive: false }}
        currentMatchIndex={0}
      />
    );

    measure('Editor+Highlight: step match index 0→5', () => {
      rerender(
        <Editor
          ref={ref}
          value={LARGE_MD}
          onChange={onChange}
          showLineNumbers={true}
          findOpen={true}
          searchQuery="const"
          searchOptions={{ caseSensitive: false }}
          currentMatchIndex={5}
        />
      );
    });

    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(3000);
  });
});

// ---------------------------------------------------------------------------
// 5. Preview with search highlighting
// ---------------------------------------------------------------------------

describe('Preview search highlight performance', () => {
  it('render preview with search active', async () => {
    let container!: HTMLElement;
    await measureAsync('Preview+Search: render with findOpen=true, query="data"', async () => {
      ({ container } = render(
        <Preview
          content={LARGE_MD}
          theme="light"
          findOpen={true}
          searchQuery="data"
          searchOptions={{ caseSensitive: false }}
          currentMatchIndex={0}
        />
      ));
      await flushRAF();
    });

    const marks = container.querySelectorAll('mark[data-md-search-highlight="1"]');
    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms (${marks.length} highlights)`);
    expect(timings[0].ms).toBeLessThan(6000);
  });
});

// ---------------------------------------------------------------------------
// 6. Full App — open sample, view switches, search
// ---------------------------------------------------------------------------

describe('Full App performance', () => {
  it('open large document via simulated file load', async () => {
    const user = userEvent.setup();
    window.mdStudio = {
      ...window.mdStudio!,
      readFile: vi.fn(async () => ({
        canceled: false,
        path: '/test/large-doc.md',
        name: 'large-doc.md',
        content: LARGE_MD,
      })),
      getLaunchFile: vi.fn(async () => '/test/large-doc.md'),
    };

    await measureAsync('App: initial render + file load', async () => {
      render(<App />);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
    });

    const t = timings[0];
    console.log(`  ⏱  ${t.label}: ${t.ms.toFixed(1)}ms`);
    expect(t.ms).toBeLessThan(8000);
  });

  it('switch view modes: preview → split → editor → preview', async () => {
    const user = userEvent.setup();

    window.mdStudio = {
      ...window.mdStudio!,
      readFile: vi.fn(async () => ({
        canceled: false,
        path: '/test/large-doc.md',
        name: 'large-doc.md',
        content: LARGE_MD,
      })),
      getLaunchFile: vi.fn(async () => '/test/large-doc.md'),
    };

    render(<App />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const splitBtn = screen.getByTitle('Split view');
    const editorBtn = screen.getByTitle('Editor only');
    const previewBtn = screen.getByTitle('Preview only');

    await measureAsync('App: switch preview→split', async () => {
      await user.click(splitBtn);
    });
    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms`);

    await measureAsync('App: switch split→editor', async () => {
      await user.click(editorBtn);
    });
    console.log(`  ⏱  ${timings[1].label}: ${timings[1].ms.toFixed(1)}ms`);

    await measureAsync('App: switch editor→preview', async () => {
      await user.click(previewBtn);
    });
    console.log(`  ⏱  ${timings[2].label}: ${timings[2].ms.toFixed(1)}ms`);

    expect(timings.every((t) => t.ms < 5000)).toBe(true);
  });

  it('open find bar and search in large document', async () => {
    const user = userEvent.setup();

    window.mdStudio = {
      ...window.mdStudio!,
      readFile: vi.fn(async () => ({
        canceled: false,
        path: '/test/large-doc.md',
        name: 'large-doc.md',
        content: LARGE_MD,
      })),
      getLaunchFile: vi.fn(async () => '/test/large-doc.md'),
    };

    render(<App />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await user.click(screen.getByTitle('Split view'));

    await measureAsync('App: open find bar (Ctrl+F)', async () => {
      await user.keyboard('{Control>}f{/Control}');
    });
    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms`);

    const findInput = screen.getByPlaceholderText('Find');
    expect(findInput).toBeTruthy();

    await measureAsync('App: type search query "fn" (2 chars)', async () => {
      await user.type(findInput, 'fn');
    });
    console.log(`  ⏱  ${timings[1].label}: ${timings[1].ms.toFixed(1)}ms`);

    await measureAsync('App: paste longer query via fireEvent', async () => {
      fireEvent.change(findInput, { target: { value: 'function' } });
    });
    console.log(`  ⏱  ${timings[2].label}: ${timings[2].ms.toFixed(1)}ms`);
  }, 30000);
});

// ---------------------------------------------------------------------------
// 7. Raw computation benchmarks (no React)
// ---------------------------------------------------------------------------

describe('Raw computation benchmarks', () => {
  it('regex match counting speed on large string', () => {
    const query = 'const';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    let matchCount = 0;
    measure('Raw: regex exec loop for "const"', () => {
      let result: RegExpExecArray | null;
      while ((result = regex.exec(LARGE_MD)) !== null) {
        matchCount++;
        if (result[0].length === 0) {
          regex.lastIndex++;
        }
      }
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms (${matchCount} matches)`);
    expect(timings[0].ms).toBeLessThan(50);
  });

  it('line counting speed on large string', () => {
    let lineCount = 0;
    measure('Raw: line count (charCode loop)', () => {
      lineCount = 1;
      for (let i = 0; i < LARGE_MD.length; i++) {
        if (LARGE_MD.charCodeAt(i) === 10) {
          lineCount++;
        }
      }
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms (${lineCount} lines)`);
    expect(timings[0].ms).toBeLessThan(20);
  });

  it('highlight fragment building speed', () => {
    const query = 'data';
    const regex = new RegExp(query, 'gi');
    const matches: Array<{ index: number; length: number }> = [];
    let result: RegExpExecArray | null;
    while ((result = regex.exec(LARGE_MD)) !== null) {
      matches.push({ index: result.index, length: result[0].length });
      if (result[0].length === 0) regex.lastIndex++;
    }

    measure(`Raw: build highlight fragments (${matches.length} matches)`, () => {
      const out: string[] = [];
      let cursor = 0;
      for (const match of matches) {
        if (match.index > cursor) {
          out.push(LARGE_MD.slice(cursor, match.index));
        }
        out.push(LARGE_MD.slice(match.index, match.index + match.length));
        cursor = match.index + match.length;
      }
      if (cursor < LARGE_MD.length) {
        out.push(LARGE_MD.slice(cursor));
      }
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms`);
    expect(timings[0].ms).toBeLessThan(50);
  });

  it('style/script regex stripping speed', () => {
    const contentWithScripts = LARGE_MD +
      '\n<style>body { color: red; }</style>\n' +
      '<script>alert("test")</script>\n'.repeat(10);

    measure('Raw: strip <style>/<script> regex', () => {
      contentWithScripts
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '');
    });

    console.log(`  ⏱  ${timings[0].label}: ${timings[0].ms.toFixed(1)}ms`);
    expect(timings[0].ms).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

describe('Performance Summary', () => {
  it('prints document stats', () => {
    console.log('\n' + '='.repeat(70));
    console.log('📊 DOCUMENT STATS');
    console.log('='.repeat(70));
    console.log(`  Characters : ${LARGE_MD.length.toLocaleString()}`);
    console.log(`  Lines      : ${LARGE_MD_LINE_COUNT.toLocaleString()}`);

    const codeBlockCount = (LARGE_MD.match(/^```\w+/gm) ?? []).length;
    const tableRowCount = (LARGE_MD.match(/^\|/gm) ?? []).length;
    const headingCount = (LARGE_MD.match(/^#{1,6}\s/gm) ?? []).length;
    const mathBlockCount = (LARGE_MD.match(/\$\$/g) ?? []).length / 2;
    const inlineMathCount = (LARGE_MD.match(/\$[^$]+\$/g) ?? []).length;

    console.log(`  Headings   : ${headingCount}`);
    console.log(`  Code blocks: ${codeBlockCount}`);
    console.log(`  Table rows : ${tableRowCount}`);
    console.log(`  Math blocks: ${mathBlockCount}`);
    console.log(`  Inline math: ${inlineMathCount}`);
    console.log('='.repeat(70) + '\n');
  });
});
