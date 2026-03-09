import { Plugin, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_TERMINAL } from "./constants";
import { TerminalView } from "./ui/terminal-view";
import type { TerminalViewDeps } from "./ui/terminal-view";
import { SessionManager } from "./core/session-manager";
import { PtyManager } from "./core/pty-manager";
import { loadNodePty } from "./core/electron-bridge";
import { ThemeManager } from "./ui/theme-manager";
import { createLogger } from "./core/logger";
import type { Logger } from "./core/logger";
import { loadSettings, saveSettings } from "./settings/settings-data";
import { registerCommands } from "./integration/obsidian-commands";
import type { TerminalSettings } from "./types";

export default class TerminalPlugin extends Plugin {
  settings!: TerminalSettings;
  sessionManager: SessionManager = new SessionManager();
  ptyManager: PtyManager | null = null;
  themeManager!: ThemeManager;
  logger!: Logger;

  async onload(): Promise<void> {
    this.settings = await loadSettings(this);
    this.logger = createLogger(this.settings.debugLog);

    const vaultBasePath = (this.app.vault as any).adapter?.basePath || "";
    const manifestDir = this.manifest.dir || "";
    // Build absolute plugin path without require("path") (esbuild externalizes it)
    const pluginDir = manifestDir
      ? vaultBasePath + "/" + manifestDir
      : undefined;
    const { pty, error } = loadNodePty(pluginDir);
    this.ptyManager = pty ? new PtyManager(pty) : null;
    if (error) this.logger.error(error);

    this.themeManager = new ThemeManager({
      getComputedStyle: window.getComputedStyle.bind(window),
    });

    this.registerView(VIEW_TYPE_TERMINAL, (leaf: WorkspaceLeaf) => {
      return new TerminalView(leaf, this.createViewDeps());
    });

    registerCommands(this, {
      toggleTerminal: () => this.toggleTerminalPanel(),
      focusTerminal: () => this.getActiveTerminalView()?.focusTerminal(),
      unfocusTerminal: () => this.getActiveTerminalView()?.unfocusTerminal(),
      clearTerminal: () => this.getActiveTerminalView()?.clearTerminal(),
      findInTerminal: () => this.getActiveTerminalView()?.toggleSearch(),
      getActiveTerminalView: () => this.getActiveTerminalView(),
    });

    this.addRibbonIcon("terminal", "Open Terminal", () => {
      this.toggleTerminalPanel();
    });

    this.registerEvent(
      this.app.workspace.on("css-change", () => this.onThemeChange())
    );
  }

  async onunload(): Promise<void> {
    await this.sessionManager.destroyAll();
  }

  async toggleTerminalPanel(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);

    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
    } else {
      // Open in bottom panel (like VSCode's integrated terminal)
      const leaf = this.app.workspace.getLeaf("split", "horizontal");
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_TERMINAL,
          active: true,
        });
        this.app.workspace.revealLeaf(leaf);
      }
    }
  }

  private createViewDeps(): TerminalViewDeps {
    return {
      settings: { ...this.settings },
      sessionManager: this.sessionManager,
      ptyManager: this.ptyManager,
      themeManager: this.themeManager,
      logger: this.logger,
      consentGiven: this.settings.consentGiven,
      onConsentGiven: () => {
        this.settings.consentGiven = true;
        saveSettings(this, this.settings);
      },
      getLatestSettings: () => ({ ...this.settings }),
      vaultPath: (this.app.vault as any).adapter?.basePath || "",
      platform: process.platform,
    };
  }

  private getActiveTerminalView(): TerminalView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);
    if (leaves.length === 0) return null;
    return leaves[0].view as TerminalView;
  }

  private onThemeChange(): void {
    this.logger.debug("Theme change detected, reapplying to all views");
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);
    for (const leaf of leaves) {
      (leaf.view as TerminalView).applyTheme();
    }
  }

  /** Update settings and persist */
  async updateSettings(updates: Partial<TerminalSettings>): Promise<void> {
    Object.assign(this.settings, updates);
    await saveSettings(this, this.settings);
  }
}
