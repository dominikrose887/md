# Changelog

All notable changes to **MD Studio** (source in [`FigmaUI/`](./FigmaUI/)) are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) via `FigmaUI/package.json`.

## [Unreleased]

Use this section while developing. Before a release, move bullets into a new `## [X.Y.Z] - date` section and bump `FigmaUI/package.json` (see [`FigmaUI/RELEASING.md`](./FigmaUI/RELEASING.md)).

## [1.4.1] - 2026-05-06

### Fixed

- **Split-view tab switch desync**: when switching between tabs in split view, the raw editor could briefly remain on the previous tab while preview already showed the new tab. Editor document sync now resets stale deferred updates on tab switch and applies the active tab content immediately.

## [1.4.0] - 2026-05-06

### Added

- **Browser-style tab strip**: multiple open documents are now shown as tabs under the toolbar; opening additional files creates additional tabs instead of replacing the current document.
- **Tab context actions and reordering**: tabs support drag-and-drop reordering plus right-click actions for **Rename**, **Close**, **Close all but this**, and **Close tabs to the right**.
- **Unsaved-change tab close prompts**: closing a dirty tab now asks whether to save, discard, or keep the tab open.
- **External file watch IPC**: Electron now exposes file watch/unwatch events to the renderer for live on-disk change detection.

### Changed

- **Per-tab document state**: editor content, saved content, cursor position, and file metadata are now tracked independently per tab.
- **Internal-link reliability in preview**: heading IDs are now auto-generated from heading text, including duplicate slug handling, so TOC/hash links can resolve correctly in rendered markdown.

### Fixed

- **Conflict-safe save flow**: saves now include an expected disk version; if the file changed externally, save is blocked instead of silently overwriting newer on-disk content.
- **External modification handling**: if a file changes on disk while open, clean tabs auto-reload safely, while dirty tabs enter conflict state and require explicit user choice.

## [1.3.0] - 2026-04-29

### Changed

- **Editor replaced with CodeMirror 6**: the native `<textarea>` and all associated workarounds (custom line-number virtualization, `innerHTML` highlight overlay, `getComputedStyle` caching, binary-search scroll positioning) have been replaced with CodeMirror 6. The new editor provides virtualized rendering (only visible lines exist in the DOM), built-in line numbers, markdown syntax highlighting, native decoration-based search highlighting, undo/redo history, and line wrapping — all out of the box.
- **Search architecture rewritten for zero-lag input**:
  - **Isolated FindBar component**: the search input manages its own local state and debounces internally (150 ms); typing never triggers React re-renders of the Editor, Preview, or App.
  - **Lazy Web Worker pool**: search workers are created only when the user first opens find (not at app startup). A single worker handles normal searches; for large files (100K+ chars) the pool scales to 4 workers that scan content chunks in parallel.
  - **Incremental search**: extending a query (e.g. `app` → `apple`) re-checks only the previous match set instead of rescanning the entire document.
  - **CodeMirror decorations for Editor highlights**: search matches are rendered via CodeMirror's `Decoration.mark()` API, leveraging its native viewport-aware rendering — no custom overlay DOM needed.
  - **Preview highlights applied imperatively**: a custom `React.memo` comparator excludes all search-related props from Preview; highlighting is applied via DOM TreeWalker without re-running the markdown pipeline.
- **Debounced content sync (200 ms)**: CodeMirror owns the document state; changes propagate to React only after the user pauses typing, eliminating the per-keystroke `doc.toString()` + `setContent()` re-render cascade that previously froze the UI on large documents.
- **Debounced split-pane sync (150 ms)**: clicking or navigating in the editor no longer triggers immediate Preview scrolling on every cursor movement; scroll sync is throttled to avoid blocking the main thread.
- **Preview markdown pipeline deferred**: `useDeferredValue` wraps the prepared content inside Preview, making the heavy react-markdown + rehype + katex + syntax-highlight pipeline interruptible during typing in split mode.

### Fixed

- **Bundle size**: removed 181 unused npm packages and eliminated the `next-themes` dependency from the Toaster component.
- **Code splitting**: the build emits separate chunks for `react-vendor`, `markdown`, `katex`, `syntax-highlight`, and `codemirror`; the main application chunk is ~112 kB.
- **Lazy-loaded syntax highlighter**: `react-syntax-highlighter` (~1.6 MB) loads on demand when the first code block appears in the Preview.
- **Offscreen Preview eliminated**: editor-only mode no longer renders a hidden Preview continuously; it is only instantiated during PDF export.
- **Search highlight race condition**: Preview DOM highlighting runs via `requestAnimationFrame` after React commits, fixing intermittent missing highlights.
- **Editor memo optimized**: the Editor's `React.memo` comparator ignores `findOpen`, `workerMatches`, and `currentMatchIndex` (all handled by refs + CodeMirror effects), preventing unnecessary React re-renders when search state changes.
- **Stable callback references**: `onSplitPanePreviewNavigate` and similar callbacks are wrapped in `useCallback` to prevent child memo invalidation on every App re-render.

