import { App, PluginSettingTab, Setting } from "obsidian";
import type ZenoPressPlugin from "../main";

export interface ZenoPressSettings {
  repoRoot: string;
  articlesSubpath: string;
  imagesSubpath: string;
  imageLinkPrefix: string;
  htmlSubpath: string;
  htmlLinkPrefix: string;
  wikilinkBehavior: "convert-warn" | "strip";
  createTocLink: boolean;
  tocIndexPath: string;
  imagesAsHtml: boolean;
  imageHtmlWidth: string;
  confirmBeforePublish: boolean;
}

export const DEFAULT_SETTINGS: ZenoPressSettings = {
  repoRoot: "",
  articlesSubpath: "docs/articles",
  imagesSubpath: "docs/images",
  imageLinkPrefix: "../images/",
  htmlSubpath: "docs/html",
  htmlLinkPrefix: "../html/",
  wikilinkBehavior: "convert-warn",
  createTocLink: false,
  tocIndexPath: "docs/articles/index.md",
  imagesAsHtml: false,
  imageHtmlWidth: "100%",
  confirmBeforePublish: true
};

export class ZenoPressSettingTab extends PluginSettingTab {
  plugin: ZenoPressPlugin;

  constructor(app: App, plugin: ZenoPressPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "ZenoPress Settings" });

    new Setting(containerEl)
      .setName("Repo root")
      .setDesc("Absolute path to your local GitHub Pages repo (e.g. C:\\repos\\my-site)")
      .addText((text) =>
        text
          .setPlaceholder("C:\\repos\\my-site")
          .setValue(this.plugin.settings.repoRoot)
          .onChange(async (value) => {
            this.plugin.settings.repoRoot = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Articles subpath")
      .setDesc("Relative to repo root. Markdown files land here.")
      .addText((text) =>
        text
          .setPlaceholder("docs/articles")
          .setValue(this.plugin.settings.articlesSubpath)
          .onChange(async (value) => {
            this.plugin.settings.articlesSubpath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Images subpath")
      .setDesc("Relative to repo root. Images land here, in a per-article subfolder. Folder and filenames are slugified websafe (lowercase, dashes).")
      .addText((text) =>
        text
          .setPlaceholder("docs/images")
          .setValue(this.plugin.settings.imagesSubpath)
          .onChange(async (value) => {
            this.plugin.settings.imagesSubpath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Image link prefix")
      .setDesc("What gets prepended to image filenames in the rewritten MD (relative from articles folder). The per-article subfolder is appended automatically.")
      .addText((text) =>
        text
          .setPlaceholder("../images/")
          .setValue(this.plugin.settings.imageLinkPrefix)
          .onChange(async (value) => {
            this.plugin.settings.imageLinkPrefix = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("HTML subpath")
      .setDesc("Relative to repo root. Linked .html files land here, in a per-article subfolder. Folder and filenames are slugified websafe (lowercase, dashes).")
      .addText((text) =>
        text
          .setPlaceholder("docs/html")
          .setValue(this.plugin.settings.htmlSubpath)
          .onChange(async (value) => {
            this.plugin.settings.htmlSubpath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("HTML link prefix")
      .setDesc("What gets prepended to .html filenames in the rewritten link (relative from articles folder). The per-article subfolder is appended automatically.")
      .addText((text) =>
        text
          .setPlaceholder("../html/")
          .setValue(this.plugin.settings.htmlLinkPrefix)
          .onChange(async (value) => {
            this.plugin.settings.htmlLinkPrefix = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Wikilink behavior (non-image)")
      .setDesc("How to handle [[note]] links to other notes.")
      .addDropdown((dd) =>
        dd
          .addOption("convert-warn", "Convert to MD link + warn if unresolved")
          .addOption("strip", "Strip to plain text")
          .setValue(this.plugin.settings.wikilinkBehavior)
          .onChange(async (value: "convert-warn" | "strip") => {
            this.plugin.settings.wikilinkBehavior = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Images as HTML")
      .setDesc("Emit images as a clickable <a><img> that opens the full image in a new tab, instead of Markdown ![]().")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.imagesAsHtml).onChange(async (value) => {
          this.plugin.settings.imagesAsHtml = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Image HTML width")
      .setDesc("Width attribute applied when 'Images as HTML' is on (e.g. 100% or 600).")
      .addText((text) =>
        text
          .setPlaceholder("100%")
          .setValue(this.plugin.settings.imageHtmlWidth)
          .onChange(async (value) => {
            this.plugin.settings.imageHtmlWidth = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Create Article TOC link")
      .setDesc("On publish, add/update a link to this article in the Articles index page.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.createTocLink).onChange(async (value) => {
          this.plugin.settings.createTocLink = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("TOC index path")
      .setDesc("Relative to repo root. The index.md whose article list gets updated.")
      .addText((text) =>
        text
          .setPlaceholder("docs/articles/index.md")
          .setValue(this.plugin.settings.tocIndexPath)
          .onChange(async (value) => {
            this.plugin.settings.tocIndexPath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Confirm before publish")
      .setDesc("Show a dialog listing the settings and destination paths before each publish.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.confirmBeforePublish).onChange(async (value) => {
          this.plugin.settings.confirmBeforePublish = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
