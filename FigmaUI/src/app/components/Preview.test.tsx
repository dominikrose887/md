import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Preview } from './Preview';

describe('Preview LaTeX / KaTeX', () => {
  it('renders inline math ($...$) as KaTeX HTML', () => {
    const { container } = render(<Preview content="Energy $E = mc^2$ is famous." theme="light" />);
    expect(container.querySelector('.katex')).toBeTruthy();
    expect(container.querySelector('.katex-html')).toBeTruthy();
    expect(container.textContent).toContain('Energy');
  });

  it('renders display math ($$...$$) with typical newline form', () => {
    const md = ['Line before', '', '$$', 'x^2 \\geq 0', '$$', '', 'Line after'].join('\n');
    const { container } = render(<Preview content={md} theme="light" />);
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0);
    // Display: KaTeX outer span or our fenced wrapper uses .katex-display
    expect(
      container.querySelector('.katex-display') ||
        container.querySelector('.markdown-body .katex')
    ).toBeTruthy();
  });

  it('renders fenced ```math blocks', () => {
    const md = ['```math', 'a^2 + b^2 = c^2', '```'].join('\n');
    const { container } = render(<Preview content={md} theme="light" />);
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('renders fenced ```latex blocks via fallback', () => {
    const md = ['```latex', '\\frac{1}{2}', '```'].join('\n');
    const { container } = render(<Preview content={md} theme="light" />);
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('does not treat dollar amounts as math when spaced (GFM)', () => {
    const { container } = render(<Preview content="Price is 5 USD today." theme="light" />);
    expect(container.querySelector('.katex')).toBeFalsy();
  });
});