### Added

- **Disabled controls when no document is open**: view-mode buttons, the find-and-replace toggle, and `Ctrl+F` are disabled until a file is opened.
- **Performance benchmark test suite** (`performance.test.tsx`): 21 automated benchmarks covering preview render, editor render, search, highlighting, view switching, and raw computation on a generated ~1 100-line markdown document.

## [1.2.13] - 2026-04-28

### Fixed

- **Close flow crash (`Object has been destroyed`)**: close handling now uses a stable window reference and cached `webContents` id, preventing access to destroyed window objects during shutdown.
- **Close-save IPC race**: when sending close-save requests, the app now checks that the window still exists before messaging the renderer, avoiding post-destroy IPC calls.

## [1.2.12] - 2026-04-28

### Fixed

- **Close flow with unsaved changes**: desktop app close no longer gets stuck when a document has unsaved edits. It now shows an English prompt with **Save**, **Discard**, and **Cancel**.
- **Close-save behavior**: selecting **Save** runs normal save logic; if the document has no existing file target, it uses **Save As** automatically before quitting.
- **Discard behavior**: selecting **Discard** closes immediately without saving.
- **Cancel behavior**: selecting **Cancel** aborts app close and keeps the current window/document open.
- **Windows app identity**: app name and user model ID are explicitly set to **MD Studio** so OS integration no longer falls back to generic Electron naming.

## [1.2.11] - 2026-04-28

### Fixed

- **Preview text selection in split mode**: selecting text in the preview no longer gets canceled by split-pane source sync click handling.
- **`Ctrl+S` save parity with Save button**: keyboard save now uses the current app state, matching toolbar save behavior even after content/file state changes.
- **Theme preference persistence**: dark/light mode is now remembered between app launches, so the last selected theme is restored automatically.

### Added

- **Code block copy button**: fenced code blocks now show a top-right copy button that copies the full block content to the clipboard.

## [1.2.10] - 2026-04-26

### Fixed

- **Switching to preview with find open**: when switching to preview view, the find bar closes automatically, so the UI no longer jumps back to split view.
- **Scroll position when changing views**: when switching to preview mode, the current preview scroll position is preserved and restored, so the document does not jump to the top.

## [1.2.9] - 2026-04-26

### Fixed

- **Raw editor search highlighting**: in the editor view, every match is highlighted in yellow; the current match is orange.
- **Find bar Enter behaviour**: pressing Enter keeps focus in the search field and does not move it into the editor; subsequent Enter presses behave like the **Next** button.

## [1.2.8] - 2026-04-26

### Fixed

- **Find focus jump while typing**: while typing, find no longer steals focus into the editor, so the find input stays reliably focused.
- **Preview find highlighting**: every match is highlighted in yellow; the current match is orange.
- **Prev/Next preview follow**: when stepping matches, the preview scrolls to the current match and updates the active highlight.

## [1.2.7] - 2026-04-26

### Fixed

- **Find typing performance**: the automatic “jump to first match” logic now runs on a deferred query, so large documents do not run a full scan on every keypress.
- **Fewer redundant find operations**: unified trimmed-query checks reduce unnecessary work on empty/whitespace searches.

## [1.2.6] - 2026-04-26

### Fixed

- **Editor line-number virtualization**: for large documents, the gutter renders only the visible region plus overscan, greatly reducing DOM node count.
- **Lower allocation in cursor handling**: line counting and scroll-to-target no longer use `split` plus large string slices; they use a single pass over characters.

## [1.2.5] - 2026-04-26

### Fixed

- **Find performance**: the editor search engine caches the match list for a given document + query + options combination, so `Next` / `Prev`, index calculation, and match counting do not rescan the whole document unnecessarily.
- **Fewer allocations when stepping backwards**: reverse search no longer creates a reversed array copy on every step.
- **App-side match counter**: where available, it uses the cached editor counter instead of a separate regex pass.

## [1.2.4] - 2026-04-26

### Fixed

- **Window state persistence**: the app remembers the last window size, position, maximized and fullscreen state and restores them on launch.
- **Saving on exit**: state is saved on throttled `move` / `resize` / `maximize` / `fullscreen` events, and once immediately on close.

## [1.2.3] - 2026-04-26

### Fixed

- **Closing the find bar**: added an **X** button on the right side of the find bar, visually aligned with existing controls, to close the panel in one click.

## [1.2.2] - 2026-04-26

### Fixed

