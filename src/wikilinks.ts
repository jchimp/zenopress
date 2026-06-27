import { App, TFile } from "obsidian";
import * as path from "path";
import { slugify, slugifyFilename } from "./slug";

export interface WikilinkContext {
  app: App;
  sourceFile: TFile;
  behavior: "convert-warn" | "strip";
  warnings: string[];
}

/**
 * Convert Obsidian non-image wikilinks: [[Note]] / [[Note|alias]]
 *
 *  - convert-warn: produce `[alias-or-target](target.md)`; warn if unresolved
 *  - strip:        produce just the visible text (alias if present, else target)
 *
 * Image embeds (`![[...]]`) are handled in images.ts and ignored here.
 * Standard `[text](url)` MD links are left untouched.
 */
export function rewriteWikilinks(body: string, ctx: WikilinkContext): string {
  return body.replace(/(?<!\!)\[\[([^\]]+?)\]\]/g, (match, inner: string) => {
    const [linkRaw, aliasRaw] = inner.split("|");
    const target = linkRaw.trim();
    const alias = aliasRaw?.trim();
    const visible = alias && alias.length > 0 ? alias : target;

    if (ctx.behavior === "strip") return visible;

    const resolved = ctx.app.metadataCache.getFirstLinkpathDest(target, ctx.sourceFile.path);
    if (!resolved) {
      ctx.warnings.push(`Unresolved wikilink: ${match}`);
      // Best effort: slug the target and assume a .md neighbor.
      const guess = slugify(target) + ".md";
      return `[${visible}](${guess})`;
    }

    // Neighboring articles are published under their slugged filename in one flat
    // folder, so link to the slugged basename of the resolved note.
    const base = slugifyFilename(path.basename(resolved.path));
    return `[${visible}](${base})`;
  });
}
