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
  autoShow: boolean;
  scrollbackBuffer: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  theme: "obsidian" | "dark" | "light" | "custom";
  webglRenderer: boolean;
  shellProfiles: ShellProfile[];
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

/** Session info exposed to UI */
export interface SessionInfo {
  id: string;
  state: SessionState;
  profile: ShellProfile;
}