- **Find navigation (`0/3`, Prev/Next not working)**: in preview-only mode the editor component was not mounted, so find match navigation could not run. Opening find now switches to split view so jumping to matches and selection work reliably.
- **`Ctrl+F` pressed again**: the find field receives focus each time and the current search text is selected.
- **Find input responsiveness**: match counting uses `useDeferredValue` so typing stays smoother on large documents.

## [1.2.1] - 2026-04-26

### Fixed

- **Preview – internal links (TOC, `#heading`)**: under the `rehype-sanitize` GitHub schema, heading `id` values in the DOM are prefixed with `user-content-`. The old code only looked up the raw fragment, so table-of-contents links did not scroll to the correct heading. Lookup now considers both the raw and prefixed identifiers, plus `name` attributes.

## [1.2.0] - 2026-04-26

### Added

- **Split view source sync**: clicking a line in the editor or a block in the preview scrolls the other pane to the same logical place using **markdown source byte offsets** (unist positions), not raw line numbers — hidden `<script>` / `<style>` blocks in the raw file no longer throw off alignment with the rendered preview.
- `rehypeSourceOffsets` + helpers (`sourceOffsetContentToPrepared` / `sourceOffsetPreparedToContent`) and Vitest coverage for offset mapping and DOM lookup.

### Changed

- Split mode uses the live document string for the preview (not deferred) so sync targets stay aligned while editing.

## [1.1.0] - 2026-04-23

### Added

- LaTeX / KaTeX rendering in the preview (`remark-math`, `$…$` / `$$…$$`, and fenced **math** code blocks).
- PDF export in the Electron build (save prompt, print-to-PDF of the preview).
- Windows installer helper [`FigmaUI/build-installer.ps1`](./FigmaUI/build-installer.ps1) and `npm run build:installer`.
- Vitest suite (PDF filename helper, app default preview mode, Preview math cases).

### Changed

- Default layout: **preview-only** instead of split view.
- **Pointer** cursor on native buttons, `role="button"`, and Radix menu / select / command rows (replacing `cursor-default` where appropriate).
- Toolbar: removed non-functional duplicate min / max / close controls (native window chrome is used).

### Fixed

- Preview and packaging fixes from earlier iterations (paths, NSIS, file locks) remain part of the 1.0.0 baseline; this release focuses on the changes above.

## [1.0.0] - 2026-04-23

First public baseline for **MD Studio**: Electron + Vite + React Markdown editor and viewer.

### Added

- Split / editor / preview modes, GitHub-like Markdown + GFM, themes, find & replace.
- Electron integration: open/save, `.md` associations, single-instance + CLI file open.
- Windows **NSIS** installer and **portable** `.exe` via `electron-builder`.
- `npm run build:release` and [`FigmaUI/build-github-release.ps1`](./FigmaUI/build-github-release.ps1) for GitHub Release artifacts and `SHA256SUMS.txt`.

[Unreleased]: https://github.com/dominikrose887/md/compare/v1.4.1...HEAD  
[1.4.1]: https://github.com/dominikrose887/md/compare/v1.4.0...v1.4.1  
[1.4.0]: https://github.com/dominikrose887/md/compare/v1.3.0...v1.4.0  
[1.3.0]: https://github.com/dominikrose887/md/compare/v1.2.13...v1.3.0  
[1.2.13]: https://github.com/dominikrose887/md/compare/v1.2.12...v1.2.13  
[1.2.12]: https://github.com/dominikrose887/md/compare/v1.2.11...v1.2.12  
[1.2.11]: https://github.com/dominikrose887/md/compare/v1.2.10...v1.2.11  
[1.2.10]: https://github.com/dominikrose887/md/compare/v1.2.9...v1.2.10  
[1.2.9]: https://github.com/dominikrose887/md/compare/v1.2.8...v1.2.9  
[1.2.8]: https://github.com/dominikrose887/md/compare/v1.2.7...v1.2.8  
[1.2.7]: https://github.com/dominikrose887/md/compare/v1.2.6...v1.2.7  
[1.2.6]: https://github.com/dominikrose887/md/compare/v1.2.5...v1.2.6  
[1.2.5]: https://github.com/dominikrose887/md/compare/v1.2.4...v1.2.5  
[1.2.4]: https://github.com/dominikrose887/md/compare/v1.2.3...v1.2.4  
[1.2.3]: https://github.com/dominikrose887/md/compare/v1.2.2...v1.2.3  
[1.2.2]: https://github.com/dominikrose887/md/compare/v1.2.1...v1.2.2  
[1.2.1]: https://github.com/dominikrose887/md/compare/v1.2.0...v1.2.1  
[1.2.0]: https://github.com/dominikrose887/md/compare/v1.1.0...v1.2.0  
[1.1.0]: https://github.com/dominikrose887/md/compare/v1.0.0...v1.1.0  
[1.0.0]: https://github.com/dominikrose887/md/releases/tag/v1.0.0
