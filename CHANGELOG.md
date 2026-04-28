# Changelog

All notable changes to **MD Studio** (source in [`FigmaUI/`](./FigmaUI/)) are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) via `FigmaUI/package.json`.

## [Unreleased]

Use this section while developing. Before a release, move bullets into a new `## [X.Y.Z] - date` section and bump `FigmaUI/package.json` (see [`FigmaUI/RELEASING.md`](./FigmaUI/RELEASING.md)).

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

[Unreleased]: https://github.com/dominikrose887/md/compare/v1.2.11...HEAD  
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
