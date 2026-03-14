import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_TERMINAL } from "../constants";
import { TerminalRenderer } from "./terminal-renderer";
import { FocusManager } from "./focus-manager";
import { KeybindingHandler } from "./keybinding-handler";
import { SearchBar } from "./search-bar";
import { ThemeManager } from "./theme-manager";
import { showPtyLoadError } from "./error-display";
import { ConsentModal } from "./consent-dialog";
import { DragDropHandler } from "../integration/drag-drop-handler";
import { ResizeHandle } from "./resize-handle";
import { MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT_RATIO } from "../constants";
import { detectDefaultShell } from "../core/shell-detector";
import type { TerminalSettings } from "../types";
import type { SessionManager } from "../core/session-manager";
import type { PtyManager, PtyProcess } from "../core/pty-manager";
import type { Logger } from "../core/logger";
import type { ShellType } from "../integration/drag-drop-handler";

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
  onSaveSettings?: (updates: Partial<TerminalSettings>) => void;
  onNewTerminalTab?: () => void;
}

export class TerminalView extends ItemView {
  private deps: TerminalViewDeps;
  private containerPanel: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Single session state (replaces TabInstanceState map)
  private renderer: TerminalRenderer | null = null;
  private ptyProcess: PtyProcess | null = null;
  private searchBar: SearchBar | null = null;
  private keybindingHandler: KeybindingHandler | null = null;
  private focusManager: FocusManager | null = null;
  private dragDropHandler: DragDropHandler | null = null;
  private resizeHandle: ResizeHandle | null = null;
  private sessionId: string | null = null;

  constructor(leaf: WorkspaceLeaf, deps: TerminalViewDeps) {
    super(leaf);
    this.deps = deps;
    this.navigation = false;
  }

  getViewType(): string {
    return VIEW_TYPE_TERMINAL;
  }

  getDisplayText(): string {
    return "UniTerm";
  }

  getIcon(): string {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    this.containerPanel = container.createEl("div", { cls: "terminal-panel" });

    if (!this.deps.consentGiven) {
      const modal = new ConsentModal(this.app, {
        onConsent: () => {
          this.deps.onConsentGiven();
          this.initializeTerminal();
        },
        onDecline: () => {},
      });
      modal.open();
      return;
    }

    this.initializeTerminal();
  }

