import { App, TFile } from "obsidian";
import { copyAsset } from "./images";

export interface HtmlLinkContext {
  app: App;
  sourceFile: TFile;
  htmlAbsDir: string;
  htmlLinkPrefix: string;
  dryRun: boolean;
  warnings: string[];
  log: string[];
}

/**
 * Rewrite standard Markdown links that point to a local `.html` file:
 *   [text](thing.html)  ->  <a href="../html/<article>/thing.html" target="_blank" rel="noopener">text</a>
 *
 * The referenced `.html` file is copied into the repo's html folder (same flow
 * as images, via {@link copyAsset}). The caller points `htmlAbsDir` and
 * `htmlLinkPrefix` at a per-article subfolder. Remote (`http(s):`, `mailto:`) and
 * pure anchor (`#...`) targets are left untouched since there is nothing to copy.
 *
 * Image syntax `![alt](x.html)` is ignored via a negative lookbehind, and
 * wikilink `[[...]]` syntax is handled elsewhere.
 */
export function rewriteHtmlLinks(body: string, ctx: HtmlLinkContext): string {
  return body.replace(
    /(?<!\!)\[([^\]]+)\]\(\s*([^)\s]+\.html(?:[#?][^)\s]*)?)(?:\s+"[^"]*")?\s*\)/gi,
    (match, text: string, url: string) => {
      if (/^(https?:|#|mailto:|data:)/i.test(url)) return match;

      // Split off any #fragment / ?query so we resolve the bare file, then
      // re-append it to the rewritten URL.
      const suffixMatch = url.match(/[#?].*$/);
      const suffix = suffixMatch ? suffixMatch[0] : "";
      const localPath = decodeURI(suffix ? url.slice(0, url.length - suffix.length) : url);

      const result = copyAsset(localPath, ctx.htmlAbsDir, ctx);
      if (result.action === "missing-source") {
        ctx.warnings.push(`HTML link could not be resolved: ${match}`);
        return match;
      }

      const newUrl = ctx.htmlLinkPrefix + result.finalName + suffix;
      return `<a href="${newUrl}" target="_blank" rel="noopener">${text}</a>`;
    }
  );
}
