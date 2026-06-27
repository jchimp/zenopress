import { App, Modal, Notice, Setting, TFile } from "obsidian";
import * as fs from "fs";
import * as path from "path";
import { ZenoPressSettings } from "./settings";
import {
  buildFrontmatter,
  extractTitleFromBody,
  stripExistingFrontmatter,
  todayISODate
} from "./frontmatter";
import { rewriteImages } from "./images";
import { rewriteHtmlLinks } from "./htmllinks";
import { rewriteWikilinks } from "./wikilinks";
import { updateToc } from "./toc";
import { slugify } from "./slug";

export interface PublishOptions {
  dryRun: boolean;
}

export async function publishActiveNote(
  app: App,
  settings: ZenoPressSettings,
  opts: PublishOptions
): Promise<void> {
  const file = app.workspace.getActiveFile();
  if (!file) {
    new Notice("ZenoPress: no active note");
    return;
  }
  if (file.extension !== "md") {
    new Notice("ZenoPress: active file is not a Markdown note");
    return;
  }

  if (!settings.repoRoot) {
    new Notice("ZenoPress: set the Repo root in settings first");
    return;
  }
  if (!fs.existsSync(settings.repoRoot)) {
    new Notice(`ZenoPress: repo root does not exist: ${settings.repoRoot}`);
    return;
  }

  const articlesAbsDir = path.join(settings.repoRoot, settings.articlesSubpath);
  const imagesAbsDir = path.join(settings.repoRoot, settings.imagesSubpath);
  const htmlAbsDir = path.join(settings.repoRoot, settings.htmlSubpath);
  const tocAbsPath = path.join(settings.repoRoot, settings.tocIndexPath);

  // Slugify the note name once, up front, so the published .md, its per-article
  // asset subfolder, and every rewritten link all derive from the same websafe path.
  const articleSlug = slugify(file.basename) || "untitled";
  const imagesArticleAbsDir = path.join(imagesAbsDir, articleSlug);
  const htmlArticleAbsDir = path.join(htmlAbsDir, articleSlug);
  const imageLinkPrefix = settings.imageLinkPrefix + articleSlug + "/";
  const htmlLinkPrefix = settings.htmlLinkPrefix + articleSlug + "/";

  // Publish under the slugged filename (not the verbatim source name).
  const targetMdAbs = path.join(articlesAbsDir, articleSlug + ".md");

  const exists = fs.existsSync(targetMdAbs);

  // Read the body up front so the confirm dialog can show the article title
  // (first H1) alongside the slugified destination filename. Reused downstream.
  const original = await app.vault.read(file);
  const displayTitle = extractTitleFromBody(original, file.basename);

  if (!opts.dryRun && settings.confirmBeforePublish) {
    const confirmed = await confirmPublish(app, {
      title: displayTitle,
      slugFilename: articleSlug + ".md",
      sourcePath: file.path,
      targetMdAbs,
      imagesAbsDir: imagesArticleAbsDir,
      htmlAbsDir: htmlArticleAbsDir,
      tocAbsPath,
      settings,
      exists
    });
    if (!confirmed) {
      new Notice("Publish cancelled.");
      return;
    }
  }

  // Read the note's own frontmatter description (before we strip it) for the
  // TOC entry. metadataCache gives us the parsed value cleanly.
  const fmDescription =
    app.metadataCache.getFileCache(file)?.frontmatter?.description;
  const description =
    typeof fmDescription === "string" && fmDescription.trim().length > 0
      ? fmDescription.trim()
      : null;

  // Transform pipeline.
  const warnings: string[] = [];
  const log: string[] = [];

  let body = stripExistingFrontmatter(original);

  body = rewriteImages(body, {
    app,
    sourceFile: file,
    repoRoot: settings.repoRoot,
    imagesAbsDir: imagesArticleAbsDir,
    imageLinkPrefix,
    imagesAsHtml: settings.imagesAsHtml,
    imageHtmlWidth: settings.imageHtmlWidth,
    dryRun: opts.dryRun,
    warnings,
    log
  });

  body = rewriteHtmlLinks(body, {
    app,
    sourceFile: file,
    htmlAbsDir: htmlArticleAbsDir,
    htmlLinkPrefix,
    dryRun: opts.dryRun,
    warnings,
    log
  });

  body = rewriteWikilinks(body, {
    app,
    sourceFile: file,
    behavior: settings.wikilinkBehavior,
    warnings
  });

  const { yaml, title } = buildFrontmatter(body, file.basename);
  const finalContent = yaml + body.trimStart();

  if (settings.createTocLink) {
    updateToc({
      tocAbsPath,
      articleFileName: articleSlug + ".md",
      title,
      description,
      year: todayISODate().slice(0, 4),
      dryRun: opts.dryRun,
      warnings,
      log
    });
  }

  if (opts.dryRun) {
    console.group("[ZenoPress] Dry run");
    console.log("Source note:", file.path);
    console.log("Would write:", targetMdAbs);
    console.log("Overwrite?:", exists);
    console.log("--- Frontmatter ---");
    console.log(yaml);
    console.log("--- Image / file log ---");
    log.forEach((l) => console.log(l));
    if (warnings.length) {
      console.warn("--- Warnings ---");
      warnings.forEach((w) => console.warn(w));
    }
    console.log("--- Final body preview (first 800 chars) ---");
    console.log(finalContent.slice(0, 800));
    console.groupEnd();
    new Notice(
      `Dry run complete. ${log.length} file ops, ${warnings.length} warnings. See console.`
    );
    return;
  }

  fs.mkdirSync(articlesAbsDir, { recursive: true });
  fs.writeFileSync(targetMdAbs, finalContent, "utf8");

  const summary = `Published ${file.name}` +
    (warnings.length ? ` with ${warnings.length} warning(s).` : ".");
  new Notice(summary);

  if (warnings.length) {
    console.group("[ZenoPress] Warnings");
    warnings.forEach((w) => console.warn(w));
    console.groupEnd();
  }
}