  private initializeTerminal(): void {
    if (!this.containerPanel) return;

    if (!this.deps.ptyManager) {
      showPtyLoadError(this.containerPanel, {
        error: "node-pty module could not be loaded",
        onRetry: () => this.initializeTerminal(),
      });
      return;
    }

    const settings = this.deps.getLatestSettings();

    // Header action: "+" button to create a new terminal tab
    if (this.deps.onNewTerminalTab) {
      this.addAction("plus", "New terminal tab", () => {
        this.deps.onNewTerminalTab!();
      });
    }

    // ARIA
    this.containerPanel.setAttribute("role", "application");
    this.containerPanel.setAttribute("aria-label", "UniTerm");

    // ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeTerminal();
    });
    this.resizeObserver.observe(this.containerPanel);

    // Restore saved panel height (only if user has explicitly resized)
    if (settings.panelHeight && settings.panelHeight !== 300 && this.containerPanel.closest) {
      const leafEl = this.containerPanel.closest(".workspace-leaf") as HTMLElement | null;
      if (leafEl) {
        ResizeHandle.applyHeightToLeaf(leafEl, settings.panelHeight);
      }
    }

    // Create the single terminal session
    this.createSession();
  }

  /** Create and mount the single terminal session */
  private createSession(): void {
    const settings = this.deps.getLatestSettings();

    if (!this.deps.ptyManager || !this.containerPanel) return;

    // Detect shell
    const shell = settings.defaultShell || detectDefaultShell(this.deps.platform);
    const cwd = settings.defaultCwd || this.deps.vaultPath;
    const shellArgs = ["--login"];

    // Create renderer
    const renderer = new TerminalRenderer({
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

    renderer.mount(this.containerPanel);

    // Apply theme
    const themeColors =
      settings.theme === "obsidian"
        ? this.deps.themeManager.getObsidianTheme(document.body)
        : this.deps.themeManager.getThemeColors(
            settings.theme,
            settings.customThemeColors,
          );
    renderer.getTerminal().options.theme = themeColors;

    // Create session
    const { cols, rows } = renderer.resize();
    const sessionInfo = this.deps.sessionManager.create(
      this.deps.ptyManager,
      { shell, args: shellArgs, cwd, cols, rows, env: {} },
    );

    // Connect PTY
    const ptyProcess = this.deps.sessionManager.getPtyProcess(sessionInfo.id);
    if (ptyProcess) {
      renderer.connectPty(ptyProcess);
    }

    // Focus manager
    const focusManager = new FocusManager({
      bodyClassList: document.body.classList,
      restoreFocus: () => {
        (document.activeElement as HTMLElement)?.blur?.();
      },
    });

    // Keybinding handler
    const keybindingHandler = new KeybindingHandler({
      writeToPty: (data: string) => ptyProcess?.write(data),
      focusManager,
      shiftEnterSequence: settings.shiftEnterSequence,
      passthroughKeybindings: settings.passthroughKeybindings,
      platform: this.deps.platform,
    });

    renderer.attachCustomKeyEventHandler((e: KeyboardEvent) =>
      keybindingHandler.handle(e),
    );

    // Search bar
    const searchBar = new SearchBar({
      findNext: (term: string) => renderer.findNext(term),
      findPrevious: (term: string) => renderer.findPrevious(term),
      clearSearch: () => renderer.clearSearch(),
    });

    keybindingHandler.registerAction({
      id: "find-in-terminal",
      match: (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && e.key === "f",
      execute: () => {
        searchBar.toggle(this.containerPanel!);
      },
    });

    // Drag & Drop handler
    const dragDropHandler = new DragDropHandler({
      container: this.containerPanel,
      vaultPath: this.deps.vaultPath,
      getShellType: () => this.detectShellType(shell),
      writeToPty: (data: string) => ptyProcess?.write(data),
      getInternalDragPath: () => {
        const draggable = (this.app as any).dragManager?.draggable;
        return draggable?.file?.path ?? draggable?.path ?? null;
      },
    });

    // Resize handle
    const resizeHandle = new ResizeHandle({
      container: this.containerPanel,
      initialHeight: settings.panelHeight,
      minHeight: MIN_PANEL_HEIGHT,
      maxHeightRatio: MAX_PANEL_HEIGHT_RATIO,
      onResize: () => this.resizeTerminal(),
      onResizeEnd: (height: number) => {
        this.deps.onSaveSettings?.({ panelHeight: height });
      },
    });

    // Click-to-focus
    this.containerPanel.addEventListener("click", () => {
      focusManager.focus();
    });

    // Store state
    this.renderer = renderer;
    this.ptyProcess = ptyProcess;
    this.searchBar = searchBar;
    this.keybindingHandler = keybindingHandler;
    this.focusManager = focusManager;
    this.dragDropHandler = dragDropHandler;
    this.resizeHandle = resizeHandle;
    this.sessionId = sessionInfo.id;
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Destroy session
    if (this.sessionId) {
      this.ptyProcess = null;
      await this.deps.sessionManager.destroy(this.sessionId);
    }

    // Dispose components
    this.searchBar?.dispose();
    this.dragDropHandler?.dispose();
    this.resizeHandle?.dispose();
    this.focusManager?.dispose();

    try {
      this.renderer?.dispose();
    } catch {
      // Ignore xterm disposal errors
    }

    this.renderer = null;
    this.searchBar = null;
    this.keybindingHandler = null;
    this.focusManager = null;
    this.dragDropHandler = null;
    this.resizeHandle = null;
    this.sessionId = null;

    if (this.containerPanel) {
      this.containerPanel.remove();
      this.containerPanel = null;
    }
  }

  /** Reapply theme colors */
  applyTheme(): void {
    if (!this.renderer) return;
    const settings = this.deps.getLatestSettings();
    const themeColors =
      settings.theme === "obsidian"
        ? this.deps.themeManager.getObsidianTheme(document.body)
        : this.deps.themeManager.getThemeColors(
            settings.theme,
            settings.customThemeColors,
          );
    this.renderer.getTerminal().options.theme = themeColors;
  }

  /** Clear the terminal */
  clearTerminal(): void {
    this.renderer?.clearTerminal();
  }

  /** Toggle search bar */
  toggleSearch(): void {
    if (this.searchBar && this.containerPanel) {
      this.searchBar.toggle(this.containerPanel);
    }
  }

  /** Focus the terminal */
  focusTerminal(): void {
    if (this.focusManager && this.renderer) {
      this.focusManager.focus();
      this.renderer.getTerminal().focus();
    }
  }

  /** Unfocus the terminal */
  unfocusTerminal(): void {
    this.focusManager?.unfocus();
  }

  /** Apply updated settings */
  applySettings(settings: TerminalSettings): void {
    if (!this.renderer) return;
    const themeColors =
      settings.theme === "obsidian"
        ? this.deps.themeManager.getObsidianTheme(document.body)
        : this.deps.themeManager.getThemeColors(
            settings.theme,
            settings.customThemeColors,
          );

    const terminal = this.renderer.getTerminal();
    terminal.options.fontSize = settings.fontSize;
    terminal.options.fontFamily = settings.fontFamily;
    terminal.options.lineHeight = settings.lineHeight;
    terminal.options.cursorStyle = settings.cursorStyle;
    terminal.options.cursorBlink = settings.cursorBlink;
    terminal.options.theme = themeColors;

    this.renderer.resize();
    if (this.ptyProcess) {
      const { cols, rows } = this.renderer.resize();
      this.ptyProcess.resize(cols, rows);
    }
  }

  /** Obsidian leaf state persistence — save */
  getState(): Record<string, unknown> {
    return {};
  }

  /** Obsidian leaf state persistence — restore */
  async setState(_state: Record<string, unknown>, _result: any): Promise<void> {
    // No state to restore
  }

  private resizeTerminal(): void {
    if (this.renderer && this.ptyProcess) {
      const { cols, rows } = this.renderer.resize();
      this.ptyProcess.resize(cols, rows);
    }
  }

  private detectShellType(shellPath: string): ShellType {
    const lower = shellPath.toLowerCase();
    if (lower.includes("powershell") || lower.includes("pwsh")) return "powershell";
    if (lower.includes("cmd")) return "cmd";
    return "posix";
  }
}
