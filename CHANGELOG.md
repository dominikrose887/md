# Changelog

All notable changes to **MD Studio** (source in [`FigmaUI/`](./FigmaUI/)) are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) via `FigmaUI/package.json`.

## [Unreleased]

Use this section while developing. Before a release, move bullets into a new `## [X.Y.Z] - date` section and bump `FigmaUI/package.json` (see [`FigmaUI/RELEASING.md`](./FigmaUI/RELEASING.md)).

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

[Unreleased]: https://github.com/dominikrose887/md/compare/v1.1.0...HEAD  
[1.1.0]: https://github.com/dominikrose887/md/compare/v1.0.0...v1.1.0  
[1.0.0]: https://github.com/dominikrose887/md/releases/tag/v1.0.0