interface PublishSummary {
  title: string;
  slugFilename: string;
  sourcePath: string;
  targetMdAbs: string;
  imagesAbsDir: string;
  htmlAbsDir: string;
  tocAbsPath: string;
  settings: ZenoPressSettings;
  exists: boolean;
}

function confirmPublish(app: App, summary: PublishSummary): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new PublishConfirmModal(app, summary, resolve);
    modal.open();
  });
}

class PublishConfirmModal extends Modal {
  private resolved = false;
  constructor(
    app: App,
    private summary: PublishSummary,
    private resolve: (v: boolean) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    const s = this.summary;
    this.modalEl.addClass("zp-modal");
    titleEl.setText("ZenoPress — publish?");

    // Header: article title (from H1) + the slugified destination filename.
    const header = contentEl.createDiv({ cls: "zp-modal-header" });
    const titleRow = header.createDiv({ cls: "zp-header-row" });
    titleRow.createDiv({ cls: "zp-header-label", text: "Title" });
    titleRow.createDiv({ cls: "zp-header-value", text: s.title });
    const slugRow = header.createDiv({ cls: "zp-header-row" });
    slugRow.createDiv({ cls: "zp-header-label", text: "Publishes as" });
    slugRow.createDiv({ cls: "zp-header-value zp-mono", text: s.slugFilename });

    const rows: Array<[string, string]> = [
      ["Source note", s.sourcePath],
      ["Article →", s.targetMdAbs],
      ["Images →", s.imagesAbsDir],
      ["HTML →", s.htmlAbsDir]
    ];
    if (s.settings.createTocLink) rows.push(["TOC index →", s.tocAbsPath]);
    rows.push([
      "Images mode",
      s.settings.imagesAsHtml ? `HTML <img> (width ${s.settings.imageHtmlWidth})` : "Markdown ![]()"
    ]);
    rows.push(["Wikilinks", s.settings.wikilinkBehavior]);

    const grid = contentEl.createDiv({ cls: "zp-field-grid" });
    for (const [k, v] of rows) {
      grid.createDiv({ cls: "zp-field-label", text: k });
      grid.createDiv({ cls: "zp-field-value", text: v });
    }

    if (s.exists) {
      contentEl.createEl("p", {
        cls: "zp-warning",
        text: "⚠ The target article already exists and will be overwritten."
      });
    }

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          this.resolved = true;
          this.resolve(false);
          this.close();
        })
      )
      .addButton((b) =>
        b
          .setButtonText("Publish")
          .setCta()
          .onClick(() => {
            this.resolved = true;
            this.resolve(true);
            this.close();
          })
      );
  }

  onClose(): void {
    if (!this.resolved) this.resolve(false);
    this.contentEl.empty();
  }
}
