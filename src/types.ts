/** Session lifecycle states */
export enum SessionState {
  Created = "created",
  Initializing = "initializing",
  Running = "running",
  ShuttingDown = "shutting_down",
  Destroyed = "destroyed",
}

/** Terminal appearance settings */
export interface TerminalSettings {
  defaultShell: string;
  defaultCwd: string;
  autoShow: boolean;
  scrollbackBuffer: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  theme: "obsidian" | "dark" | "light" | "custom";
  webglRenderer: boolean;
  shiftEnterSequence: string;
  passthroughKeybindings: PassthroughKeybinding[];
  debugLog: boolean;
  consentGiven: boolean;
  customThemeColors: CustomThemeColors;
  screenReaderMode: boolean;
  panelHeight: number;
}

/** Electron bridge result for loading native modules */
export interface ElectronBridgeResult {
  pty: IPtyModule | null;
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

/** Keybinding definition for keys that should be passed through to Obsidian */
export interface PassthroughKeybinding {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

/** Custom theme color overrides */
export interface CustomThemeColors {
  background?: string;
  foreground?: string;
  cursor?: string;
  selectionBackground?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
}

/** Interface for a single node-pty process instance */
export interface IPtyInstance {
  onData(cb: (data: string) => void): { dispose: () => void } | void;
  onExit(cb: (info: { exitCode: number; signal?: number }) => void): { dispose: () => void } | void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
}

/** Interface for the node-pty module */
export interface IPtyModule {
  spawn(
    shell: string,
    args: string[],
    options: { cwd: string; cols: number; rows: number; env: Record<string, string> },
  ): IPtyInstance;
}

/** Session info exposed to UI */
export interface SessionInfo {
  id: string;
  state: SessionState;
}
