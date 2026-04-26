# Releasing MD Studio

Single source of truth for the **app version** is `package.json` → `"version"`.  
Electron Builder reads this for `MD Studio Setup <version>.exe` and related artifacts.

## Semantic versioning (short)

- **MAJOR** — breaking UX/API or incompatible file/project changes users must know about.
- **MINOR** — new features (e.g. new export format, new editor capability) backward compatible.
- **PATCH** — bugfixes only.

## Release checklist

1. **Changelog** — Edit repo root [`../CHANGELOG.md`](../CHANGELOG.md):
   - Move items from `[Unreleased]` into a new section `## [X.Y.Z] - YYYY-MM-DD`.
   - Leave `[Unreleased]` empty (or remove until the next cycle).
2. **Version** — Set `"version"` in `package.json` to `X.Y.Z`.
3. **Lockfile** — Run `npm install` in `FigmaUI/` so `package-lock.json` stays in sync.
4. **Demo copy** (optional) — Update `**Version:**` in `src/app/components/SampleContent.ts` if you show it in the sample document.
5. **Commit** — e.g. `chore(release): 1.1.0`.
6. **Tag** (recommended):

   ```bash
   git tag -a v1.1.0 -m "MD Studio 1.1.0"
   git push origin v1.1.0
   ```

7. **Build** — From `FigmaUI/`:
   - Installer only: `npm run build:installer`
   - NSIS + portable + `latest.yml`: `npm run build:release`
   - GitHub folder + checksums: `npm run release:github` (runs `build:release` then copies under `release/github/vX.Y.Z/`).

## CI / GitHub Releases

Artifacts land under `FigmaUI/release/` (gitignored). Upload the contents of `release/github/vX.Y.Z/` to the GitHub Release for that tag.

## Pre-release identifiers

If you ever need betas, use SemVer pre-release in `package.json`, e.g. `1.2.0-beta.1`, and document them under a `## [1.2.0-beta.1]` heading in the changelog.
