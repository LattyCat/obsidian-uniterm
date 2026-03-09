import { Terminal, IDisposable } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Unicode11Addon } from "@xterm/addon-unicode11";

export interface TerminalRendererOptions {
  fontSize: number;
  fontFamily: string;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  scrollback: number;
  lineHeight: number;
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
  private disposables: IDisposable[] = [];

  constructor(options: TerminalRendererOptions) {
    this.fitAddon = new FitAddon();
    this.webLinksAddon = new WebLinksAddon();
    this.unicode11Addon = new Unicode11Addon();

    this.terminal = new Terminal({
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      cursorStyle: options.cursorStyle,
      cursorBlink: options.cursorBlink,
      scrollback: options.scrollback,
      lineHeight: options.lineHeight,
    });

    this.loadAddons();
  }

  /** Load all addons into the terminal */
  private loadAddons(): void {
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.webLinksAddon);
    this.terminal.loadAddon(this.unicode11Addon);
  }

  /** Mount the terminal into a DOM container */
  mount(container: HTMLElement): void {
    this.terminal.open(container);
    this.fitAddon.fit();
  }

  /** Connect the terminal to a PTY-like data source */
  connectPty(pty: PtyLike): void {
    // PTY -> Terminal
    const ptyDisposable = pty.onData((data: string) => {
      this.terminal.write(data);
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

  /** Dispose of the terminal and all addons */
  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.fitAddon.dispose();
    this.webLinksAddon.dispose();
    this.unicode11Addon.dispose();
    this.terminal.dispose();
  }

  /** Get the underlying xterm Terminal instance */
  getTerminal(): Terminal {
    return this.terminal;
  }
}
