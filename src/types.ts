/** Session lifecycle states */
export enum SessionState {
  Created = "created",
  Initializing = "initializing",
  Running = "running",
  ShuttingDown = "shutting_down",
  Destroyed = "destroyed",
}

/** Shell profile configuration */
export interface ShellProfile {
  id: string;
  name: string;
  shellPath: string;
  shellArgs: string[];
  cwd: string;
  icon: string;
}

/** Terminal appearance settings */
export interface TerminalSettings {
  defaultShell: string;
  defaultCwd: string;
  maxTabs: number;
  autoShow: boolean;
  confirmCodeblockExecution: boolean;
  scrollbackBuffer: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  theme: "obsidian" | "dark" | "light" | "custom";
  webglRenderer: boolean;
  shellProfiles: ShellProfile[];
  debugLog: boolean;
}

/** Electron bridge result for loading native modules */
export interface ElectronBridgeResult {
  pty: unknown | null;
  error: string | null;
}

/** PTY spawn options */
export interface PtySpawnOptions {
  shell: string;
  args: string[];
  cwd: string;
  cols: number;
  rows: number;
  env: Record<string, string>;
}

/** Session info exposed to UI */
export interface SessionInfo {
  id: string;
  state: SessionState;
  profile: ShellProfile;
}
