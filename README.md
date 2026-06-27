# ZenoPress (Obsidian Plugin)

Publish the active Obsidian note to a local clone of your Zensical / MkDocs Material GitHub Pages repo.

## What it does

- Copies the active `.md` file into `<repo>/docs/articles/` (configurable) under a
  **websafe slug** of the note name (e.g. `My Great Post.md` → `my-great-post.md`).
- Copies referenced images into `<repo>/docs/images/<article-slug>/` (configurable),
  one subfolder per article. Folder and copied filenames are slugified websafe.
- Rewrites image references:
  - `![[image.png]]` and `![[image.png|alt]]` → `![alt](../images/image.png)`
  - Standard MD images with local paths get their paths rewritten too.
  - Image links resolve to `../images/<article-slug>/<file-slug>`.
  - Optionally (**Images as HTML**) emits a clickable `<a><img>` that opens the full
    image in a new tab, with a configurable width, instead of Markdown `![]()`.
- Rewrites non-image wikilinks: `[[Note]]` / `[[Note|alias]]` → `[alias](note.md)`
  (target slugged to match the published filename).
- Rewrites links to local `.html` files: `[text](thing.html)` →
  `<a href="../html/<article-slug>/thing.html" target="_blank" rel="noopener">text</a>`,
  copying the referenced `.html` into `<repo>/docs/html/<article-slug>/` (configurable),
  one subfolder per article. Any `#fragment` / `?query` is preserved.
- Optionally (**Create Article TOC link**) adds/updates a link to the published
  article in an index page (`docs/articles/index.md` by default), grouped under a
  `## YYYY` heading (newest year first). Re-publishing updates the existing line in
  place instead of duplicating it.
- Injects a frontmatter block built from the first `# Heading` in the body:
  ```yaml
  ---
  title: "Sanitized Title"
  date: 2026-06-27
  hide:
    - navigation
  #  - toc
  ---
  ```
  YAML-unsafe characters in the title (`: # [ ] { } | > ! & * ? % @ \``) are stripped.
- Shows a pre-publish confirm dialog with a header showing the article **title**
  (from the first `# Heading`) and the **slugified destination filename**, followed by
  the resolved settings and destination paths in an aligned two-column grid (and warns
  if the target article already exists). Toggleable via **Confirm before publish**;
  always skipped on dry runs.
- Skips remote images (`http(s)://`, `data:`).
- Dedupes images by SHA-256; on filename collision with different content, appends a short hash suffix.

## What it does NOT do

- Does not run git. Commit/push however you normally do.
- Does not bulk-publish folders. Single active note only.
- Does not convert Obsidian callouts (`> [!note]`) to MkDocs admonitions. Flagged for a v2.
- Does not derive the filename from the title. The published filename is a websafe
  **slug of the source note's filename** (not its `# Heading` title).

## Install (manual)

ZenoPress is not in the Obsidian Community Plugins directory; install it by hand
from a GitHub release.

1. Go to the [**Releases**](../../releases/latest) page and download these three
   files from the latest release:
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. Create the folder `<your-vault>/.obsidian/plugins/zenopress/` and drop the three
   files into it.
3. In Obsidian: **Settings → Community plugins**, make sure *Restricted mode* is
   **off**, then enable **ZenoPress**.
4. Open the plugin's settings tab and set **Repo root** (absolute path to your
   GitHub Pages repo clone); adjust the Articles/Images subpaths if needed.

To update later, replace those three files with the ones from a newer release.

## Build from source / dev setup

1. **Clone or unzip this folder** somewhere convenient (NOT inside the vault).
2. `npm install`
3. `npm run dev` (watch build) or `npm run build` (one-shot production build).
4. Copy or symlink `main.js`, `manifest.json`, and `styles.css` into:
   ```
   <your-vault>/.obsidian/plugins/zenopress/
   ```
   On Windows you can do this with `mklink /J`:
   ```
   mklink /J "C:\path\to\vault\.obsidian\plugins\zenopress" "C:\path\to\this\repo"
   ```
5. In Obsidian: **Settings → Community plugins** → enable **ZenoPress**.
6. Open the plugin's settings tab and set:
   - **Repo root** (absolute path to your GitHub Pages repo clone)
   - Articles subpath (default `docs/articles`)
   - Images subpath (default `docs/images`)

## Usage

- Open the article note in Obsidian.
- Command palette: **ZenoPress: Publish current note**.
- Or use the ribbon icon (cloud-upload).
- For a no-write preview, use **Publish current note (dry run)** and open the developer console (Ctrl+Shift+I) to see what it would do.

## File layout

```
zenopress/
  main.ts                 plugin entry, command registration
  src/
    publisher.ts          orchestration: read -> transform -> write, confirm modal
    frontmatter.ts        YAML build + title sanitization
    slug.ts               websafe slug helpers (filenames + folders)
    images.ts             image resolution, copy, dedup, path rewrite (+ copyAsset)
    htmllinks.ts          local .html link rewrite + copy (reuses copyAsset)
    wikilinks.ts          non-image wikilink conversion
    toc.ts                Articles index page (TOC) add/update
    settings.ts           settings tab UI + defaults
  styles.css              publish-dialog styling (header, two-column grid, warning)
  manifest.json
  package.json
  tsconfig.json
  esbuild.config.mjs
  README.md
  .gitignore
```

## Known limitations / future work

- Non-image embeds (e.g. `![[some-note]]`) are left untouched and warned about; MkDocs won't render them.
- Wikilink resolution assumes a flat articles folder; nested article folders would need link path adjustments.
- No granular date control yet (always "today"); easy to add a setting for "from `created` frontmatter" later.
- No callout/admonition translation.
- No automatic cleanup of orphaned previously-published files: renaming a source note (or a name that changes its slug) publishes to a new filename/folder and leaves the old output behind.
- Two notes whose names slug to the same value publish to the same filename; the confirm dialog's overwrite warning is the only guard.

## Releasing (maintainer)

Releases are automated by [`.github/workflows/release.yml`](.github/workflows/release.yml),
which builds and attaches `main.js`, `manifest.json`, and `styles.css` whenever a
version tag is pushed.

```sh
npm version patch   # or minor / major — bumps manifest.json + versions.json, commits, tags (no "v" prefix)
git push --follow-tags
```

One-time repo setup: **Settings → Actions → General → Workflow permissions →
Read and write permissions** (lets the workflow create the release).

## License

MIT
