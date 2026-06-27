import * as fs from "fs";

export interface TocUpdateContext {
  /** Absolute path to the index.md whose article list gets updated. */
  tocAbsPath: string;
  /** Filename of the published article, e.g. "my-article.md". */
  articleFileName: string;
  /** Article title (used as the link text). */
  title: string;
  /** Optional one-line description from the note's frontmatter. */
  description: string | null;
  /** Publish year, e.g. "2026". */
  year: string;
  dryRun: boolean;
  warnings: string[];
  log: string[];
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Seed content for an index.md that does not yet exist. */
function seedIndex(): string {
  return (
    `---\n` +
    `title: Articles\n` +
    `hide:\n` +
    `  - navigation\n` +
    `#  - toc\n` +
    `---\n\n` +
    `# Articles\n`
  );
}

/**
 * Add or update a link to the published article in the Articles index page.
 *
 * Entry format:  `- **[Title](file.md)** - Description.`
 *
 * Entries are grouped under `## YYYY` headings (newest year first). Re-publishing
 * the same article updates its existing line in place rather than duplicating it.
 */
export function updateToc(ctx: TocUpdateContext): void {
  const entry =
    `- **[${ctx.title}](${ctx.articleFileName})**` +
    (ctx.description ? ` - ${ctx.description}` : "");

  let content: string;
  if (fs.existsSync(ctx.tocAbsPath)) {
    content = fs.readFileSync(ctx.tocAbsPath, "utf8");
  } else {
    content = seedIndex();
    ctx.warnings.push(`TOC index did not exist, created: ${ctx.tocAbsPath}`);
  }

  const lines = content.split(/\r?\n/);

  // 1. If a line already links to this article, replace it in place.
  const linkRe = new RegExp(`\\]\\(${escapeRegExp(ctx.articleFileName)}\\)`);
  const existingIdx = lines.findIndex((l) => linkRe.test(l));
  if (existingIdx !== -1) {
    lines[existingIdx] = entry;
    writeOrLog(lines.join("\n"), entry, ctx, "updated");
    return;
  }

  // 2. Insert under the `## YYYY` heading, creating it if missing.
  const yearHeadingIdx = lines.findIndex(
    (l) => l.trim() === `## ${ctx.year}`
  );

  if (yearHeadingIdx !== -1) {
    // Insert as the first bullet directly under the year heading. Skip a single
    // blank line that conventionally follows the heading.
    let insertAt = yearHeadingIdx + 1;
    if (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
    lines.splice(insertAt, 0, entry, "");
  } else {
    // Create a new year heading right after the `# Articles` H1 (newest on top).
    const h1Idx = lines.findIndex((l) => /^#\s+/.test(l));
    const anchor = h1Idx !== -1 ? h1Idx + 1 : lines.length;
    lines.splice(anchor, 0, "", `## ${ctx.year}`, "", entry);
  }

  writeOrLog(lines.join("\n"), entry, ctx, "added");
}

function writeOrLog(
  newContent: string,
  entry: string,
  ctx: TocUpdateContext,
  action: "added" | "updated"
): void {
  if (ctx.dryRun) {
    ctx.log.push(`[dry-run] would ${action} TOC entry in ${ctx.tocAbsPath}: ${entry}`);
    return;
  }
  fs.writeFileSync(ctx.tocAbsPath, newContent, "utf8");
  ctx.log.push(`${action} TOC entry in ${ctx.tocAbsPath}: ${entry}`);
}
