import type { PtySpawnOptions } from "../types";
import { SHUTDOWN_TIMEOUT_MS } from "../constants";

/** Callback types for PTY events */
export type DataCallback = (data: string) => void;
export type ExitCallback = (exitCode: number, signal?: number) => void;

/** Wrapper around a single PTY process */
export class PtyProcess {
  private dataCallbacks: DataCallback[] = [];
  private exitCallbacks: ExitCallback[] = [];
  private exited = false;
  private ptyInstance: any;
  private disposables: { dispose: () => void }[] = [];

  constructor(ptyInstance: any) {
    this.ptyInstance = ptyInstance;

    const dataDisposable = ptyInstance.onData((data: string) => {
      for (const cb of this.dataCallbacks) {
        cb(data);
      }
    });
    if (dataDisposable) this.disposables.push(dataDisposable);

    const exitDisposable = ptyInstance.onExit(
      ({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        this.exited = true;
        for (const cb of this.exitCallbacks) {
          cb(exitCode, signal);
        }
      }
    );
    if (exitDisposable) this.disposables.push(exitDisposable);
  }

  /** Register a callback for data output */
  onData(cb: DataCallback): { dispose: () => void } {
    this.dataCallbacks.push(cb);
    return {
      dispose: () => {
        const idx = this.dataCallbacks.indexOf(cb);
        if (idx >= 0) this.dataCallbacks.splice(idx, 1);
      },
    };
  }

  /** Register a callback for process exit */
  onExit(cb: ExitCallback): { dispose: () => void } {
    this.exitCallbacks.push(cb);
    return {
      dispose: () => {
        const idx = this.exitCallbacks.indexOf(cb);
        if (idx >= 0) this.exitCallbacks.splice(idx, 1);
      },
    };
  }

  /** Resize the terminal */
  resize(cols: number, rows: number): void {
    this.ptyInstance.resize(cols, rows);
  }

  /** Write data to the PTY */
  write(data: string): void {
    this.ptyInstance.write(data);
  }

  /** Gracefully destroy the PTY process */
  async destroy(): Promise<void> {
    if (this.exited) {
      this.dispose();
      return;
    }

    // Send SIGTERM first
    this.ptyInstance.kill();

    // Wait for graceful exit or timeout
    const exited = await new Promise<boolean>((resolve) => {
      if (this.exited) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, SHUTDOWN_TIMEOUT_MS);

      this.onExit(() => {
        clearTimeout(timeout);
        resolve(true);
      });
    });

    // Force kill if still running
    if (!exited) {
      this.ptyInstance.kill("SIGKILL");
    }

    this.dispose();
  }

  /** Clean up all resources */
  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.dataCallbacks = [];
    this.exitCallbacks = [];
  }

  /** Check if the process has exited */
  get hasExited(): boolean {
    return this.exited;
  }
}

/** Manages PTY process creation */
export class PtyManager {
  constructor(private ptyModule: any) {}

  /** Spawn a new PTY process with the given options */
  spawn(options: PtySpawnOptions): PtyProcess {
    // Electron renderer may have a minimal PATH; ensure common paths are included
    const home = process.env.HOME || "";
    const defaultPath = [
      "/opt/homebrew/bin",
      "/opt/homebrew/sbin",
      home ? `${home}/.cargo/bin` : "",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
    ].filter(Boolean).join(":");
    const currentPath = process.env.PATH || "";
    const env: Record<string, string> = {
      ...process.env,
      ...options.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      PATH: currentPath ? `${currentPath}:${defaultPath}` : defaultPath,
    };

    // Use absolute shell path to avoid posix_spawnp resolution failures
    const shell = options.shell.startsWith("/")
      ? options.shell
      : `/bin/${options.shell}`;

    const ptyInstance = this.ptyModule.spawn(shell, options.args, {
      cwd: options.cwd,
      cols: options.cols,
      rows: options.rows,
      env,
    });

    return new PtyProcess(ptyInstance);
  }
}
