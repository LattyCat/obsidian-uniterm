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
import { TerminalSettingTab } from "./settings/settings-tab";
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

    const vaultBasePath = this.getVaultBasePath();
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
      newTab: () => this.createNewTerminalTab(),
      closeTab: () => {
        const view = this.getActiveTerminalView();
        if (view) {
          view.leaf.detach();
        }
      },
      getActiveTerminalView: () => this.getActiveTerminalView(),
    });

    this.addRibbonIcon("terminal", "Open UniTerm", () => {
      this.toggleTerminalPanel();
    });

    this.addSettingTab(new TerminalSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf | null) => {
        this.handleActiveLeafChange(leaf);
      })
    );

    this.registerEvent(
      this.app.workspace.on("css-change", () => this.onThemeChange())
    );
  }

  async onunload(): Promise<void> {
    await this.sessionManager.destroyAll();
  }

  async toggleTerminalPanel(): Promise<void> {
    const leaf = this.app.workspace.getLeaf("split", "horizontal");
    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_TERMINAL,
        active: true,
      });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  /** Create a new terminal as an Obsidian native tab */
  async createNewTerminalTab(): Promise<void> {
    const leaf = this.app.workspace.getLeaf("tab");
    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_TERMINAL,
        active: true,
      });
      this.app.workspace.revealLeaf(leaf);
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
      vaultPath: this.getVaultBasePath(),
      platform: process.platform,
      onSaveSettings: (updates: Partial<TerminalSettings>) => {
        this.updateSettings(updates);
      },
      onNewTerminalTab: () => {
        this.createNewTerminalTab();
      },
    };
  }

  private getActiveTerminalView(): TerminalView | null {
    // Return the currently active terminal view (works with multiple leaves)
    const activeView = this.app.workspace.getActiveViewOfType(TerminalView);
    if (activeView) return activeView;

    // Fallback: return the first terminal leaf if none is active
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);
    if (leaves.length === 0) return null;
    return leaves[0].view as TerminalView;
  }

  /** Get the vault base path (Obsidian internal API, not in public typings) */
  private getVaultBasePath(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.app.vault as any).adapter?.basePath || "";
  }

  private handleActiveLeafChange(leaf: WorkspaceLeaf | null): void {
    if (!leaf) return;

    const viewState = (leaf as any).getViewState();
    if (viewState.type !== "empty") return;

    const terminalLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);
    const sameGroup = terminalLeaves.some(
      (termLeaf: WorkspaceLeaf) => (termLeaf as any).parent === (leaf as any).parent
    );

    if (sameGroup) {
      (leaf as any).setViewState({
        type: VIEW_TYPE_TERMINAL,
        active: true,
      });
    }
  }

  private onThemeChange(): void {
    this.logger.debug("Theme change detected, reapplying to all views");
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);
    for (const leaf of leaves) {
      (leaf.view as TerminalView).applyTheme();
    }
  }

  /** Update settings and persist, then notify active terminal views */
  async updateSettings(updates: Partial<TerminalSettings>): Promise<void> {
    Object.assign(this.settings, updates);
    await saveSettings(this, this.settings);
    this.applySettingsToViews();
  }

  private applySettingsToViews(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);
    for (const leaf of leaves) {
      const view = leaf.view as TerminalView;
      if (view && typeof view.applySettings === "function") {
        view.applySettings(this.settings);
      }
    }
  }
}
