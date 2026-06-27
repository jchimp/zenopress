import { Plugin } from "obsidian";
import {
  DEFAULT_SETTINGS,
  ZenoPressSettings,
  ZenoPressSettingTab
} from "./src/settings";
import { publishActiveNote } from "./src/publisher";

export default class ZenoPressPlugin extends Plugin {
  settings!: ZenoPressSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "zenopress-publish-current",
      name: "Publish current note",
      callback: () => publishActiveNote(this.app, this.settings, { dryRun: false })
    });

    this.addCommand({
      id: "zenopress-publish-current-dry-run",
      name: "Publish current note (dry run)",
      callback: () => publishActiveNote(this.app, this.settings, { dryRun: true })
    });

    this.addRibbonIcon("upload-cloud", "Publish to ZenoPress", () => {
      publishActiveNote(this.app, this.settings, { dryRun: false });
    });

    this.addSettingTab(new ZenoPressSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
