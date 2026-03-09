import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_TERMINAL } from "../constants";
import { TerminalRenderer } from "./terminal-renderer";
import { FocusManager } from "./focus-manager";
import { KeybindingHandler } from "./keybinding-handler";
import { SearchBar } from "./search-bar";
import { ThemeManager } from "./theme-manager";
import { showPtyLoadError } from "./error-display";
import { ConsentModal } from "./consent-dialog";
import { detectDefaultShell } from "../core/shell-detector";
import type { TerminalSettings } from "../types";
import type { SessionManager } from "../core/session-manager";
import type { PtyManager, PtyProcess } from "../core/pty-manager";
import type { Logger } from "../core/logger";

export interface TerminalViewDeps {
  settings: TerminalSettings;
  sessionManager: SessionManager;
  ptyManager: PtyManager | null;
  themeManager: ThemeManager;
  logger: Logger;
  consentGiven: boolean;
  onConsentGiven: () => void;
  getLatestSettings: () => TerminalSettings;
  vaultPath: string;
  platform: string;
}

export class TerminalView extends ItemView {
  private deps: TerminalViewDeps;
  private containerPanel: HTMLElement | null = null;
  private renderer: TerminalRenderer | null = null;
  private focusManager: FocusManager | null = null;
  private keybindingHandler: KeybindingHandler | null = null;
  private searchBar: SearchBar | null = null;
  private sessionId: string | null = null;
  private ptyProcess: PtyProcess | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(leaf: WorkspaceLeaf, deps: TerminalViewDeps) {
    super(leaf);
    this.deps = deps;
  }

  getViewType(): string {
    return VIEW_TYPE_TERMINAL;
  }

  getDisplayText(): string {
    return "Terminal";
  }

  getIcon(): string {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    this.containerPanel = container.createEl("div", { cls: "terminal-panel" });

    // Step 1: Check consent
    if (!this.deps.consentGiven) {
      const modal = new ConsentModal(this.app, {
        onConsent: () => {
          this.deps.onConsentGiven();
          this.initializeTerminal();
        },
        onDecline: () => {
          // Do nothing, user can reopen later
        },
      });
      modal.open();
      return;
    }

    this.initializeTerminal();
  }

  private initializeTerminal(): void {
    if (!this.containerPanel) return;

    // Step 2: Check PTY availability
    if (!this.deps.ptyManager) {
      showPtyLoadError(this.containerPanel, {
        error: "node-pty module could not be loaded",
        onRetry: () => this.initializeTerminal(),
      });
      return;
    }

    const settings = this.deps.getLatestSettings();

    // Step 3: Create renderer
    this.renderer = new TerminalRenderer({
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      scrollback: settings.scrollbackBuffer,
      lineHeight: settings.lineHeight,
      webglEnabled: settings.webglRenderer,
      onWebGLFallback: () => {
        this.deps.logger.warn("WebGL renderer failed, falling back to canvas");
      },
    });

    // Step 4: Mount renderer
    this.renderer.mount(this.containerPanel);

    // Step 5: Apply theme
    this.applyTheme();

    // Step 6: Detect shell
    const shell = settings.defaultShell || detectDefaultShell(this.deps.platform);
    const cwd = settings.defaultCwd || this.deps.vaultPath;

    // Step 7: Create session
    // Launch as login shell so /etc/zprofile (Homebrew PATH etc.) is sourced
    const shellArgs = ["--login"];
    const profile = {
      id: "default",
      name: "Default Shell",
      shellPath: shell,
      shellArgs,
      cwd,
      icon: "terminal",
    };

    const { cols, rows } = this.renderer.resize();
    const sessionInfo = this.deps.sessionManager.create(
      this.deps.ptyManager,
      { shell, args: shellArgs, cwd, cols, rows, env: {} },
      profile,
    );
    this.sessionId = sessionInfo.id;

    // Step 8: Connect PTY to renderer
    this.ptyProcess = this.deps.sessionManager.getPtyProcess(sessionInfo.id);
    if (this.ptyProcess) {
      this.renderer.connectPty(this.ptyProcess);
    }

    // Step 9: Focus manager
    this.focusManager = new FocusManager({
      bodyClassList: document.body.classList,
      restoreFocus: () => {
        // Restore focus to Obsidian
        (document.activeElement as HTMLElement)?.blur?.();
      },
    });

    // Step 10: Keybinding handler
    this.keybindingHandler = new KeybindingHandler({
      writeToPty: (data: string) => this.ptyProcess?.write(data),
      focusManager: this.focusManager,
      shiftEnterSequence: settings.shiftEnterSequence,
      passthroughKeybindings: settings.passthroughKeybindings,
      platform: this.deps.platform,
    });

    this.renderer.attachCustomKeyEventHandler((e: KeyboardEvent) =>
      this.keybindingHandler!.handle(e)
    );

    // Step 11: Search bar
    this.searchBar = new SearchBar({
      findNext: (term: string) => this.renderer?.findNext(term),
      findPrevious: (term: string) => this.renderer?.findPrevious(term),
      clearSearch: () => this.renderer?.clearSearch(),
    });

    // Register search action
    this.keybindingHandler.registerAction({
      id: "find-in-terminal",
      match: (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && e.key === "f",
      execute: () => this.toggleSearch(),
    });

    // Step 12: ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      if (this.renderer && this.ptyProcess) {
        const { cols: c, rows: r } = this.renderer.resize();
        this.ptyProcess.resize(c, r);
      }
    });
    this.resizeObserver.observe(this.containerPanel);

    // Step 13: ARIA
    this.containerPanel.setAttribute("role", "application");
    this.containerPanel.setAttribute("aria-label", "Terminal");

    // Step 14: Click-to-focus handler
    this.containerPanel.addEventListener("click", () => {
      this.focusManager?.focus();
    });

    // Auto-focus after DOM is ready
    const term = this.renderer.getTerminal();
    this.focusManager.focus();
    setTimeout(() => {
      term.focus();
    }, 200);
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Destroy PTY session first (before renderer dispose)
    this.ptyProcess = null;
    if (this.sessionId) {
      await this.deps.sessionManager.destroy(this.sessionId);
      this.sessionId = null;
    }

    try {
      this.renderer?.dispose();
    } catch {
      // Ignore xterm disposal errors (e.g. WebGL context already lost)
    }
    this.renderer = null;

    this.focusManager?.dispose();
    this.focusManager = null;

    this.searchBar?.dispose();
    this.searchBar = null;

    this.keybindingHandler = null;
    this.ptyProcess = null;

    if (this.containerPanel) {
      this.containerPanel.remove();
      this.containerPanel = null;
    }
  }

  /** Reapply theme colors to the terminal */
  applyTheme(): void {
    if (!this.renderer) return;
    const settings = this.deps.getLatestSettings();
    const themeColors = settings.theme === "obsidian"
      ? this.deps.themeManager.getObsidianTheme(document.body)
      : this.deps.themeManager.getThemeColors(settings.theme, settings.customThemeColors);
    this.renderer.getTerminal().options.theme = themeColors;
  }

  /** Clear the terminal content */
  clearTerminal(): void {
    this.renderer?.clearTerminal();
  }

  /** Toggle the search bar */
  toggleSearch(): void {
    if (this.containerPanel && this.searchBar) {
      this.searchBar.toggle(this.containerPanel);
    }
  }

  /** Focus the terminal */
  focusTerminal(): void {
    this.focusManager?.focus();
    this.renderer?.getTerminal().focus();
  }

  /** Unfocus the terminal */
  unfocusTerminal(): void {
    this.focusManager?.unfocus();
  }
}
