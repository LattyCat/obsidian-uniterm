import * as path from "path";

/**
 * Detects the default shell based on the OS platform.
 * Windows: "powershell.exe"
 * macOS/Linux: process.env.SHELL or "/bin/bash" as fallback
 */
export function detectDefaultShell(platform?: string): string {
  const os = platform ?? process.platform;

  if (os === "win32") {
    return "powershell.exe";
  }

  return process.env.SHELL || "/bin/bash";
}

/**
 * Extracts the shell name (basename) from a full shell path.
 * e.g., "/bin/zsh" -> "zsh"
 */
export function getShellName(shellPath: string): string {
  return path.basename(shellPath);
}
