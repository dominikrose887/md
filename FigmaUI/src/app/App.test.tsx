import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

function mockMdStudio() {
  window.mdStudio = {
    openFileDialog: vi.fn(async () => ({ canceled: true })),
    saveFile: vi.fn(async () => ({ canceled: true })),
    readFile: vi.fn(async () => ({ canceled: true })),
    getLaunchFile: vi.fn(async () => null),
    confirmSaveBeforePdf: vi.fn(async () => 2),
    exportPdf: vi.fn(async () => ({ canceled: true })),
    onOpenFilePath: vi.fn(() => () => {})
  };
}

describe('App', () => {
  beforeEach(() => {
    mockMdStudio();
  });

  it('defaults to preview-only after opening a document (no editor textarea)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open sample/i }));

    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('disables PDF export until a file is open', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /export to pdf/i })).toBeDisabled();
  });
});
