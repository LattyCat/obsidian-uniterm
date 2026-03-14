export type ShellType = "posix" | "powershell" | "cmd";

export interface DragDropHandlerOptions {
  container: HTMLElement;
  vaultPath: string;
  getShellType: () => ShellType;
  writeToPty: (data: string) => void;
}

/** Escape a file path for a POSIX shell (bash/zsh/fish) */
export function escapePosixPath(path: string): string {
  const escaped = path.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

/** Escape a file path for PowerShell */
export function escapePowerShellPath(path: string): string {
  const escaped = path.replace(/"/g, '`"');
  return `"${escaped}"`;
}

/** Escape a file path for cmd.exe */
export function escapeCmdPath(path: string): string {
  return `"${path}"`;
}

/** Extract vault-relative file path from an obsidian:// URI, or return null */
export function extractPathFromObsidianUri(uri: string): string | null {
  if (!uri.startsWith("obsidian://")) return null;
  try {
    const url = new URL(uri);
    const file = url.searchParams.get("file");
    return file || null;
  } catch {
    return null;
  }
}

/** Escape a path based on shell type */
export function escapePathForShell(path: string, shellType: ShellType): string {
  switch (shellType) {
    case "posix":
      return escapePosixPath(path);
    case "powershell":
      return escapePowerShellPath(path);
    case "cmd":
      return escapeCmdPath(path);
  }
}

/** Resolve a vault-relative path to absolute */
export function resolveVaultPath(relativePath: string, vaultPath: string): string {
  const base = vaultPath.endsWith("/") ? vaultPath.slice(0, -1) : vaultPath;
  return `${base}/${relativePath}`;
}

export class DragDropHandler {
  private container: HTMLElement;
  private vaultPath: string;
  private getShellType: () => ShellType;
  private writeToPty: (data: string) => void;

  private handleDragOver: (e: Event) => void;
  private handleDragLeave: (e: Event) => void;
  private handleDrop: (e: Event) => void;

  constructor(options: DragDropHandlerOptions) {
    this.container = options.container;
    this.vaultPath = options.vaultPath;
    this.getShellType = options.getShellType;
    this.writeToPty = options.writeToPty;

    this.handleDragOver = (e: Event) => {
      e.preventDefault();
      this.container.classList.add("terminal-drag-over");
    };

    this.handleDragLeave = (_e: Event) => {
      this.container.classList.remove("terminal-drag-over");
    };

    this.handleDrop = (e: Event) => {
      e.preventDefault();
      this.container.classList.remove("terminal-drag-over");

      const dragEvent = e as DragEvent;
      const rawData = dragEvent.dataTransfer?.getData("text/plain");
      if (!rawData) return;

      let relativePath: string;
      const obsidianPath = extractPathFromObsidianUri(rawData);
      if (obsidianPath !== null) {
        // Add .md extension if the path has no extension
        relativePath = obsidianPath.includes(".") ? obsidianPath : obsidianPath + ".md";
      } else {
        relativePath = rawData;
      }

      const absolutePath = resolveVaultPath(relativePath, this.vaultPath);
      const escaped = escapePathForShell(absolutePath, this.getShellType());
      this.writeToPty(escaped + " ");
    };

    this.container.addEventListener("dragover", this.handleDragOver);
    this.container.addEventListener("dragleave", this.handleDragLeave);
    this.container.addEventListener("drop", this.handleDrop);
  }

  dispose(): void {
    this.container.removeEventListener("dragover", this.handleDragOver);
    this.container.removeEventListener("dragleave", this.handleDragLeave);
    this.container.removeEventListener("drop", this.handleDrop);
  }
}
