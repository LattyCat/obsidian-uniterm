import { Terminal, IDisposable } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebglAddon } from "@xterm/addon-webgl";
import { SearchAddon } from "@xterm/addon-search";
import { FlowController } from "./flow-controller";

export interface TerminalRendererOptions {
  fontSize: number;
  fontFamily: string;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  scrollback: number;
  lineHeight: number;
  webglEnabled?: boolean;
  onWebGLFallback?: () => void;
}

export interface PtyLike {
  onData: (cb: (data: string) => void) => IDisposable;
  write: (data: string) => void;
}

export class TerminalRenderer {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private webLinksAddon: WebLinksAddon;
  private unicode11Addon: Unicode11Addon;
  private searchAddon: SearchAddon;
  private webglAddon: WebglAddon | null = null;
  private flowController: FlowController;
  private disposables: IDisposable[] = [];
  private webglEnabled: boolean;
  private onWebGLFallback?: () => void;

  constructor(options: TerminalRendererOptions) {
    this.webglEnabled = options.webglEnabled ?? true;
    this.onWebGLFallback = options.onWebGLFallback;

    this.fitAddon = new FitAddon();
    this.webLinksAddon = new WebLinksAddon();
    this.unicode11Addon = new Unicode11Addon();
    this.searchAddon = new SearchAddon();

    this.terminal = new Terminal({
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      cursorStyle: options.cursorStyle,
      cursorBlink: options.cursorBlink,
      scrollback: options.scrollback,
      lineHeight: options.lineHeight,
    });

    this.flowController = new FlowController({
      write: (data: string, callback?: () => void) => {
        this.terminal.write(data, callback);
      },
    });

    this.loadAddons();
  }

  /** Load all addons into the terminal */
  private loadAddons(): void {
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.webLinksAddon);
    this.terminal.loadAddon(this.unicode11Addon);
    this.terminal.loadAddon(this.searchAddon);
  }

  /** Try to load the WebGL renderer addon */
  private tryLoadWebGL(): void {
    if (!this.webglEnabled) return;

    try {
      const addon = new WebglAddon();
      this.terminal.loadAddon(addon);
      this.webglAddon = addon;

      const contextLossDisposable = addon.onContextLoss(() => {
        addon.dispose();
        this.webglAddon = null;
        this.onWebGLFallback?.();
      });
      this.disposables.push(contextLossDisposable);
    } catch {
      this.onWebGLFallback?.();
    }
  }

  /** Mount the terminal into a DOM container */
  mount(container: HTMLElement): void {
    this.terminal.open(container);
    this.fitAddon.fit();
    this.tryLoadWebGL();
  }

  /** Connect the terminal to a PTY-like data source */
  connectPty(pty: PtyLike): void {
    // PTY -> Terminal (through flow controller for backpressure)
    const ptyDisposable = pty.onData((data: string) => {
      this.flowController.enqueue(data);
    });
    this.disposables.push(ptyDisposable);

    // Terminal -> PTY
    const termDisposable = this.terminal.onData((data: string) => {
      pty.write(data);
    });
    this.disposables.push(termDisposable);
  }

  /** Resize the terminal to fit its container */
  resize(): { cols: number; rows: number } {
    this.fitAddon.fit();
    return { cols: this.terminal.cols, rows: this.terminal.rows };
  }

  /** Search forward for a term */
  findNext(term: string): boolean {
    return this.searchAddon.findNext(term);
  }

  /** Search backward for a term */
  findPrevious(term: string): boolean {
    return this.searchAddon.findPrevious(term);
  }

  /** Clear search decorations */
  clearSearch(): void {
    this.searchAddon.clearDecorations();
  }

  /** Clear the terminal content */
  clearTerminal(): void {
    this.terminal.clear();
  }

  /** Get the current selection text */
  getSelection(): string {
    return this.terminal.getSelection();
  }

  /** Check if terminal has a selection */
  hasSelection(): boolean {
    return this.terminal.hasSelection();
  }

  /** Attach a custom key event handler */
  attachCustomKeyEventHandler(
    handler: (event: KeyboardEvent) => boolean
  ): void {
    this.terminal.attachCustomKeyEventHandler(handler);
  }

  /** Dispose of the terminal and all addons */
  dispose(): void {
    this.flowController.flush();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.webglAddon?.dispose();
    this.fitAddon.dispose();
    this.webLinksAddon.dispose();
    this.unicode11Addon.dispose();
    this.searchAddon.dispose();
    this.terminal.dispose();
  }

  /** Get the underlying xterm Terminal instance */
  getTerminal(): Terminal {
    return this.terminal;
  }
}
